import { Fragment, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { Conversation, Message } from '../types';
import { parseInlineConversationLinks } from '../utils/inlineConversationLinks';
import type { MessageReferenceNavigationTarget } from '../utils/messageReferences';

const LARGE_TEXT_CHARACTER_LIMIT = 280;
const LARGE_TEXT_LINE_LIMIT = 3;
const COLLAPSED_TEXT_CHARACTER_LIMIT = 210;

type MessageTextProps = {
  message: Message;
  activeReferenceTarget: MessageReferenceNavigationTarget | null;
  conversations: Conversation[];
  onNavigateToConversation: (conversationId: string) => void;
};

function isMessageTarget(message: Message, target: MessageReferenceNavigationTarget | null) {
  return target?.messageId === message.id && target.conversationId === message.conversationId;
}

function isLargeText(text: string) {
  return text.length > LARGE_TEXT_CHARACTER_LIMIT || text.split('\n').length > LARGE_TEXT_LINE_LIMIT;
}

function createCollapsedText(text: string) {
  const linePreview = text.split('\n').slice(0, LARGE_TEXT_LINE_LIMIT).join('\n');
  const preview = linePreview.length > COLLAPSED_TEXT_CHARACTER_LIMIT
    ? linePreview.slice(0, COLLAPSED_TEXT_CHARACTER_LIMIT).trimEnd()
    : linePreview.trimEnd();

  return `${preview}...`;
}

function renderInlineConversationLinks(
  text: string,
  conversations: Conversation[],
  onNavigateToConversation: (conversationId: string) => void
) {
  return parseInlineConversationLinks(text, conversations).map((segment, index) => {
    if (segment.type === 'text') return <Fragment key={`text-${index}`}>{segment.text}</Fragment>;

    return (
      <button
        key={`${segment.conversationId}-${index}`}
        className="inline-conversation-link"
        type="button"
        title={`Open ${segment.title}`}
        onClick={() => onNavigateToConversation(segment.conversationId)}
      >
        {segment.title}
      </button>
    );
  });
}

export function MessageText({ message, activeReferenceTarget, conversations, onNavigateToConversation }: MessageTextProps) {
  const isReferenceTarget = isMessageTarget(message, activeReferenceTarget);
  const range = isReferenceTarget ? activeReferenceTarget?.range : null;
  const shouldTruncate = useMemo(() => isLargeText(message.text), [message.text]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setIsExpanded(false);
  }, [message.id, message.text]);

  useEffect(() => {
    if (isReferenceTarget) setIsExpanded(true);
  }, [isReferenceTarget]);

  if (!message.text) return null;

  const displayedText = shouldTruncate && !isExpanded ? createCollapsedText(message.text) : message.text;

  function renderTextContent() {
    if (shouldTruncate && !isExpanded) {
      return renderInlineConversationLinks(displayedText, conversations, onNavigateToConversation);
    }

    if (!range || range.endOffset <= range.startOffset) {
      return renderInlineConversationLinks(displayedText, conversations, onNavigateToConversation);
    }

    const start = Math.max(0, Math.min(range.startOffset, displayedText.length));
    const end = Math.max(start, Math.min(range.endOffset, displayedText.length));

    return (
      <>
        {renderInlineConversationLinks(displayedText.slice(0, start), conversations, onNavigateToConversation)}
        <mark className="reference-highlight">
          {renderInlineConversationLinks(displayedText.slice(start, end), conversations, onNavigateToConversation)}
        </mark>
        {renderInlineConversationLinks(displayedText.slice(end), conversations, onNavigateToConversation)}
      </>
    );
  }

  if (!shouldTruncate) {
    return <p>{renderTextContent()}</p>;
  }

  return (
    <div className="message-text-block">
      <p>{renderTextContent()}</p>
      <button
        className="message-expand-button"
        type="button"
        title={isExpanded ? 'Collapse text block' : 'Expand text block'}
        aria-label={isExpanded ? 'Collapse text block' : 'Expand text block'}
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((current) => !current)}
      >
        {isExpanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
      </button>
    </div>
  );
}
