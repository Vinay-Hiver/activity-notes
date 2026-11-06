import React from 'react';
import { useCurrentUser } from '../../CurrentUser';
import { useEmailNotes } from '../../EmailNotesStore';
import { NoteCard, NoteConfirm, PinnedNote, StickyPinnedNote, formatNoteTime, keepScrollPosition } from './EmailNotes';

/**
 * Notes in a real-time channel's thread (Chat, Slack, WhatsApp, SMS), with the same cards and actions
 * as email: a note opens and closes on click; hover shows Pin, Reply, and (on your own notes) Edit and
 * Delete. One note can be pinned to the top. Notes are shared by Michael and Jim (see EmailNotesStore).
 *
 * `onReply(note)` and `onEdit(note)` hand the note to the composer; `scrollRef` is the thread's scroller.
 */
export function useNotesThread(convoId, { onReply, onEdit, scrollRef }) {
  const { user } = useCurrentUser();
  const { threads, setThreads } = useEmailNotes();
  const [openIds, setOpenIds] = React.useState({});
  const [confirm, setConfirm] = React.useState(null); // { kind: 'pin' | 'delete', id }
  const [highlightId, setHighlightId] = React.useState(null);
  const highlightTimer = React.useRef(0);

  const key = String(convoId);
  const thread = threads[key] || { notes: [], pin: null };
  const update = (fn) => setThreads((all) => ({ ...all, [key]: fn(all[key] || { notes: [], pin: null }) }));
  const find = (id) => thread.notes.find((n) => n.id === id);

  const add = ({ body, attachments, replyTo }) => {
    const note = {
      id: `note-${Date.now()}`,
      authorId: user.id,
      author: user.name,
      initial: user.name.charAt(0),
      color: user.color,
      time: formatNoteTime(),
      at: Date.now(),
      body,
      attachments: attachments?.length ? attachments : undefined,
      replyTo: replyTo ? { noteId: replyTo.id, authorId: replyTo.authorId, author: replyTo.author, body: replyTo.body } : undefined,
    };
    update((t) => ({ ...t, notes: [...t.notes, note] }));
  };

  const edit = (id, body, attachments = []) => update((t) => ({
    ...t,
    notes: t.notes.map((n) => {
      if (n.id !== id) return n;
      const same = n.body === body && (n.attachments ?? []).map((f) => f.id).join() === attachments.map((f) => f.id).join();
      return same ? n : { ...n, body, attachments: attachments.length ? attachments : undefined, edited: true };
    }),
  }));

  const remove = (id) => update((t) => ({ notes: t.notes.filter((n) => n.id !== id), pin: t.pin?.id === id ? null : t.pin }));

  // The thread stays where it is: the new pinned copy goes in above, so the sticky bar shows it.
  const pin = (id) => {
    keepScrollPosition(scrollRef?.current);
    update((t) => ({ ...t, pin: { id, by: { id: user.id, name: user.name } } }));
  };

  // Only one note can be pinned: pinning another asks first.
  const togglePin = (id) => {
    if (thread.pin?.id === id) update((t) => ({ ...t, pin: null }));
    else if (thread.pin) setConfirm({ kind: 'pin', id });
    else pin(id);
  };

  const scrollToNote = (id) => {
    if (!find(id)) return;
    setOpenIds((o) => ({ ...o, [`feed-${id}`]: true }));
    window.clearTimeout(highlightTimer.current);
    setHighlightId(id);
    highlightTimer.current = window.setTimeout(() => setHighlightId((cur) => (cur === id ? null : cur)), 1400);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.getElementById(`thread-note-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }));
  };

  const renderNote = (note, copy = 'feed') => (
    <NoteCard
      key={`${copy}-${note.id}`}
      note={note}
      elementId={copy === 'pin' ? `thread-note-${note.id}-pin` : `thread-note-${note.id}`}
      // The pinned copy and the note in the thread open and close on their own.
      // A reply to a note opens by default; other notes start closed.
      expanded={openIds[`${copy}-${note.id}`] ?? !!note.replyTo}
      pinned={thread.pin?.id === note.id}
      highlighted={highlightId === note.id}
      onToggle={() => setOpenIds((o) => ({ ...o, [`${copy}-${note.id}`]: !(o[`${copy}-${note.id}`] ?? !!note.replyTo) }))}
      onPin={() => togglePin(note.id)}
      onReply={() => onReply(note)}
      onQuoteClick={note.replyTo ? () => scrollToNote(note.replyTo.noteId) : undefined}
      // Only the person who wrote a note can edit or delete it.
      onEdit={note.authorId === user.id ? () => onEdit(note) : undefined}
      onDelete={note.authorId === user.id ? () => setConfirm({ kind: 'delete', id: note.id }) : undefined}
    />
  );

  const pinnedNote = thread.pin ? find(thread.pin.id) : null;
  const pinned = pinnedNote ? <PinnedNote by={thread.pin.by}>{renderNote(pinnedNote, 'pin')}</PinnedNote> : null;
  // Render just before the scroller: the pinned note held at the top once its copy scrolls away.
  const sticky = (
    <StickyPinnedNote
      note={pinnedNote}
      scrollRef={scrollRef}
      onGoTo={() => scrollToNote(pinnedNote.id)}
      onReply={() => onReply(pinnedNote)}
    />
  );

  const dialogs = (
    <>
      {confirm?.kind === 'pin' && (
        <NoteConfirm
          title="Replace pinned note?"
          text="Only one note can be pinned. Replace the note that’s already pinned?"
          confirmLabel="Replace"
          onClose={() => setConfirm(null)}
          onConfirm={() => { pin(confirm.id); setConfirm(null); }}
        />
      )}
      {confirm?.kind === 'delete' && (
        <NoteConfirm
          title="Delete this note?"
          text="This note will be removed from the conversation."
          confirmLabel="Delete"
          icon="delete"
          danger
          onClose={() => setConfirm(null)}
          onConfirm={() => { remove(confirm.id); setConfirm(null); }}
        />
      )}
    </>
  );

  return { notes: thread.notes, add, edit, find, renderNote, pinned, sticky, dialogs, scrollToNote };
}
