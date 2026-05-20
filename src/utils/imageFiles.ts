export function createPreviewId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getImageFilesFromClipboardData(clipboardData: DataTransfer) {
  const itemFiles = Array.from(clipboardData.items)
    .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
    .map((item) => item.getAsFile())
    .filter((file): file is File => Boolean(file));

  if (itemFiles.length > 0) return itemFiles;

  return Array.from(clipboardData.files).filter((file) => file.type.startsWith('image/'));
}

export function getImageExtension(contentType: string) {
  if (contentType === 'image/jpeg') return 'jpg';
  if (contentType === 'image/svg+xml') return 'svg';
  return contentType.split('/')[1]?.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'png';
}
