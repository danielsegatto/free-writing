import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type PointerEvent,
  type RefObject
} from 'react';
import { resolveNearestDropTarget, type DropPosition, type DropTargetCandidate } from '../utils/dropTargets';

const DRAG_AUTOSCROLL_EDGE_PX = 72;
const DRAG_AUTOSCROLL_MAX_PX = 18;

export type ListReorderDropTarget = {
  itemId: string;
  position: DropPosition;
};

export type ListReorderDragPreview = {
  itemId: string;
  x: number;
  y: number;
  width: number;
};

type PointerDragState = {
  itemId: string;
  pointerId: number;
};

type UseListReorderDragOptions = {
  containerRef: RefObject<HTMLElement | null>;
  itemSelector: string;
  getItemId: (element: HTMLElement) => string | null | undefined;
  itemCount: number;
  onReorder: (draggedItemId: string, targetItemId: string, position: DropPosition) => void;
  onDragInteractionEnd?: () => void;
};

function createHiddenDragImage(event: DragEvent<HTMLElement>) {
  const dragImage = document.createElement('div');
  dragImage.style.width = '1px';
  dragImage.style.height = '1px';
  dragImage.style.opacity = '0';
  document.body.appendChild(dragImage);
  event.dataTransfer.setDragImage?.(dragImage, 0, 0);
  window.setTimeout(() => dragImage.remove(), 0);
}

