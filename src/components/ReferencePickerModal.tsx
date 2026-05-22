import { Link2, Quote, X } from 'lucide-react';
import { useRef, useState, type PointerEvent } from 'react';
import type { Conversation, Message, MessageReference } from '../types';
import {
  createBlockReference,
  createConversationReference,
  createQuoteReference,
  getMessageReferencePreview
} from '../utils/messageReferences';
import { getSelectionRangeChunks, getSelectedTextFromRanges, getTextTokens, type TextSelectionRange } from '../utils/textSelection';
import { isTextRangeSelected, updateTextSelectionRanges } from '../utils/transferSelection';

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
  conversations: Conversation[]
) {
  const defaultConversation =
    mode === 'quote'
      ? conversations.find((conversation) => conversation.id !== activeConversation.id)
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
  onClose
}: ReferencePickerModalProps) {
  const [referenceConversationId, setReferenceConversationId] = useState<string | null>(() =>
    getDefaultConversationId(mode, activeConversation, conversations)
  );
  const [referenceMessageId, setReferenceMessageId] = useState<string | null>(null);
  const [referenceSelectionRanges, setReferenceSelectionRanges] = useState<TextSelectionRange[]>([]);
  const [connectionKind, setConnectionKind] = useState<ConnectionKind>('block');
  const dragSelection = useRef<{
    pointerId: number;
    mode: 'select' | 'unselect';
  } | null>(null);
  const handledPointerClick = useRef(false);

  const referenceConversation =
    conversations.find((conversation) => conversation.id === referenceConversationId) ?? null;
  const referenceMessages = referenceConversationId ? messagesByConversation[referenceConversationId] ?? [] : [];
  const referenceMessage = referenceMessages.find((message) => message.id === referenceMessageId) ?? null;
  const isConnectionMode = mode === 'connection';
  const isQuoteMode = mode === 'quote' || (isConnectionMode && connectionKind === 'quote');
  const dialogTitle = isConnectionMode ? 'Connect block' : mode === 'quote' ? 'Cite text' : 'Add conversation link';
  const selectedQuoteText = referenceMessage ? getSelectedTextFromRanges(referenceMessage.text, referenceSelectionRanges) : '';

  function selectConversation(conversationId: string) {
    setReferenceConversationId(conversationId);
    setReferenceMessageId(null);
    setReferenceSelectionRanges([]);
  }

  function addConversationReference() {
    if (!referenceConversation) return;
    onAddReferences([createConversationReference(referenceConversation)]);
  }

  function addQuoteReferences() {
    if (!referenceConversation || !referenceMessage) return;
    const references = getSelectionRangeChunks(referenceMessage.text, referenceSelectionRanges)
      .map((range) => createQuoteReference(referenceConversation, referenceMessage, range.startOffset, range.endOffset))
      .filter((reference): reference is MessageReference => Boolean(reference));
    if (references.length > 0) onAddReferences(references);
  }

  function addBlockReference() {
    if (!referenceConversation || !referenceMessage) return;
    onAddReferences([createBlockReference(referenceConversation, referenceMessage)]);
  }

  function updateReferenceWordSelection(
    startOffset: number,
    endOffset: number,
    selectionMode: 'toggle' | 'select' | 'unselect'
  ) {
    setReferenceSelectionRanges((currentRanges) =>
      updateTextSelectionRanges(currentRanges, startOffset, endOffset, selectionMode)
    );
  }

  function isReferenceWordSelected(startOffset: number, endOffset: number) {
    return isTextRangeSelected(referenceSelectionRanges, startOffset, endOffset);
  }

  function getWordRangeFromElement(element: Element | null) {
    const wordElement = element?.closest<HTMLElement>('[data-reference-word="true"]');
    if (!wordElement) return null;
    const startOffset = Number(wordElement.dataset.startOffset);
    const endOffset = Number(wordElement.dataset.endOffset);
    if (!Number.isFinite(startOffset) || !Number.isFinite(endOffset)) return null;
    return { startOffset, endOffset };
  }

  function handleWordPointerDown(event: PointerEvent<HTMLButtonElement>, startOffset: number, endOffset: number) {
    const selectionMode = isReferenceWordSelected(startOffset, endOffset) ? 'unselect' : 'select';
    dragSelection.current = { pointerId: event.pointerId, mode: selectionMode };
    handledPointerClick.current = true;
    event.preventDefault();
    event.currentTarget.closest<HTMLElement>('.reference-word-picker')?.setPointerCapture?.(event.pointerId);
    updateReferenceWordSelection(startOffset, endOffset, selectionMode);
  }

  function handleReferencePointerMove(event: PointerEvent<HTMLDivElement>) {
    const currentDragSelection = dragSelection.current;
    if (!currentDragSelection || currentDragSelection.pointerId !== event.pointerId) return;

    event.preventDefault();
    const wordRange = getWordRangeFromElement(document.elementFromPoint(event.clientX, event.clientY));
    if (!wordRange) return;
    updateReferenceWordSelection(wordRange.startOffset, wordRange.endOffset, currentDragSelection.mode);
  }

  function endDragSelection(event: PointerEvent<HTMLDivElement>) {
    if (dragSelection.current?.pointerId === event.pointerId) {
      dragSelection.current = null;
    }
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
          <button className="icon-button bare" type="button" title="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        {isConnectionMode && sourceMessage && (
          <p className="reference-picker-context">
            From <strong>{getMessageReferencePreview(sourceMessage, 80)}</strong>
          </p>
        )}

        <div className="reference-picker-grid">
          <div className="reference-picker-list">
            {conversations
              .filter((conversation) => mode !== 'quote' || conversation.id !== activeConversation.id)
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
            <div className="reference-picker-segments" role="group" aria-label="Connection type">
              <button
                className={connectionKind === 'block' ? 'active' : ''}
                type="button"
                onClick={() => {
                  setConnectionKind('block');
                  setReferenceSelectionRanges([]);
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
                        setReferenceSelectionRanges([]);
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
                  onPointerMove={handleReferencePointerMove}
                  onPointerUp={endDragSelection}
                  onPointerCancel={endDragSelection}
                  onLostPointerCapture={endDragSelection}
                >
                  {getTextTokens(referenceMessage.text).map((token) =>
                    token.isWord ? (
                      <button
                        key={`${token.startOffset}-${token.endOffset}`}
                        className={`word-token ${isReferenceWordSelected(token.startOffset, token.endOffset) ? 'selected' : ''}`}
                        type="button"
                        aria-pressed={isReferenceWordSelected(token.startOffset, token.endOffset)}
                        data-reference-word="true"
                        data-start-offset={token.startOffset}
                        data-end-offset={token.endOffset}
                        onPointerDown={(event) => handleWordPointerDown(event, token.startOffset, token.endOffset)}
                        onClick={(event) => {
                          if (handledPointerClick.current && event.detail !== 0) {
                            handledPointerClick.current = false;
                            return;
                          }
                          updateReferenceWordSelection(token.startOffset, token.endOffset, 'toggle');
                        }}
                      >
                        {token.text}
                      </button>
                    ) : (
                      <span key={`${token.startOffset}-${token.endOffset}`}>{token.text}</span>
                    )
                  )}
                </div>
              ) : (
                <p className="empty-state">Choose a text block.</p>
              )}
              {referenceSelectionRanges.length > 0 && (
                <div className="transfer-selection-summary">
                  <span>{referenceSelectionRanges.length} selected</span>
                  <button className="text-button" type="button" onClick={() => setReferenceSelectionRanges([])}>
                    Clear selection
                  </button>
                </div>
              )}
              {selectedQuoteText && <p className="transfer-preview">{selectedQuoteText}</p>}
              <button
                className="primary-button"
                type="button"
                disabled={!referenceMessage || referenceSelectionRanges.length === 0}
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
