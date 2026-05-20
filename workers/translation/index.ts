const groqEndpoint = 'https://api.groq.com/openai/v1/chat/completions';

const defaultAllowedOrigins = [
  'https://free-writing-e29a1.web.app',
  'https://free-writing-e29a1.firebaseapp.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

export type WorkerEnv = {
  GROQ_API_KEY?: string;
  FIREBASE_API_KEY?: string;
  ALLOWED_ORIGINS?: string;
};

type EnglishSegment = {
  original: string;
  options: [string, string, string];
};

type EnglishConversion = {
  segments: EnglishSegment[];
};

type ConversationIndexBlock = {
  id: string;
  position: number;
  text: string;
};

type ConversationIndexEntry = {
  id: string;
  sourceMessageId: string;
  title: string;
  summary: string;
};

type ConversationIndexResponse = {
  entries: ConversationIndexEntry[];
};

function getAllowedOrigins(env: WorkerEnv) {
  const configuredOrigins = env.ALLOWED_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return configuredOrigins?.length ? configuredOrigins : defaultAllowedOrigins;
}

function getCorsOrigin(request: Request, env: WorkerEnv) {
  const origin = request.headers.get('Origin');
  const allowedOrigins = getAllowedOrigins(env);

  if (allowedOrigins.includes('*')) return origin ?? '*';
  if (!origin) return allowedOrigins[0];
  return allowedOrigins.includes(origin) ? origin : null;
}

function jsonResponse(request: Request, env: WorkerEnv, status: number, body: unknown) {
  const corsOrigin = getCorsOrigin(request, env);
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Vary': 'Origin'
  });

  if (corsOrigin) {
    headers.set('Access-Control-Allow-Origin', corsOrigin);
    headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  }

  return new Response(JSON.stringify(body), { status, headers });
}

function optionsResponse(request: Request, env: WorkerEnv) {
  const corsOrigin = getCorsOrigin(request, env);
  if (!corsOrigin) {
    return new Response(null, { status: 403, headers: { Vary: 'Origin' } });
  }

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    }
  });
}

function getBearerToken(authorizationHeader: string | null) {
  const match = authorizationHeader?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function isEnglishSegment(value: unknown): value is EnglishSegment {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { original?: unknown; options?: unknown };
  return (
    typeof candidate.original === 'string' &&
    candidate.original.trim().length > 0 &&
    Array.isArray(candidate.options) &&
    candidate.options.length === 3 &&
    candidate.options.every((option) => typeof option === 'string' && option.trim().length > 0)
  );
}

function isConversationIndexEntry(value: unknown): value is ConversationIndexEntry {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { sourceMessageId?: unknown; title?: unknown; summary?: unknown };
  return (
    typeof candidate.sourceMessageId === 'string' &&
    typeof candidate.title === 'string' &&
    candidate.title.trim().length > 0 &&
    typeof candidate.summary === 'string' &&
    candidate.summary.trim().length > 0
  );
}

function parseEnglishConversion(content: string): EnglishConversion {
  const parsed = JSON.parse(content) as unknown;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Groq returned a non-object response.');
  }

  const segments = (parsed as { segments?: unknown }).segments;
  if (!Array.isArray(segments) || segments.length === 0 || !segments.every(isEnglishSegment)) {
    throw new Error('Groq returned no usable English segments.');
  }

  return {
    segments: segments.map((segment) => ({
      original: segment.original.trim(),
      options: segment.options.map((option) => option.trim()) as [string, string, string]
    }))
  };
}

function parseConversationIndex(content: string, blocks: ConversationIndexBlock[]): ConversationIndexResponse {
  const parsed = JSON.parse(content) as unknown;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Groq returned a non-object response.');
  }

  const entries = (parsed as { entries?: unknown }).entries;
  if (!Array.isArray(entries) || entries.length !== blocks.length || !entries.every(isConversationIndexEntry)) {
    throw new Error('Groq returned no usable conversation index.');
  }

  const expectedIds = new Set(blocks.map((block) => block.id));
  const seenIds = new Set<string>();
  const entriesByMessageId = new Map<string, ConversationIndexEntry>();

  entries.forEach((entry) => {
    const sourceMessageId = entry.sourceMessageId.trim();
    if (!expectedIds.has(sourceMessageId) || seenIds.has(sourceMessageId)) {
      throw new Error('Groq returned no usable conversation index.');
    }
    seenIds.add(sourceMessageId);
    entriesByMessageId.set(sourceMessageId, {
      id: crypto.randomUUID(),
      sourceMessageId,
      title: entry.title.trim(),
      summary: entry.summary.trim()
    });
  });

  if (seenIds.size !== expectedIds.size) {
    throw new Error('Groq returned no usable conversation index.');
  }

  return {
    entries: blocks.map((block) => entriesByMessageId.get(block.id) as ConversationIndexEntry)
  };
}

