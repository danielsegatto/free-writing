import { describe, expect, it } from 'vitest';
import type { Conversation, Message } from '../types';
import {
  addTag,
  getAvailableTagSuggestions,
  getTaggedMessageResults,
  normalizeTags,
  removeTag,
  toggleTagSelection
} from './tags';

const timestamp = {
  toMillis: () => 1
} as Conversation['createdAt'];

const conversations: Conversation[] = [
  {
    id: 'inbox',
    userId: 'user-1',
    title: 'Inbox',
    createdAt: timestamp,
    updatedAt: timestamp,
    lastMessagePreview: ''
  },
  {
    id: 'archive',
    userId: 'user-1',
    title: 'Archive',
    createdAt: timestamp,
    updatedAt: timestamp,
    lastMessagePreview: ''
  }
];

function message(id: string, conversationId: string, tags: string[]): Message {
  return {
    id,
    userId: 'user-1',
    conversationId,
    text: id,
    searchText: id,
    tags,
    references: [],
    createdAt: timestamp,
    updatedAt: null,
    scheduledAt: null,
    sortOrder: 1000,
    isForwarded: false,
    transferType: null,
    forwardedFromConversationId: null,
    forwardedFromMessageId: null
  };
}

describe('normalizeTags', () => {
  it('trims empty tags and dedupes case-insensitively while preserving first casing', () => {
    expect(normalizeTags(['  Urgent ', '', 'urgent', 'Idea', ' idea  ', 'Flag'])).toEqual(['Urgent', 'Idea', 'Flag']);
  });
});

describe('toggleTagSelection', () => {
  it('adds normalized tags and removes existing tags case-insensitively', () => {
    expect(toggleTagSelection(['Idea'], '  Follow Up ')).toEqual(['Idea', 'Follow Up']);
    expect(toggleTagSelection(['Idea', 'Follow Up'], 'follow up')).toEqual(['Idea']);
  });
});

describe('message tag editing helpers', () => {
  it('adds tags through the same normalization rule used elsewhere', () => {
    expect(addTag(['Idea'], ' idea ')).toEqual(['Idea']);
    expect(addTag(['Idea'], ' Follow Up ')).toEqual(['Idea', 'Follow Up']);
  });

  it('removes tags case-insensitively', () => {
    expect(removeTag(['Idea', 'Follow Up'], 'follow up')).toEqual(['Idea']);
  });

  it('filters suggestions by current tags and draft text', () => {
    expect(
      getAvailableTagSuggestions(
        ['Idea'],
        're',
        [
          { name: 'Idea', count: 3 },
          { name: 'Reference', count: 2 },
          { name: 'Review', count: 1 },
          { name: 'Later', count: 1 }
        ],
        1
      )
    ).toEqual([{ name: 'Reference', count: 2 }]);
  });
});

describe('getTaggedMessageResults', () => {
  it('returns tagged messages with their conversations across loaded message groups', () => {
    const results = getTaggedMessageResults(
      conversations,
      {
        inbox: [message('first', 'inbox', ['Idea']), message('second', 'inbox', ['Later'])],
        archive: [message('third', 'archive', ['idea', 'Reference'])]
      },
      ['IDEA']
    );

    expect(results.map((result) => [result.conversation.title, result.message.id])).toEqual([
      ['Inbox', 'first'],
      ['Archive', 'third']
    ]);
  });

  it('does not show tag results until a tag is selected', () => {
    expect(getTaggedMessageResults(conversations, { inbox: [message('first', 'inbox', ['Idea'])] }, [])).toEqual([]);
  });
});
