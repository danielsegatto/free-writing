import { useRef, useState, type PointerEvent } from 'react';
import type { TextSelectionRange } from '../utils/textSelection';
import {
  isTextRangeSelected,
  updateTextSelectionRanges,
  type SelectionUpdateMode,
} from '../utils/transferSelection';

type WordRange = {
  messageId?: string;
  startOffset: number;
  endOffset: number;
};

type DragSelection = {
  pointerId: number;
  mode: Extract<SelectionUpdateMode, 'select' | 'unselect'>;
};

type UseWordRangeSelectionOptions = {
  wordSelector: string;
  captureSelector: string;
};

function getWordRangeFromElement(
  element: Element | null,
  wordSelector: string,
): WordRange | null {
  const wordElement = element?.closest<HTMLElement>(wordSelector);
  if (!wordElement) return null;
  const messageId = wordElement.dataset.messageId;
  const startOffset = Number(wordElement.dataset.startOffset);
  const endOffset = Number(wordElement.dataset.endOffset);
  if (!Number.isFinite(startOffset) || !Number.isFinite(endOffset)) return null;
  return { messageId, startOffset, endOffset };
}

export function useWordRangeSelection({
  wordSelector,
  captureSelector,
}: UseWordRangeSelectionOptions) {
  const [selectionRanges, setSelectionRanges] = useState<TextSelectionRange[]>(
    [],
  );
  const [messageSelectionRanges, setMessageSelectionRanges] = useState<
    Record<string, TextSelectionRange[]>
  >({});
  const dragSelection = useRef<DragSelection | null>(null);
  const handledPointerClick = useRef(false);

  function updateSelection(
    startOffset: number,
    endOffset: number,
    mode: SelectionUpdateMode,
    messageId?: string,
  ) {
    if (messageId) {
      setMessageSelectionRanges((currentRanges) => ({
        ...currentRanges,
        [messageId]: updateTextSelectionRanges(
          currentRanges[messageId] ?? [],
          startOffset,
          endOffset,
          mode,
        ),
      }));
      return;
    }

    setSelectionRanges((currentRanges) =>
      updateTextSelectionRanges(currentRanges, startOffset, endOffset, mode),
    );
  }

  function isSelected(
    startOffset: number,
    endOffset: number,
    messageId?: string,
  ) {
    return isTextRangeSelected(
      messageId ? (messageSelectionRanges[messageId] ?? []) : selectionRanges,
      startOffset,
      endOffset,
    );
  }

  function clearSelection() {
    setSelectionRanges([]);
    setMessageSelectionRanges({});
  }

  function handleWordPointerDown(
    event: PointerEvent<HTMLButtonElement>,
    startOffset: number,
    endOffset: number,
    messageId?: string,
  ) {
    const mode = isSelected(startOffset, endOffset, messageId)
      ? 'unselect'
      : 'select';
    dragSelection.current = { pointerId: event.pointerId, mode };
    handledPointerClick.current = true;
    event.preventDefault();
    event.currentTarget
      .closest<HTMLElement>(captureSelector)
      ?.setPointerCapture?.(event.pointerId);
    updateSelection(startOffset, endOffset, mode, messageId);
  }

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    const currentDragSelection = dragSelection.current;
    if (
      !currentDragSelection ||
      currentDragSelection.pointerId !== event.pointerId
    )
      return;

    event.preventDefault();
    const wordRange = getWordRangeFromElement(
      document.elementFromPoint(event.clientX, event.clientY),
      wordSelector,
    );
    if (!wordRange) return;
    updateSelection(
      wordRange.startOffset,
      wordRange.endOffset,
      currentDragSelection.mode,
      wordRange.messageId,
    );
  }

  function endDragSelection(event: PointerEvent<HTMLElement>) {
    if (dragSelection.current?.pointerId === event.pointerId) {
      dragSelection.current = null;
    }
  }

  function handleWordClick(
    startOffset: number,
    endOffset: number,
    detail: number,
    messageId?: string,
  ) {
    if (handledPointerClick.current && detail !== 0) {
      handledPointerClick.current = false;
      return;
    }
    updateSelection(startOffset, endOffset, 'toggle', messageId);
  }

  return {
    selectionRanges,
    messageSelectionRanges,
    clearSelection,
    isSelected,
    handleWordPointerDown,
    handlePointerMove,
    endDragSelection,
    handleWordClick,
  };
}
