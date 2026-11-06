import React, { useState, useEffect } from 'react';
import './ConversationDetail.css';
import ReplySection from './ReplySection';
import ConversationMenu, { VIEW_ONLY_NOTES } from './ConversationMenu';
// The Note icon from Figma (Activity - Notes › 12:24260), used as it is.
import noteIcon from '../assets/icons/note.svg';
import { Icon } from '../../icons/Icon';
import { useCurrentUser } from '../CurrentUser';
import { useEmailNotes } from '../EmailNotesStore';
import { groupActivity, seedActivity } from './notes/threadTimeline';
import { useConversationFields } from '../ConversationFields';
import { ActivityGroup, NoteCard, NoteComposer, NoteConfirm, PinnedNote, StickyPinnedNote, formatNoteTime } from './notes/EmailNotes';

// Icons
import titleUnread from '../assets/icons/title-unreaed.svg';
import titleMailbox from '../assets/icons/title-mailbox.svg';
import titlePrint from '../assets/icons/title-print.svg';
import titleAi from '../assets/icons/title-ai.svg';
import replyIcon from '../assets/icons/reply.svg';
import replyAllIcon from '../assets/icons/reply-all.svg';
import forwardIcon from '../assets/icons/forward.svg';
import kebabIcon from '../assets/icons/kebab-menu.svg';
import smallReplyIcon from '../assets/icons/small-reply.svg';
import smallForwardIcon from '../assets/icons/small-forward.svg';
import chevronDownIcon from '../assets/icons/s-chevron-down.svg';

// Every email thread starts with one note from Michael after the first message, then any notes the
// conversation's data has (each with `after`, the id of the message it follows).
const seedNotes = (conversation) => [{
  id: `seed-${conversation.id}`,
  after: conversation.messages[0]?.id,
  authorId: 'michael',
  author: 'Michael Scott',
  initial: 'M',
  color: 'red',
  time: conversation.messages[0]?.time,
  body: "Checked their account: this looks related to last week's billing change. @Jim Halpert can you confirm before we reply?",
}, ...(conversation.notes ?? [])];

// The ⋮ menu at the top right of an email (only "Reply", "Reply all" and "View only notes" do something here).
const EMAIL_MENU = [
  { value: 'reply', label: 'Reply', icon: 'reply' },
  { value: 'reply-all', label: 'Reply all', icon: 'replyall' },
  { value: 'forward', label: 'Forward', icon: 'forward' },
  { value: 'print', label: 'Print', icon: 'print' },
  { value: 'download', label: 'Download Message', icon: 'download' },
  { value: 'unread', label: 'Mark as unread', icon: 'markasunread' },
  VIEW_ONLY_NOTES,
  { value: 'delete', label: 'Delete conversation', icon: 'delete' },
];

const releaseFiles = (files) => files?.forEach((f) => URL.revokeObjectURL(f.url));

