import { describe, expect, it } from 'vitest';
import { resolveNearestDropTarget, type DropTargetCandidate } from './dropTargets';

const candidates: DropTargetCandidate[] = [
  { id: 'first', top: 100, height: 80 },
  { id: 'second', top: 240, height: 80 },
  { id: 'third', top: 380, height: 80 }
];

describe('drop target helpers', () => {
  it('resolves the nearest before slot from candidate midpoints', () => {
    expect(resolveNearestDropTarget(candidates, 220)).toEqual({ itemId: 'second', position: 'before' });
  });

  it('resolves after the final item when the pointer is below all midpoints', () => {
    expect(resolveNearestDropTarget(candidates, 500)).toEqual({ itemId: 'third', position: 'after' });
  });

  it('excludes the item currently being dragged', () => {
    expect(resolveNearestDropTarget(candidates, 120, 'first')).toEqual({ itemId: 'second', position: 'before' });
  });

  it('returns null when no candidates remain', () => {
    expect(resolveNearestDropTarget([{ id: 'only', top: 100, height: 80 }], 120, 'only')).toBeNull();
  });
});
