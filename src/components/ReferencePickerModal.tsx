import { Link2, Quote, X } from 'lucide-react';
import { useState } from 'react';
import { useWordRangeSelection } from '../hooks/useWordRangeSelection';
import type { Conversation, Message, MessageReference } from '../types';
import {
  createBlockReference,
  createConversationReference,
  createQuoteReference,
  getMessageReferencePreview,
} from '../utils/messageReferences';
import {
  getSelectionRangeChunks,
  getSelectedTextFromRanges,
  getTextTokens,
} from '../utils/textSelection';

export type ReferencePickerMode = 'conversation' | 'quote' | 'connection';
type ConnectionKind = 'block' | 'quote';

type ReferencePickerModalProps = {
  mode: ReferencePickerMode;
  activeConversation: Conversation;
  sourceMessage?: Message | null;
  conversations: Conversation[];
  messagesByConversation: Record<string, Message[]>;
  onAddReferences: (references: MessageReference[]) => void;
  onClose: () => void;
};

function getDefaultConversationId(
  mode: ReferencePickerMode,
  activeConversation: Conversation,
  conversations: Conversation[],
) {
  const defaultConversation =
    mode === 'quote'
      ? conversations.find(
          (conversation) => conversation.id !== activeConversation.id,
        )
      : mode === 'connection'
        ? activeConversation
        : conversations[0];

  return defaultConversation?.id ?? null;
}