const ConversationDetail = ({ conversation, signatures, setSignatures, defaultSignatureId }) => {
  const { user } = useCurrentUser();
  const [expandedIds, setExpandedIds] = useState([]);
  const [activeReplyId, setActiveReplyId] = useState(null);
  // Notes per conversation, shared by Michael and Jim.
  const { threads, setThreads } = useEmailNotes();
  // Changes made in the right panel, logged as activity rows.
  const { activityOf } = useConversationFields();
  const [openNoteIds, setOpenNoteIds] = useState({});
  const [composer, setComposer] = useState(null); // { mode: 'new' | 'reply' | 'edit', noteId? }
  const [confirm, setConfirm] = useState(null); // { kind: 'pin' | 'delete', id }
  const [highlightId, setHighlightId] = useState(null);
  const scrollRef = React.useRef(null);
  const highlightTimer = React.useRef(0);

  // "View only notes" in the ⋮ menu: the thread shows its notes alone, without messages or activity.
  const [onlyNotes, setOnlyNotes] = useState(false);

  useEffect(() => {
    if (conversation && conversation.messages.length > 0) {
      setOnlyNotes(false);
      setExpandedIds([conversation.messages[0].id]);
      setActiveReplyId(null);
      setComposer(null);
      setConfirm(null);
    }
  }, [conversation]);

  const convoId = conversation ? String(conversation.id) : null;
  const thread = (convoId && threads[convoId]) || (conversation ? { notes: seedNotes(conversation), pin: null } : null);
  const updateThread = (fn) => setThreads((all) => ({ ...all, [convoId]: fn(all[convoId] || { notes: seedNotes(conversation), pin: null }) }));
  const findNote = (id) => thread?.notes.find((n) => n.id === id);

  const scrollToBottom = () => requestAnimationFrame(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  });

  // A change made in the right panel scrolls the thread down to its new activity row.
  const activityCount = convoId ? activityOf(convoId).length : 0;
  const seenActivity = React.useRef({ convoId, count: activityCount });
  useEffect(() => {
    const seen = seenActivity.current;
    if (seen.convoId === convoId && activityCount > seen.count) scrollToBottom();
    seenActivity.current = { convoId, count: activityCount };
  }, [convoId, activityCount]);

  const openComposer = (next) => {
    setComposer(next);
    setActiveReplyId(null);
    if (next.mode !== 'edit') scrollToBottom();
  };

  const submitNote = ({ body, attachments }) => {
    if (composer.mode === 'edit') {
      updateThread((t) => ({
        ...t,
        notes: t.notes.map((n) => {
          if (n.id !== composer.noteId) return n;
          n.attachments?.forEach((f) => { if (!attachments.includes(f)) URL.revokeObjectURL(f.url); });
          const same = n.body === body && (n.attachments ?? []).map((f) => f.id).join() === attachments.map((f) => f.id).join();
          return same ? n : { ...n, body, attachments: attachments.length ? attachments : undefined, edited: true };
        }),
      }));
    } else {
      const replyTo = composer.mode === 'reply' ? findNote(composer.noteId) : null;
      const note = {
        id: `note-${Date.now()}`,
        authorId: user.id,
        author: user.name,
        initial: user.name.charAt(0),
        color: user.color,
        time: formatNoteTime(),
        at: Date.now(),
        body,
        attachments: attachments.length ? attachments : undefined,
        replyTo: replyTo ? { noteId: replyTo.id, authorId: replyTo.authorId, author: replyTo.author, body: replyTo.body } : undefined,
      };
      updateThread((t) => ({ ...t, notes: [...t.notes, note] }));
      scrollToBottom();
    }
    setComposer(null);
  };

  const deleteNote = (id) => {
    if (composer?.noteId === id) setComposer(null);
    releaseFiles(findNote(id)?.attachments);
    updateThread((t) => ({ notes: t.notes.filter((n) => n.id !== id), pin: t.pin?.id === id ? null : t.pin }));
  };

  const pinNote = (id) => {
    updateThread((t) => ({ ...t, pin: { id, by: { id: user.id, name: user.name } } }));
    requestAnimationFrame(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; });
  };

  // Only one note can be pinned: pinning another asks first.
  const togglePin = (id) => {
    if (thread.pin?.id === id) updateThread((t) => ({ ...t, pin: null }));
    else if (thread.pin) setConfirm({ kind: 'pin', id });
    else pinNote(id);
  };

  const scrollToNote = (id) => {
    if (!findNote(id)) return;
    setOpenNoteIds((o) => ({ ...o, [`feed-${id}`]: true }));
    window.clearTimeout(highlightTimer.current);
    setHighlightId(id);
    highlightTimer.current = window.setTimeout(() => setHighlightId((cur) => (cur === id ? null : cur)), 1400);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.getElementById(`email-note-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }));
  };

  const renderNote = (note, copy = 'feed') => (
    <NoteCard
      key={`${copy}-${note.id}`}
      note={note}
      elementId={copy === 'pin' ? `email-note-${note.id}-pin` : `email-note-${note.id}`}
      // The pinned copy and the note in the thread open and close on their own.
      // A reply to a note opens by default; other notes start closed.
      expanded={openNoteIds[`${copy}-${note.id}`] ?? !!note.replyTo}
      pinned={thread.pin?.id === note.id}
      highlighted={highlightId === note.id}
      onToggle={() => setOpenNoteIds((o) => ({ ...o, [`${copy}-${note.id}`]: !(o[`${copy}-${note.id}`] ?? !!note.replyTo) }))}
      onPin={() => togglePin(note.id)}
      onReply={() => openComposer({ mode: 'reply', noteId: note.id })}
      onQuoteClick={note.replyTo ? () => scrollToNote(note.replyTo.noteId) : undefined}
      // Only the person who wrote a note can edit or delete it.
      onEdit={note.authorId === user.id ? () => openComposer({ mode: 'edit', noteId: note.id }) : undefined}
      onDelete={note.authorId === user.id ? () => setConfirm({ kind: 'delete', id: note.id }) : undefined}
    />
  );

  const toggleExpand = (id) => {
    setExpandedIds(prev => 
      prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
    );
  };

  const handleReplyAll = (e, id) => {
    e.stopPropagation();
    setActiveReplyId(prev => prev === id ? null : id);
  };

  if (!conversation) return <div className="conversation-detail">Select a conversation</div>;

  const activity = seedActivity({
    id: conversation.id,
    firstTime: conversation.messages[0]?.time,
    lastTime: conversation.messages[conversation.messages.length - 1]?.time,
  });
  const lastIndex = conversation.messages.length - 1;
  const seeds = seedNotes(conversation);
  const seedIds = new Set(seeds.map((n) => n.id));
  // Which message each seeded note follows (looked up here, so an edited note keeps its place).
  const seedAfter = new Map(seeds.map((n) => [n.id, n.after]));
  // New notes and right-panel activity, in the order they happened (all after the last message).
  const later = [
    ...thread.notes.filter((n) => !seedIds.has(n.id)).map((n) => ({ kind: 'note', at: n.at ?? 0, note: n })),
    ...activityOf(conversation.id).map((row) => ({ kind: 'activity', at: row.at, row })),
  ].sort((a, b) => a.at - b.at);
  const asActivity = (rows) => rows.map((row) => ({ kind: 'activity', row }));

  /**
   * What follows message `index`, grouped as Front does: every activity event between two messages or
   * notes goes into one group, however far apart in time. A message or a note always ends the group.
   */
  const itemsAfter = (index) => {
    const items = [];
    if (index === 0) items.push(...asActivity(activity.first));
    const msgId = conversation.messages[index].id;
    items.push(...thread.notes.filter((n) => seedIds.has(n.id) && (seedAfter.get(n.id) ?? conversation.messages[0].id) === msgId).map((note) => ({ kind: 'note', note })));
    if (index === lastIndex) items.push(...asActivity(activity.last), ...later);
    return groupActivity(items);
  };
  const pinned = thread.pin ? findNote(thread.pin.id) : null;

  return (
    <div className="conversation-detail">
      {/* Upper Bar */}
      <div className="detail-header">
        <div className="header-left">
          <button className="icon-btn">
             <img src={titleUnread} alt="Unread" width="16" height="16" />
          </button>
          <button className="icon-btn">
             <img src={titleMailbox} alt="Mailbox" width="16" height="16" />
          </button>
          <button className="icon-btn">
             <img src={titlePrint} alt="Print" width="16" height="16" />
          </button>
          <button className="icon-btn">
             <img src={titleAi} alt="AI" width="16" height="16" />
          </button>
        </div>
      </div>

      {/* Subject Bar (stays put; the thread scrolls under it) */}
      <div className="subject-bar-detail">
        <h1 className="subject-text-large">{conversation.subject}</h1>
        <div className="subject-actions">
           <button className="icon-btn" onClick={(e) => handleReplyAll(e, expandedIds[0] || (conversation.messages.length > 0 ? conversation.messages[0].id : null))}>
             <img src={replyIcon} alt="Reply" width="16" height="16" />
           </button>
           <button className="icon-btn" onClick={(e) => handleReplyAll(e, expandedIds[0])}>
             <img src={replyAllIcon} alt="Reply All" width="16" height="16" />
           </button>
           <button className="icon-btn">
             <img src={forwardIcon} alt="Forward" width="16" height="16" />
           </button>
           <ConversationMenu
             options={EMAIL_MENU}
             onlyNotes={onlyNotes}
             onSelect={(value) => {
               const last = conversation.messages[conversation.messages.length - 1]?.id;
               if (value === VIEW_ONLY_NOTES.value) setOnlyNotes((on) => !on);
               else if (value === 'reply' || value === 'reply-all') setActiveReplyId(last);
             }}
           />
        </div>
      </div>
      {/* The pinned note stays at the top once it scrolls out of view */}
      <StickyPinnedNote
        note={pinned}
        scrollRef={scrollRef}
        onGoTo={() => scrollToNote(pinned.id)}
        onReply={() => openComposer({ mode: 'reply', noteId: pinned.id })}
      />
      {/* Scrollable Area */}
      <div className="detail-scroll-area" ref={scrollRef}>
        {/* Messages Container */}
        <div className="messages-container">
          {pinned && <PinnedNote by={thread.pin.by}>{renderNote(pinned, 'pin')}</PinnedNote>}
          {onlyNotes && (thread.notes.length
            ? thread.notes.map((n) => renderNote(n))
            : <p className="en-notes-empty">No notes in this conversation yet.</p>)}
          {!onlyNotes && conversation.messages.map((msg, index) => {
            const isExpanded = expandedIds.includes(msg.id);
            const isReplying = activeReplyId === msg.id;
   
            return (
              <React.Fragment key={msg.id}>
                {isReplying && (
                  <ReplySection 
                    recipientEmail={msg.email} 
                    signatures={signatures}
                    setSignatures={setSignatures}
                    defaultSignatureId={defaultSignatureId}
                    currentInbox={conversation.inbox}
                    onDiscard={(e) => {
                      e.stopPropagation();
                      setActiveReplyId(null);
                    }}
                  />
                )}
                
                {isExpanded ? (
                  <div className="convo-card">
                    <div className="convo-card-header">
                      <div className="convo-avatar" style={{ backgroundColor: msg.avatarColor }}>
                        <span>{msg.initial}</span>
                      </div>
                      <div className="convo-info" onClick={() => toggleExpand(msg.id)} style={{ cursor: 'pointer' }}>
                        <h3 className="convo-email">{msg.email}</h3>
                        <div className="convo-to">
                          To: support@acme.com <img src={chevronDownIcon} alt="Expand" width="14" height="14" style={{ marginLeft: 4 }} />
                        </div>
                      </div>
                      <div className="header-actions-right">
                        <span className="convo-time">{msg.time}</span>
                        <button className="icon-btn" onClick={(e) => handleReplyAll(e, msg.id)}>
                           <img src={replyAllIcon} alt="Reply All" width="16" height="16" />
                        </button>
                        <button className="icon-btn">
                           <img src={kebabIcon} alt="More" width="16" height="16" />
                        </button>
                      </div>
                    </div>
                    <div className="convo-body">
                      {msg.body.split('\n').map((line, i) => (
                        <React.Fragment key={i}>
                          {line}<br />
                        </React.Fragment>
                      ))}
                    </div>
                    <button className="btn-more-content">...</button>
                    <div className="convo-actions">
                      <button className="convo-btn" onClick={(e) => handleReplyAll(e, msg.id)}>
                        <img src={smallReplyIcon} alt="" width="14" height="14" /> Reply
                      </button>
                      <button className="convo-btn">
                        <img src={smallForwardIcon} alt="" width="14" height="14" /> Forward
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="convo-card-collapsed" onClick={() => toggleExpand(msg.id)}>
                    <div className="convo-avatar" style={{ backgroundColor: msg.avatarColor }}>
                      <span>{msg.initial}</span>
                    </div>
                    <div className="convo-info">
                      <h3 className="convo-email">{msg.email}</h3>
                      <p className="collapsed-text">{msg.body.substring(0, 80)}...</p>
                    </div>
                    <span className="convo-time">{msg.time}</span>
                  </div>
                )}

                {itemsAfter(index).map((item) => (item.kind === 'note'
                  ? renderNote(item.note)
                  : <ActivityGroup key={item.key} rows={item.rows} />))}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {composer ? (
        <NoteComposer
          key={`${composer.mode}-${composer.noteId ?? 'new'}`}
          editing={composer.mode === 'edit' ? findNote(composer.noteId) : undefined}
          replyTo={composer.mode === 'reply' ? findNote(composer.noteId) : undefined}
          onQuoteClick={() => scrollToNote(composer.noteId)}
          onSubmit={submitNote}
          onCancel={() => setComposer(null)}
        />
      ) : (
        <div className="en-footer">
          <button type="button" className="en-footer__btn" onClick={(e) => handleReplyAll(e, conversation.messages[lastIndex]?.id)}><Icon name="reply" size={16} />Reply</button>
          <button type="button" className="en-footer__btn" onClick={() => openComposer({ mode: 'new' })}><img src={noteIcon} alt="" />Add note</button>
        </div>
      )}

      {confirm?.kind === 'pin' && (
        <NoteConfirm
          title="Replace pinned note?"
          text="Only one note can be pinned. Replace the note that’s already pinned?"
          confirmLabel="Replace"
          onClose={() => setConfirm(null)}
          onConfirm={() => { pinNote(confirm.id); setConfirm(null); }}
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
          onConfirm={() => { deleteNote(confirm.id); setConfirm(null); }}
        />
      )}
    </div>
  );
};

export default ConversationDetail;
