import { describe, expect, it } from 'vitest';
import { getImageExtension, getImageFilesFromClipboardData } from './imageFiles';

describe('image file helpers', () => {
  it('prefers image files from clipboard items', () => {
    const itemFile = new File(['item'], 'item.png', { type: 'image/png' });
    const fallbackFile = new File(['fallback'], 'fallback.png', { type: 'image/png' });
    const textFile = new File(['text'], 'note.txt', { type: 'text/plain' });
    const clipboardData = {
      items: [
        {
          kind: 'file',
          type: 'image/png',
          getAsFile: () => itemFile
        },
        {
          kind: 'file',
          type: 'text/plain',
          getAsFile: () => textFile
        }
      ],
      files: [fallbackFile]
    } as unknown as DataTransfer;

    expect(getImageFilesFromClipboardData(clipboardData)).toEqual([itemFile]);
  });

  it('falls back to image files when clipboard items contain no images', () => {
    const imageFile = new File(['image'], 'fallback.jpg', { type: 'image/jpeg' });
    const textFile = new File(['text'], 'note.txt', { type: 'text/plain' });
    const clipboardData = {
      items: [],
      files: [imageFile, textFile]
    } as unknown as DataTransfer;

    expect(getImageFilesFromClipboardData(clipboardData)).toEqual([imageFile]);
  });

  it('normalizes clipboard image extensions', () => {
    expect(getImageExtension('image/jpeg')).toBe('jpg');
    expect(getImageExtension('image/svg+xml')).toBe('svg');
    expect(getImageExtension('image/webp')).toBe('webp');
    expect(getImageExtension('image/x-custom!')).toBe('xcustom');
    expect(getImageExtension('application/octet-stream')).toBe('octetstream');
  });
});
