import { describe, expect, it } from 'vitest';
import { assembleEnglishText } from './englishConversion';

describe('assembleEnglishText', () => {
  it('joins the selected option from each segment and defaults missing selections to the first option', () => {
    const text = assembleEnglishText(
      {
        segments: [
          {
            original: 'Primeiro',
            options: ['First default', 'First selected', 'First formal']
          },
          {
            original: 'Segundo',
            options: ['Second default', 'Second selected', 'Second formal']
          }
        ]
      },
      [1]
    );

    expect(text).toBe('First selected Second default');
  });
});
