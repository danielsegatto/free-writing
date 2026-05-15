import { Languages, Send } from 'lucide-react';

type MessageComposerProps = {
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmitMessage: () => void;
  onConvertDraftToEnglish: () => void;
};

export function MessageComposer({
  draft,
  onDraftChange,
  onSubmitMessage,
  onConvertDraftToEnglish
}: MessageComposerProps) {
  return (
    <form
      className="composer"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmitMessage();
      }}
    >
      <textarea
        value={draft}
        onChange={(event) => onDraftChange(event.target.value)}
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            onConvertDraftToEnglish();
          }
        }}
        placeholder="Write a message"
        rows={2}
      />
      <div className="composer-actions">
        <button
          className="icon-button"
          type="button"
          title="Convert draft to English"
          disabled={!draft.trim()}
          onClick={onConvertDraftToEnglish}
        >
          <Languages size={17} />
        </button>
        <button className="primary-button send-button" disabled={!draft.trim()}>
          <Send size={16} />
          Send
        </button>
      </div>
    </form>
  );
}
