export type DropPosition = 'before' | 'after';

export type DropTarget = {
  itemId: string;
  position: DropPosition;
};

export type DropTargetCandidate = {
  id: string;
  top: number;
  height: number;
};

export function resolveNearestDropTarget(
  candidates: DropTargetCandidate[],
  clientY: number,
  excludedItemId: string | null = null
): DropTarget | null {
  const availableCandidates = candidates.filter((candidate) => candidate.id !== excludedItemId);
  if (availableCandidates.length === 0) return null;

  for (const candidate of availableCandidates) {
    if (clientY < candidate.top + candidate.height / 2) {
      return { itemId: candidate.id, position: 'before' };
    }
  }

  return {
    itemId: availableCandidates[availableCandidates.length - 1].id,
    position: 'after'
  };
}
