import type { Message } from '../types';

export function moveMessageByDirection(messages: Message[], messageIndex: number, direction: -1 | 1) {
  const targetIndex = messageIndex + direction;
  if (messageIndex < 0 || messageIndex >= messages.length || targetIndex < 0 || targetIndex >= messages.length) {
    return null;
  }

  const nextMessages = [...messages];
  [nextMessages[messageIndex], nextMessages[targetIndex]] = [nextMessages[targetIndex], nextMessages[messageIndex]];
  return nextMessages;
}

export function moveMessageToDropTarget(messages: Message[], draggedMessageId: string, targetMessageId: string) {
  if (draggedMessageId === targetMessageId) return null;

  const draggedIndex = messages.findIndex((message) => message.id === draggedMessageId);
  const targetIndex = messages.findIndex((message) => message.id === targetMessageId);
  if (draggedIndex === -1 || targetIndex === -1) return null;

  const nextMessages = [...messages];
  const [draggedMessage] = nextMessages.splice(draggedIndex, 1);
  nextMessages.splice(targetIndex, 0, draggedMessage);
  return nextMessages;
}
