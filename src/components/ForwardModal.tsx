import { useRef, useState, type PointerEvent } from 'react';
import { X } from 'lucide-react';
import type { Conversation, Message } from '../types';
import { getSelectedTextFromRanges, getTextTokens, type TextSelectionRange } from '../utils/textSelection';

type ForwardModalProps = {
  conversations: Conversation[];
  mode: 'forward' | 'move';
  sourceMessage: Message;
  onClose: () => void;
  onForward: (targetConversationId: string, ranges?: TextSelectionRange[]) => void;
};

export function ForwardModal({ conversations, mode, sourceMessage, onClose, onForward }: ForwardModalProps) {
  const actionLabel = mode === 'move' ? 'Move' : 'Forward';
  const [selectionRanges, setSelectionRanges] = useState<TextSelectionRange[]>([]);
  const dragSelection = useRef<{
    pointerId: number;
    mode: 'select' | 'unselect';
  } | null>(null);
  const handledPointerClick = useRef(false);
  const selectedText = getSelectedTextFromRanges(sourceMessage.text, selectionRanges);
  const transferText = selectedText || sourceMessage.text;
  const selectedWordCount = selectionRanges.length;

  function updateWordSelection(startOffset: number, endOffset: number, mode: 'toggle' | 'select' | 'unselect') {
    setSelectionRanges((currentSelectionRanges) => {
      const isAlreadySelected = currentSelectionRanges.some(
        (range) => range.startOffset === startOffset && range.endOffset === endOffset
      );
      if (mode === 'unselect' || (mode === 'toggle' && isAlreadySelected)) {
        return currentSelectionRanges.filter(
          (range) => range.startOffset !== startOffset || range.endOffset !== endOffset
        );
      }
      if (isAlreadySelected) return currentSelectionRanges;
      return [...currentSelectionRanges, { startOffset, endOffset }].sort(
        (first, second) => first.startOffset - second.startOffset
      );
    });
  }

  function isWordSelected(startOffset: number, endOffset: number) {
    return selectionRanges.some((range) => range.startOffset === startOffset && range.endOffset === endOffset);
  }

  function getWordRangeFromElement(element: Element | null) {
    const wordElement = element?.closest<HTMLElement>('[data-transfer-word="true"]');
    if (!wordElement) return null;
    const startOffset = Number(wordElement.dataset.startOffset);
    const endOffset = Number(wordElement.dataset.endOffset);
    if (!Number.isFinite(startOffset) || !Number.isFinite(endOffset)) return null;
    return { startOffset, endOffset };
  }

  function handleWordPointerDown(event: PointerEvent<HTMLButtonElement>, startOffset: number, endOffset: number) {
    const mode = isWordSelected(startOffset, endOffset) ? 'unselect' : 'select';
    dragSelection.current = { pointerId: event.pointerId, mode };
    handledPointerClick.current = true;
    event.preventDefault();
    event.currentTarget.closest<HTMLElement>('.transfer-source-text')?.setPointerCapture?.(event.pointerId);
    updateWordSelection(startOffset, endOffset, mode);
  }

  function handleSourcePointerMove(event: PointerEvent<HTMLDivElement>) {
    const currentDragSelection = dragSelection.current;
    if (!currentDragSelection || currentDragSelection.pointerId !== event.pointerId) return;

    event.preventDefault();
    const wordRange = getWordRangeFromElement(document.elementFromPoint(event.clientX, event.clientY));
    if (!wordRange) return;
    updateWordSelection(wordRange.startOffset, wordRange.endOffset, currentDragSelection.mode);
  }

  function endDragSelection(event: PointerEvent<HTMLDivElement>) {
    if (dragSelection.current?.pointerId === event.pointerId) {
      dragSelection.current = null;
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="modal transfer-modal">
        <header>
          <h2>{actionLabel} to</h2>
          <button className="icon-button bare" title="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <div className="transfer-modal-grid">
          <div className="transfer-selection-panel">
            <div
              className="transfer-source-text"
              aria-label="Choose text to transfer"
              onPointerMove={handleSourcePointerMove}
              onPointerUp={endDragSelection}
              onPointerCancel={endDragSelection}
              onLostPointerCapture={endDragSelection}
            >
              {getTextTokens(sourceMessage.text).map((token) =>
                token.isWord ? (
                  <button
                    key={`${token.startOffset}-${token.endOffset}`}
                    className={`word-token ${isWordSelected(token.startOffset, token.endOffset) ? 'selected' : ''}`}
                    type="button"
                    aria-pressed={isWordSelected(token.startOffset, token.endOffset)}
                    data-transfer-word="true"
                    data-start-offset={token.startOffset}
                    data-end-offset={token.endOffset}
                    onPointerDown={(event) => handleWordPointerDown(event, token.startOffset, token.endOffset)}
                    onClick={(event) => {
                      if (handledPointerClick.current && event.detail !== 0) {
                        handledPointerClick.current = false;
                        return;
                      }
                      updateWordSelection(token.startOffset, token.endOffset, 'toggle');
                    }}
                  >
                    {token.text}
                  </button>
                ) : (
                  <span key={`${token.startOffset}-${token.endOffset}`}>{token.text}</span>
                )
              )}
            </div>
            <div className="transfer-selection-summary">
              <span>{selectedWordCount > 0 ? `${selectedWordCount} selected` : 'Whole block'}</span>
              {selectedWordCount > 0 && (
                <button className="text-button" type="button" onClick={() => setSelectionRanges([])}>
                  Use whole block
                </button>
              )}
            </div>
            <p className="transfer-preview">{transferText}</p>
          </div>
          <div className="transfer-target-list">
            {conversations
              .filter((conversation) => conversation.id !== sourceMessage.conversationId)
              .map((conversation) => (
                <button
                  key={conversation.id}
                  className="target-row"
                  onClick={() => onForward(conversation.id, selectionRanges.length > 0 ? selectionRanges : undefined)}
                >
                  {conversation.title}
                </button>
              ))}
          </div>
        </div>
      </section>
    </div>
  );
}
