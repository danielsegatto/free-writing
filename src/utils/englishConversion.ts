import type { EnglishConversion } from '../types';

export function assembleEnglishText(conversion: EnglishConversion, selections: number[]) {
  return conversion.segments
    .map((segment, segmentIndex) => segment.options[selections[segmentIndex] ?? 0])
    .join(' ')
    .trim();
}