function buildEnglishPrompt(text: string) {
  return `
You are a translation editor. Convert the provided text to English.

Task:
1. Divide the text into sentence-level segments. Prefer one segment per complete sentence or short standalone line.
2. Do not merge separate sentences into one segment.
3. Split a very long or compound sentence when it contains multiple ideas.
4. Preserve the original order and meaning across all segments.
5. For each segment, provide exactly three distinct, natural English versions.

Return ONLY valid JSON with this exact structure:
{
  "segments": [
    {
      "original": "Original segment",
      "options": ["First English version", "Second English version", "Third English version"]
    }
  ]
}

Text to process:
${text}
`.trim();
}

function buildConversationIndexPrompt(conversationTitle: string, blocks: ConversationIndexBlock[]) {
  return `
You are a conversation cartographer. Create a clickable index for the whole conversation.

Conversation title: ${conversationTitle || 'Untitled conversation'}

Task:
1. First consider the full surrounding context and the progression across all blocks.
2. Then write exactly one index entry for every provided block ID.
3. Do not summarize each block in isolation. Each entry should describe the block's role in the conversation map using nearby and overall context.
4. Preserve the provided block IDs exactly in sourceMessageId.
5. Do not skip, merge, invent, or duplicate entries.
6. Keep titles concise and summaries useful for navigating back to the source block.

Return ONLY valid JSON with this exact structure:
{
  "entries": [
    {
      "sourceMessageId": "source block id",
      "title": "Short index title",
      "summary": "Context-aware navigation summary"
    }
  ]
}

Blocks to index:
${JSON.stringify(blocks, null, 2)}
`.trim();
}

async function verifyFirebaseToken(firebaseApiKey: string, token: string) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseApiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: token })
  });

  if (!response.ok) return false;

  const body = await response.json() as { users?: unknown };
  return Array.isArray(body.users) && body.users.length > 0;
}

async function readRequestText(request: Request) {
  const body = await request.json() as unknown;
  return body && typeof body === 'object' && typeof (body as { text?: unknown }).text === 'string'
    ? (body as { text: string }).text.trim()
    : '';
}

async function readSynthesisRequest(request: Request) {
  const body = await request.json() as unknown;
  const conversationTitle = body && typeof body === 'object' && typeof (body as { conversationTitle?: unknown }).conversationTitle === 'string'
    ? (body as { conversationTitle: string }).conversationTitle.trim()
    : '';
  const blocks = body && typeof body === 'object' && Array.isArray((body as { blocks?: unknown }).blocks)
    ? (body as { blocks: unknown[] }).blocks
    : [];

  return {
    conversationTitle,
    blocks: blocks.flatMap((block): ConversationIndexBlock[] => {
      if (!block || typeof block !== 'object') return [];
      const candidate = block as { id?: unknown; position?: unknown; text?: unknown };
      if (
        typeof candidate.id !== 'string' ||
        candidate.id.trim().length === 0 ||
        typeof candidate.position !== 'number' ||
        !Number.isFinite(candidate.position) ||
        typeof candidate.text !== 'string'
      ) {
        return [];
      }

      return [{
        id: candidate.id.trim(),
        position: candidate.position,
        text: candidate.text.trim() || '[Empty block]'
      }];
    })
  };
}

