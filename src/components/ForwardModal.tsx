import { X } from 'lucide-react';
import type { Conversation, Message } from '../types';

type ForwardModalProps = {
  conversations: Conversation[];
  forwardingMessage: Message;
  onClose: () => void;
  onForward: (targetConversationId: string) => void;
};

export function ForwardModal({ conversations, forwardingMessage, onClose, onForward }: ForwardModalProps) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="modal">
        <header>
          <h2>Forward to</h2>
          <button className="icon-button bare" title="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        {conversations
          .filter((conversation) => conversation.id !== forwardingMessage.conversationId)
          .map((conversation) => (
            <button key={conversation.id} className="target-row" onClick={() => onForward(conversation.id)}>
              {conversation.title}
            </button>
          ))}
      </section>
    </div>
  );
}