export function useListReorderDrag({
  containerRef,
  itemSelector,
  getItemId,
  itemCount,
  onReorder,
  onDragInteractionEnd
}: UseListReorderDragOptions) {
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<ListReorderDropTarget | null>(null);
  const [dragPreview, setDragPreview] = useState<ListReorderDragPreview | null>(null);
  const pointerDrag = useRef<PointerDragState | null>(null);
  const draggedItemIdRef = useRef<string | null>(null);
  const dragAutoScroll = useRef<{ speedY: number; animationId: number | null }>({
    speedY: 0,
    animationId: null
  });

  useEffect(() => {
    draggedItemIdRef.current = draggedItemId;
  }, [draggedItemId]);

  useEffect(() => {
    if (!draggedItemId) return undefined;

    function handleWindowDragOver(event: globalThis.DragEvent) {
      updateDragAutoScroll(event.clientY);
      updateDragPreview(event.clientX, event.clientY);
    }

    window.addEventListener('dragover', handleWindowDragOver);
    return () => {
      window.removeEventListener('dragover', handleWindowDragOver);
      stopDragAutoScroll();
    };
  }, [draggedItemId]);

  useEffect(() => {
    return () => {
      stopDragAutoScroll();
    };
  }, []);

  function getItemElement(eventTarget: HTMLElement) {
    return eventTarget.closest<HTMLElement>(itemSelector);
  }

  function getDropPosition(itemElement: HTMLElement, clientY: number): DropPosition {
    const rect = itemElement.getBoundingClientRect();
    return clientY < rect.top + rect.height / 2 ? 'before' : 'after';
  }

  function getItemDropTarget(
    itemElement: HTMLElement,
    itemId: string,
    clientY: number,
    currentDraggedItemId: string | null
  ) {
    if (currentDraggedItemId === itemId) return null;
    return {
      itemId,
      position: getDropPosition(itemElement, clientY)
    };
  }

  function getItemElements() {
    return Array.from(containerRef.current?.querySelectorAll<HTMLElement>(itemSelector) ?? []).filter((element) =>
      Boolean(getItemId(element))
    );
  }

  function getNearestDropTarget(clientY: number, currentDraggedItemId: string | null): ListReorderDropTarget | null {
    const candidates = getItemElements().reduce<DropTargetCandidate[]>((currentCandidates, itemElement) => {
      const itemId = getItemId(itemElement);
      if (!itemId) return currentCandidates;

      const rect = itemElement.getBoundingClientRect();
      currentCandidates.push({ id: itemId, top: rect.top, height: rect.height });
      return currentCandidates;
    }, []);
    const nearestDropTarget = resolveNearestDropTarget(candidates, clientY, currentDraggedItemId);
    return nearestDropTarget ? { itemId: nearestDropTarget.itemId, position: nearestDropTarget.position } : null;
  }

  function findDropTargetAtPoint(clientX: number, clientY: number, currentDraggedItemId: string | null) {
    const target = document.elementFromPoint(clientX, clientY);
    if (!(target instanceof Element)) return getNearestDropTarget(clientY, currentDraggedItemId);
    const itemElement = target.closest<HTMLElement>(itemSelector);
    const itemId = itemElement ? getItemId(itemElement) : null;
    if (!itemElement || !itemId || currentDraggedItemId === itemId) {
      return getNearestDropTarget(clientY, currentDraggedItemId);
    }
    return getItemDropTarget(itemElement, itemId, clientY, currentDraggedItemId);
  }

  function stopDragAutoScroll() {
    const currentAutoScroll = dragAutoScroll.current;
    if (currentAutoScroll.animationId !== null) {
      window.cancelAnimationFrame(currentAutoScroll.animationId);
    }
    dragAutoScroll.current = { speedY: 0, animationId: null };
  }

  function runDragAutoScroll() {
    const container = containerRef.current;
    const currentAutoScroll = dragAutoScroll.current;
    if (!container || currentAutoScroll.speedY === 0) {
      stopDragAutoScroll();
      return;
    }

    container.scrollBy({ top: currentAutoScroll.speedY });
    currentAutoScroll.animationId = window.requestAnimationFrame(runDragAutoScroll);
  }

  function updateDragAutoScroll(clientY: number) {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const topDistance = clientY - rect.top;
    const bottomDistance = rect.bottom - clientY;
    const topIntensity = (DRAG_AUTOSCROLL_EDGE_PX - topDistance) / DRAG_AUTOSCROLL_EDGE_PX;
    const bottomIntensity = (DRAG_AUTOSCROLL_EDGE_PX - bottomDistance) / DRAG_AUTOSCROLL_EDGE_PX;
    const nextSpeedY =
      topIntensity > 0
        ? -Math.min(DRAG_AUTOSCROLL_MAX_PX, Math.ceil(topIntensity * DRAG_AUTOSCROLL_MAX_PX))
        : bottomIntensity > 0
          ? Math.min(DRAG_AUTOSCROLL_MAX_PX, Math.ceil(bottomIntensity * DRAG_AUTOSCROLL_MAX_PX))
          : 0;

    dragAutoScroll.current.speedY = nextSpeedY;
    if (nextSpeedY === 0) {
      stopDragAutoScroll();
      return;
    }

    if (dragAutoScroll.current.animationId === null) {
      dragAutoScroll.current.animationId = window.requestAnimationFrame(runDragAutoScroll);
    }
  }

  function updateDragPreview(clientX: number, clientY: number) {
    setDragPreview((currentPreview) =>
      currentPreview ? { ...currentPreview, x: clientX, y: clientY } : currentPreview
    );
  }

  function clearDragState() {
    pointerDrag.current = null;
    stopDragAutoScroll();
    setDraggedItemId(null);
    setDropTarget(null);
    setDragPreview(null);
  }

  function completeDrag() {
    clearDragState();
    onDragInteractionEnd?.();
  }

  function handleItemDragStart(event: DragEvent<HTMLElement>, itemId: string) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', itemId);
    const itemElement = getItemElement(event.currentTarget);
    const rect = itemElement?.getBoundingClientRect();
    if (rect) {
      setDragPreview({
        itemId,
        x: event.clientX,
        y: event.clientY,
        width: rect.width
      });
    }
    createHiddenDragImage(event);
    setDraggedItemId(itemId);
    updateDragAutoScroll(event.clientY);
  }

  function handleItemDragOver(event: DragEvent<HTMLElement>, itemId: string) {
    const currentDraggedItemId = draggedItemIdRef.current;
    const isSameItem = currentDraggedItemId === itemId;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    updateDragAutoScroll(event.clientY);
    updateDragPreview(event.clientX, event.clientY);
    setDropTarget(
      isSameItem
        ? getNearestDropTarget(event.clientY, itemId)
        : getItemDropTarget(event.currentTarget, itemId, event.clientY, currentDraggedItemId)
    );
  }

  function handleItemDragLeave(event: DragEvent<HTMLElement>, itemId: string) {
    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) return;
    setDropTarget((currentTarget) => (currentTarget?.itemId === itemId ? null : currentTarget));
  }

  function handleItemDrop(event: DragEvent<HTMLElement>, targetItemId: string) {
    event.preventDefault();
    event.stopPropagation();
    const droppedItemId = event.dataTransfer.getData('text/plain') || draggedItemIdRef.current;
    const position = getDropPosition(event.currentTarget, event.clientY);
    completeDrag();
    if (!droppedItemId || droppedItemId === targetItemId) return;
    onReorder(droppedItemId, targetItemId, position);
  }

  function handleContainerDragOver(event: DragEvent<HTMLElement>) {
    const currentDraggedItemId = draggedItemIdRef.current;
    if (!currentDraggedItemId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    updateDragAutoScroll(event.clientY);
    updateDragPreview(event.clientX, event.clientY);
    setDropTarget(getNearestDropTarget(event.clientY, currentDraggedItemId));
  }

  function handleContainerDrop(event: DragEvent<HTMLElement>) {
    const currentDraggedItemId = draggedItemIdRef.current;
    if (!currentDraggedItemId) return;
    event.preventDefault();
    const droppedItemId = event.dataTransfer.getData('text/plain') || currentDraggedItemId;
    const nearestDropTarget = getNearestDropTarget(event.clientY, droppedItemId);
    completeDrag();
    if (nearestDropTarget) onReorder(droppedItemId, nearestDropTarget.itemId, nearestDropTarget.position);
  }

  function handleItemDragEnd() {
    completeDrag();
  }

  function handleItemPointerDown(event: PointerEvent<HTMLElement>, itemId: string) {
    if (itemCount < 2) return;

    const itemElement = getItemElement(event.currentTarget);
    const rect = itemElement?.getBoundingClientRect();
    const width = rect?.width ?? 280;

    pointerDrag.current = {
      itemId,
      pointerId: event.pointerId
    };
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDraggedItemId(itemId);
    setDragPreview({
      itemId,
      x: event.clientX,
      y: event.clientY,
      width
    });
    updateDragAutoScroll(event.clientY);
  }

  function handleItemPointerMove(event: PointerEvent<HTMLElement>) {
    const currentDrag = pointerDrag.current;
    if (!currentDrag || currentDrag.pointerId !== event.pointerId) return;

    event.preventDefault();
    updateDragAutoScroll(event.clientY);
    updateDragPreview(event.clientX, event.clientY);
    setDropTarget(findDropTargetAtPoint(event.clientX, event.clientY, currentDrag.itemId));
  }

  function handleItemPointerUp(event: PointerEvent<HTMLElement>) {
    const currentDrag = pointerDrag.current;
    if (!currentDrag || currentDrag.pointerId !== event.pointerId) return;

    const pointerDropTarget = findDropTargetAtPoint(event.clientX, event.clientY, currentDrag.itemId);
    completeDrag();
    if (pointerDropTarget) onReorder(currentDrag.itemId, pointerDropTarget.itemId, pointerDropTarget.position);
  }

  function handleItemPointerCancel(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== 'mouse' && pointerDrag.current?.pointerId === event.pointerId) clearDragState();
  }

  return {
    draggedItemId,
    dropTarget,
    dragPreview,
    handleItemDragStart,
    handleItemDragOver,
    handleItemDragLeave,
    handleItemDrop,
    handleItemDragEnd,
    handleContainerDragOver,
    handleContainerDrop,
    handleItemPointerDown,
    handleItemPointerMove,
    handleItemPointerUp,
    handleItemPointerCancel
  };
}
