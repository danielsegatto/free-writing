import type { Conversation, Message } from '../types';

export type TagSummary = {
  name: string;
  count: number;
};

export type TaggedMessageResult = {
  conversation: Conversation;
  message: Message;
};

export type TagSuggestion = {
  name: string;
  count: number;
};

export function normalizeTags(tags: readonly string[] = []) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  tags.forEach((tag) => {
    const cleanTag = tag.trim();
    if (!cleanTag) return;

    const key = cleanTag.toLocaleLowerCase();
    if (seen.has(key)) return;

    seen.add(key);
    normalized.push(cleanTag);
  });

  return normalized;
}

export function getTagKey(tag: string) {
  return tag.trim().toLocaleLowerCase();
}

export function messageMatchesAnyTag(message: Message, selectedTags: readonly string[]) {
  if (selectedTags.length === 0) return true;
  const messageTagKeys = new Set((message.tags ?? []).map(getTagKey));
  return selectedTags.some((tag) => messageTagKeys.has(getTagKey(tag)));
}

export function toggleTagSelection(selectedTags: readonly string[], tag: string) {
  const key = getTagKey(tag);
  return selectedTags.some((currentTag) => getTagKey(currentTag) === key)
    ? selectedTags.filter((currentTag) => getTagKey(currentTag) !== key)
    : normalizeTags([...selectedTags, tag]);
}

export function addTag(tags: readonly string[], tag: string) {
  return normalizeTags([...tags, tag]);
}

export function removeTag(tags: readonly string[], tagToRemove: string) {
  const removeKey = getTagKey(tagToRemove);
  return tags.filter((tag) => getTagKey(tag) !== removeKey);
}

export function getAvailableTagSuggestions(
  currentTags: readonly string[],
  draft: string,
  suggestions: readonly TagSuggestion[],
  limit = 8
) {
  const currentTagKeys = new Set(currentTags.map(getTagKey));
  const draftKey = getTagKey(draft);

  return suggestions
    .filter((tag) => {
      const suggestionKey = getTagKey(tag.name);
      return !currentTagKeys.has(suggestionKey) && (!draftKey || suggestionKey.includes(draftKey));
    })
    .slice(0, limit);
}

export function getTaggedMessageResults(
  conversations: readonly Conversation[],
  messagesByConversation: Record<string, Message[]>,
  selectedTags: readonly string[]
): TaggedMessageResult[] {
  if (selectedTags.length === 0) return [];

  return conversations.flatMap((conversation) =>
    (messagesByConversation[conversation.id] ?? [])
      .filter((message) => messageMatchesAnyTag(message, selectedTags))
      .map((message) => ({ conversation, message }))
  );
}

export function getTagSummaries(messages: readonly Message[]): TagSummary[] {
  const tagCounts = new Map<string, { name: string; count: number }>();

  messages.forEach((message) => {
    normalizeTags(message.tags ?? []).forEach((tag) => {
      const key = getTagKey(tag);
      const current = tagCounts.get(key);
      tagCounts.set(key, {
        name: current?.name ?? tag,
        count: (current?.count ?? 0) + 1
      });
    });
  });

  return Array.from(tagCounts.values()).sort(
    (first, second) => first.name.localeCompare(second.name, undefined, { sensitivity: 'base' })
  );
}
