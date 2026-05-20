import { Fragment, useEffect, useRef, type MouseEvent } from 'react';
import { Edit3, GripVertical, LogOut, Plus, Search, Trash2, X } from 'lucide-react';
import { useListReorderDrag } from '../hooks/useListReorderDrag';
import { signOutUser } from '../services/auth';
import type { Conversation, Message } from '../types';
import { formatDate } from '../utils/date';
import type { DropPosition } from '../utils/dropTargets';

type SearchResult = {
  conversation: Conversation;
  message: Message;
};

type SidebarProps = {
  activeConversation: Conversation | null;
  activeConversationId: string | null;
  conversations: Conversation[];
  searchTerm: string;
  searchResults: SearchResult[];
  renamingId: string | null;
  renameDraft: string;
  onSearchTermChange: (value: string) => void;
  onCreateConversation: () => void;
  onSelectConversation: (conversationId: string | null) => void;
  onStartRename: (conversation: Conversation) => void;
  onRenameDraftChange: (value: string) => void;
  onRenameConversation: (conversation: Conversation) => void;
  onDeleteConversation: (conversation: Conversation) => void;
  onReorderConversation: (draggedConversationId: string, targetConversationId: string, position: DropPosition) => void;
};

export function Sidebar({
  activeConversation,
  activeConversationId,
  conversations,
  searchTerm,
  searchResults,
  renamingId,
  renameDraft,
  onSearchTermChange,
  onCreateConversation,
  onSelectConversation,
  onStartRename,
  onRenameDraftChange,
  onRenameConversation,
  onDeleteConversation,
  onReorderConversation
}: SidebarProps) {
  const conversationListRef = useRef<HTMLElement | null>(null);
  const suppressNextSelectRef = useRef(false);
  const suppressSelectTimeoutRef = useRef<number | null>(null);
  const {
    draggedItemId: draggedConversationId,
    dropTarget: conversationDropTarget,
    dragPreview,
    handleItemDragStart: handleConversationDragStart,
    handleItemDragOver: handleConversationDragOver,
    handleItemDragLeave: handleConversationDragLeave,
    handleItemDrop: handleConversationDrop,
    handleItemDragEnd: handleConversationDragEnd,
    handleContainerDragOver: handleConversationListDragOver,
    handleContainerDrop: handleConversationListDrop,
    handleItemPointerDown: handleConversationPointerDown,
    handleItemPointerMove: handleConversationPointerMove,
    handleItemPointerUp: handleConversationPointerUp,
    handleItemPointerCancel: handleConversationPointerCancel
  } = useListReorderDrag({
    containerRef: conversationListRef,
    itemSelector: '[data-conversation-id]',
    getItemId: (element) => element.dataset.conversationId,
    itemCount: conversations.length,
    onReorder: onReorderConversation,
    onDragInteractionEnd: suppressNextSelect
  });
  const draggedConversation = dragPreview
    ? conversations.find((conversation) => conversation.id === dragPreview.itemId) ?? null
    : null;

  useEffect(() => {
    return () => {
      if (suppressSelectTimeoutRef.current !== null) window.clearTimeout(suppressSelectTimeoutRef.current);
    };
  }, []);

  function suppressNextSelect() {
    suppressNextSelectRef.current = true;
    if (suppressSelectTimeoutRef.current !== null) window.clearTimeout(suppressSelectTimeoutRef.current);
    suppressSelectTimeoutRef.current = window.setTimeout(() => {
      suppressNextSelectRef.current = false;
      suppressSelectTimeoutRef.current = null;
    }, 0);
  }

  function selectConversation(event: MouseEvent<HTMLButtonElement>, conversationId: string) {
    if (suppressNextSelectRef.current) {
      suppressNextSelectRef.current = false;
      if (suppressSelectTimeoutRef.current !== null) {
        window.clearTimeout(suppressSelectTimeoutRef.current);
        suppressSelectTimeoutRef.current = null;
      }
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    onSelectConversation(conversationId);
  }

  return (
    <aside className={`sidebar ${activeConversation ? 'has-active' : ''}`}>
      <header className="app-header">
        <div>
          <p className="eyebrow">Private notebook</p>
          <h1>Free Writing</h1>
        </div>
        <button className="icon-button" title="Sign out" onClick={() => void signOutUser()}>
          <LogOut size={19} />
        </button>
      </header>

      <div className="search-box">
        <Search size={18} />
        <input
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          placeholder="Search messages"
        />
        {searchTerm && (
          <button className="icon-button bare" title="Clear search" onClick={() => onSearchTermChange('')}>
            <X size={17} />
          </button>
        )}
      </div>

      {searchTerm ? (
        <section className="search-results">
          {searchResults.map(({ conversation, message }) => (
            <button
              key={message.id}
              className="conversation-row"
              onClick={() => {
                onSelectConversation(conversation.id);
                onSearchTermChange('');
              }}
            >
              <strong>{conversation.title}</strong>
              <span>{message.text}</span>
              <time>{formatDate(message.createdAt)}</time>
            </button>
          ))}
          {searchResults.length === 0 && <p className="empty-state">No loaded messages match that search.</p>}
        </section>
      ) : (
        <section
          className="conversation-list"
          ref={conversationListRef}
          onDragOver={handleConversationListDragOver}
          onDrop={handleConversationListDrop}
        >
          <button className="new-conversation" onClick={onCreateConversation}>
            <Plus size={18} />
            New conversation
          </button>
          {conversations.map((conversation) => (
            <Fragment key={conversation.id}>
              {conversationDropTarget?.itemId === conversation.id &&
                conversationDropTarget.position === 'before' && (
                  <div className="conversation-drop-indicator" aria-hidden="true" />
                )}
              <article
                className={[
                  'conversation-row',
                  conversation.id === activeConversationId ? 'active' : '',
                  draggedConversationId === conversation.id ? 'dragging' : ''
                ]
                  .filter(Boolean)
                  .join(' ')}
                data-conversation-id={conversation.id}
                onDragOver={(event) => handleConversationDragOver(event, conversation.id)}
                onDragLeave={(event) => handleConversationDragLeave(event, conversation.id)}
                onDrop={(event) => handleConversationDrop(event, conversation.id)}
              >
                {renamingId === conversation.id ? (
                  <form
                    className="rename-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      onRenameConversation(conversation);
                    }}
                  >
                    <input value={renameDraft} onChange={(event) => onRenameDraftChange(event.target.value)} autoFocus />
                    <button className="text-button" type="submit">
                      Save
                    </button>
                  </form>
                ) : (
                  <button className="conversation-main" onClick={(event) => selectConversation(event, conversation.id)}>
                    <strong>{conversation.title}</strong>
                    <time>{formatDate(conversation.updatedAt)}</time>
                  </button>
                )}
                <div className="row-actions">
                  <button
                    className="icon-button bare drag-handle"
                    title="Drag conversation"
                    draggable={conversations.length > 1 && renamingId !== conversation.id}
                    disabled={conversations.length < 2 || renamingId === conversation.id}
                    onDragStart={(event) => handleConversationDragStart(event, conversation.id)}
                    onDragEnd={handleConversationDragEnd}
                    onPointerDown={(event) => handleConversationPointerDown(event, conversation.id)}
                    onPointerMove={handleConversationPointerMove}
                    onPointerUp={handleConversationPointerUp}
                    onPointerCancel={handleConversationPointerCancel}
                  >
                    <GripVertical size={16} />
                  </button>
                  <button className="icon-button bare" title="Rename" onClick={() => onStartRename(conversation)}>
                    <Edit3 size={16} />
                  </button>
                  <button
                    className="icon-button bare"
                    title="Delete"
                    onClick={() => onDeleteConversation(conversation)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
              {conversationDropTarget?.itemId === conversation.id &&
                conversationDropTarget.position === 'after' && (
                  <div className="conversation-drop-indicator" aria-hidden="true" />
                )}
            </Fragment>
          ))}
          {conversations.length === 0 && <p className="empty-state">Create your first conversation.</p>}
          {dragPreview && draggedConversation && (
            <div
              className="conversation-drag-preview"
              style={{
                left: dragPreview.x,
                top: dragPreview.y,
                width: dragPreview.width
              }}
            >
              <strong>{draggedConversation.title}</strong>
              <time>{formatDate(draggedConversation.updatedAt)}</time>
            </div>
          )}
        </section>
      )}
    </aside>
  );
}