async function handleTranslation(request: Request, env: WorkerEnv) {
  if (!getCorsOrigin(request, env)) {
    return jsonResponse(request, env, 403, { error: 'This origin is not allowed to use English conversion.' });
  }

  if (!env.FIREBASE_API_KEY || !env.GROQ_API_KEY) {
    return jsonResponse(request, env, 500, { error: 'The English conversion service is not configured.' });
  }

  const token = getBearerToken(request.headers.get('Authorization'));
  if (!token) {
    return jsonResponse(request, env, 401, { error: 'Sign in before converting text to English.' });
  }

  if (!await verifyFirebaseToken(env.FIREBASE_API_KEY, token)) {
    return jsonResponse(request, env, 401, { error: 'Sign in again before converting text to English.' });
  }

  let text = '';
  try {
    text = await readRequestText(request);
  } catch {
    return jsonResponse(request, env, 400, { error: 'Text is required.' });
  }

  if (!text) {
    return jsonResponse(request, env, 400, { error: 'Text is required.' });
  }

  try {
    const groqResponse = await fetch(groqEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [{ role: 'user', content: buildEnglishPrompt(text) }],
        temperature: 1,
        max_completion_tokens: 4096,
        top_p: 1,
        reasoning_effort: 'medium',
        stream: false,
        response_format: { type: 'json_object' }
      })
    });

    const groqBody = await groqResponse.json() as {
      error?: { message?: string };
      choices?: Array<{ message?: { content?: string } }>;
    };

    if (!groqResponse.ok) {
      return jsonResponse(request, env, 502, { error: groqBody.error?.message ?? 'Unable to convert this text to English.' });
    }

    const content = groqBody.choices?.[0]?.message?.content;
    if (!content) {
      return jsonResponse(request, env, 502, { error: 'The English conversion service returned no content.' });
    }

    return jsonResponse(request, env, 200, parseEnglishConversion(content));
  } catch {
    return jsonResponse(request, env, 502, { error: 'Unable to convert this text to English.' });
  }
}

async function handleSynthesis(request: Request, env: WorkerEnv) {
  if (!getCorsOrigin(request, env)) {
    return jsonResponse(request, env, 403, { error: 'This origin is not allowed to synthesize conversation indexes.' });
  }

  if (!env.FIREBASE_API_KEY || !env.GROQ_API_KEY) {
    return jsonResponse(request, env, 500, { error: 'The conversation index service is not configured.' });
  }

  const token = getBearerToken(request.headers.get('Authorization'));
  if (!token) {
    return jsonResponse(request, env, 401, { error: 'Sign in before synthesizing a conversation index.' });
  }

  if (!await verifyFirebaseToken(env.FIREBASE_API_KEY, token)) {
    return jsonResponse(request, env, 401, { error: 'Sign in again before synthesizing a conversation index.' });
  }

  let synthesisRequest: Awaited<ReturnType<typeof readSynthesisRequest>>;
  try {
    synthesisRequest = await readSynthesisRequest(request);
  } catch {
    return jsonResponse(request, env, 400, { error: 'Conversation blocks are required.' });
  }

  if (synthesisRequest.blocks.length === 0) {
    return jsonResponse(request, env, 400, { error: 'Conversation blocks are required.' });
  }

  try {
    const groqResponse = await fetch(groqEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [{
          role: 'user',
          content: buildConversationIndexPrompt(synthesisRequest.conversationTitle, synthesisRequest.blocks)
        }],
        temperature: 0.7,
        max_completion_tokens: 4096,
        top_p: 1,
        reasoning_effort: 'medium',
        stream: false,
        response_format: { type: 'json_object' }
      })
    });

    const groqBody = await groqResponse.json() as {
      error?: { message?: string };
      choices?: Array<{ message?: { content?: string } }>;
    };

    if (!groqResponse.ok) {
      return jsonResponse(request, env, 502, { error: groqBody.error?.message ?? 'Unable to synthesize a conversation index.' });
    }

    const content = groqBody.choices?.[0]?.message?.content;
    if (!content) {
      return jsonResponse(request, env, 502, { error: 'The conversation index service returned no content.' });
    }

    return jsonResponse(request, env, 200, parseConversationIndex(content, synthesisRequest.blocks));
  } catch {
    return jsonResponse(request, env, 502, { error: 'Unable to synthesize a conversation index.' });
  }
}

export default {
  async fetch(request: Request, env: WorkerEnv) {
    const { pathname } = new URL(request.url);
    const validPath = pathname === '/' || pathname === '/api/to-english' || pathname === '/api/synthesize-index';

    if (request.method === 'OPTIONS') {
      return optionsResponse(request, env);
    }

    if (!validPath) {
      return jsonResponse(request, env, 404, { error: 'Not found.' });
    }

    if (request.method !== 'POST') {
      return jsonResponse(request, env, 405, { error: 'Use POST for English conversion.' });
    }

    return pathname === '/api/synthesize-index' ? handleSynthesis(request, env) : handleTranslation(request, env);
  }
};
