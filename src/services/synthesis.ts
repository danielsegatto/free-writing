import { auth } from '../firebase';
import type { ConversationIndexEntry, Message } from '../types';

const defaultSynthesisEndpoint = '/api/synthesize-index';

type ConversationIndexResponse = {
  entries: ConversationIndexEntry[];
};

function createEntryId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getSynthesisEndpoint() {
  if (import.meta.env.VITE_SYNTHESIS_API_URL) return import.meta.env.VITE_SYNTHESIS_API_URL;
  const translationEndpoint = import.meta.env.VITE_TRANSLATION_API_URL;
  if (!translationEndpoint) return defaultSynthesisEndpoint;

  try {
    return new URL('/api/synthesize-index', translationEndpoint).toString();
  } catch {
    return defaultSynthesisEndpoint;
  }
}

function getBlockText(message: Message) {
  const text = message.text.trim();
  if (text) return text;

  const descriptions: string[] = [];
  const attachmentCount = message.attachments?.length ?? 0;
  if (attachmentCount > 0) {
    descriptions.push(`${attachmentCount} image attachment${attachmentCount === 1 ? '' : 's'}`);
  }
  if (message.references.length > 0) {
    descriptions.push(`${message.references.length} reference${message.references.length === 1 ? '' : 's'}`);
  }

  return descriptions.length > 0 ? `[${descriptions.join('; ')}]` : '[Empty block]';
}

function isConversationIndexEntry(value: unknown): value is ConversationIndexEntry {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { id?: unknown; sourceMessageId?: unknown; title?: unknown; summary?: unknown };
  return (
    (candidate.id === undefined || typeof candidate.id === 'string') &&
    typeof candidate.sourceMessageId === 'string' &&
    typeof candidate.title === 'string' &&
    candidate.title.trim().length > 0 &&
    typeof candidate.summary === 'string' &&
    candidate.summary.trim().length > 0
  );
}

function parseConversationIndex(value: unknown, sourceMessageIds: string[]): ConversationIndexResponse {
  if (!value || typeof value !== 'object') {
    throw new Error('The synthesis service returned an invalid response.');
  }

  const entries = (value as { entries?: unknown }).entries;
  if (!Array.isArray(entries) || entries.length !== sourceMessageIds.length || !entries.every(isConversationIndexEntry)) {
    throw new Error('The synthesis service returned no usable conversation index.');
  }

  const expectedIds = new Set(sourceMessageIds);
  const seenIds = new Set<string>();
  const normalizedEntries = entries.map((entry) => {
    const sourceMessageId = entry.sourceMessageId.trim();
    if (!expectedIds.has(sourceMessageId) || seenIds.has(sourceMessageId)) {
      throw new Error('The synthesis service returned no usable conversation index.');
    }
    seenIds.add(sourceMessageId);

    return {
      id: entry.id?.trim() || createEntryId(),
      sourceMessageId,
      title: entry.title.trim(),
      summary: entry.summary.trim()
    };
  });

  return { entries: normalizedEntries };
}

export async function requestConversationIndex(
  messages: Message[],
  conversationTitle: string
): Promise<ConversationIndexResponse> {
  if (messages.length === 0) {
    throw new Error('This conversation has no blocks to index.');
  }

  const token = await auth?.currentUser?.getIdToken();
  if (!token) {
    throw new Error('Sign in again before synthesizing a conversation index.');
  }

  const blocks = messages.map((message, index) => ({
    id: message.id,
    position: index + 1,
    text: getBlockText(message)
  }));

  const response = await fetch(getSynthesisEndpoint(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      conversationTitle,
      blocks
    })
  });

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    if (response.ok) {
      throw new Error('The synthesis service returned unreadable JSON.');
    }
  }

  if (!response.ok) {
    const message = body && typeof body === 'object' && typeof (body as { error?: unknown }).error === 'string'
      ? (body as { error: string }).error
      : 'Unable to synthesize a conversation index.';
    throw new Error(message);
  }

  return parseConversationIndex(body, messages.map((message) => message.id));
}