export function ReferencePickerModal({
  mode,
  activeConversation,
  sourceMessage,
  conversations,
  messagesByConversation,
  onAddReferences,
  onClose,
}: ReferencePickerModalProps) {
  const [referenceConversationId, setReferenceConversationId] = useState<
    string | null
  >(() => getDefaultConversationId(mode, activeConversation, conversations));
  const [referenceMessageId, setReferenceMessageId] = useState<string | null>(
    null,
  );
  const [connectionKind, setConnectionKind] = useState<ConnectionKind>('block');
  const {
    selectionRanges,
    clearSelection,
    isSelected,
    handleWordPointerDown,
    handlePointerMove,
    endDragSelection,
    handleWordClick,
  } = useWordRangeSelection({
    wordSelector: '[data-reference-word="true"]',
    captureSelector: '.reference-word-picker',
  });

  const referenceConversation =
    conversations.find(
      (conversation) => conversation.id === referenceConversationId,
    ) ?? null;
  const referenceMessages = referenceConversationId
    ? (messagesByConversation[referenceConversationId] ?? [])
    : [];
  const referenceMessage =
    referenceMessages.find((message) => message.id === referenceMessageId) ??
    null;
  const isConnectionMode = mode === 'connection';
  const isQuoteMode =
    mode === 'quote' || (isConnectionMode && connectionKind === 'quote');
  const dialogTitle = isConnectionMode
    ? 'Connect block'
    : mode === 'quote'
      ? 'Cite text'
      : 'Add conversation link';
  const selectedQuoteText = referenceMessage
    ? getSelectedTextFromRanges(referenceMessage.text, selectionRanges)
    : '';

  function selectConversation(conversationId: string) {
    setReferenceConversationId(conversationId);
    setReferenceMessageId(null);
    clearSelection();
  }

  function addConversationReference() {
    if (!referenceConversation) return;
    onAddReferences([createConversationReference(referenceConversation)]);
  }

  function addQuoteReferences() {
    if (!referenceConversation || !referenceMessage) return;
    const references = getSelectionRangeChunks(
      referenceMessage.text,
      selectionRanges,
    )
      .map((range) =>
        createQuoteReference(
          referenceConversation,
          referenceMessage,
          range.startOffset,
          range.endOffset,
        ),
      )
      .filter((reference): reference is MessageReference => Boolean(reference));
    if (references.length > 0) onAddReferences(references);
  }

  function addBlockReference() {
    if (!referenceConversation || !referenceMessage) return;
    onAddReferences([
      createBlockReference(referenceConversation, referenceMessage),
    ]);
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="modal reference-picker"
        role="dialog"
        aria-modal="true"
        aria-label={dialogTitle}
      >
        <header className="modal-header">
          <h3>{dialogTitle}</h3>
          <button
            className="icon-button bare"
            type="button"
            title="Close"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>

        {isConnectionMode && sourceMessage && (
          <p className="reference-picker-context">
            From{' '}
            <strong>{getMessageReferencePreview(sourceMessage, 80)}</strong>
          </p>
        )}

        <div className="reference-picker-grid">
          <div className="reference-picker-list">
            {conversations
              .filter(
                (conversation) =>
                  mode !== 'quote' || conversation.id !== activeConversation.id,
              )
              .map((conversation) => (
                <button
                  key={conversation.id}
                  className={`reference-picker-row ${referenceConversationId === conversation.id ? 'active' : ''}`}
                  type="button"
                  onClick={() => selectConversation(conversation.id)}
                >
                  {conversation.title}
                </button>
              ))}
          </div>

          {isConnectionMode && (
            <div
              className="reference-picker-segments"
              role="group"
              aria-label="Connection type"
            >
              <button
                className={connectionKind === 'block' ? 'active' : ''}
                type="button"
                onClick={() => {
                  setConnectionKind('block');
                  clearSelection();
                }}
              >
                Whole block
              </button>
              <button
                className={connectionKind === 'quote' ? 'active' : ''}
                type="button"
                onClick={() => setConnectionKind('quote')}
              >
                Quote
              </button>
            </div>
          )}

          {isQuoteMode ? (
            <div className="reference-picker-detail">
              <div className="reference-picker-message-list">
                {referenceMessages
                  .filter((message) => message.text.trim())
                  .map((message) => (
                    <button
                      key={message.id}
                      className={`reference-picker-row ${referenceMessageId === message.id ? 'active' : ''}`}
                      type="button"
                      onClick={() => {
                        setReferenceMessageId(message.id);
                        clearSelection();
                      }}
                    >
                      {message.text}
                    </button>
                  ))}
              </div>
              {referenceMessage ? (
                <div
                  className="reference-word-picker"
                  aria-label="Source message text"
                  onPointerMove={handlePointerMove}
                  onPointerUp={endDragSelection}
                  onPointerCancel={endDragSelection}
                  onLostPointerCapture={endDragSelection}
                >
                  {getTextTokens(referenceMessage.text).map((token) =>
                    token.isWord ? (
                      <button
                        key={`${token.startOffset}-${token.endOffset}`}
                        className={`word-token ${isSelected(token.startOffset, token.endOffset) ? 'selected' : ''}`}
                        type="button"
                        aria-pressed={isSelected(
                          token.startOffset,
                          token.endOffset,
                        )}
                        data-reference-word="true"
                        data-start-offset={token.startOffset}
                        data-end-offset={token.endOffset}
                        onPointerDown={(event) =>
                          handleWordPointerDown(
                            event,
                            token.startOffset,
                            token.endOffset,
                          )
                        }
                        onClick={(event) =>
                          handleWordClick(
                            token.startOffset,
                            token.endOffset,
                            event.detail,
                          )
                        }
                      >
                        {token.text}
                      </button>
                    ) : (
                      <span key={`${token.startOffset}-${token.endOffset}`}>
                        {token.text}
                      </span>
                    ),
                  )}
                </div>
              ) : (
                <p className="empty-state">Choose a text block.</p>
              )}
              {selectionRanges.length > 0 && (
                <div className="transfer-selection-summary">
                  <span>{selectionRanges.length} selected</span>
                  <button
                    className="text-button"
                    type="button"
                    onClick={clearSelection}
                  >
                    Clear selection
                  </button>
                </div>
              )}
              {selectedQuoteText && (
                <p className="transfer-preview">{selectedQuoteText}</p>
              )}
              <button
                className="primary-button"
                type="button"
                disabled={!referenceMessage || selectionRanges.length === 0}
                onClick={addQuoteReferences}
              >
                <Quote size={16} />
                {isConnectionMode ? 'Connect quote' : 'Insert citation'}
              </button>
            </div>
          ) : isConnectionMode ? (
            <div className="reference-picker-detail">
              <div className="reference-picker-message-list">
                {referenceMessages.map((message) => (
                  <button
                    key={message.id}
                    className={`reference-picker-row ${referenceMessageId === message.id ? 'active' : ''}`}
                    type="button"
                    onClick={() => setReferenceMessageId(message.id)}
                  >
                    {getMessageReferencePreview(message)}
                  </button>
                ))}
              </div>
              <button
                className="primary-button"
                type="button"
                disabled={!referenceConversation || !referenceMessage}
                onClick={addBlockReference}
              >
                <Link2 size={16} />
                Connect block
              </button>
            </div>
          ) : (
            <div className="reference-picker-detail">
              <p>{referenceConversation?.title ?? 'Choose a conversation.'}</p>
              <button
                className="primary-button"
                type="button"
                disabled={!referenceConversation}
                onClick={addConversationReference}
              >
                <Link2 size={16} />
                Insert link
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
