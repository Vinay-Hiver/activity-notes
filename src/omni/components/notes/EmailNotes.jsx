import React from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../../icons/Icon';
import { EyeOff } from '../../../icons/EyeOff';
import { USERS, useCurrentUser } from '../../CurrentUser';
import { useModalExit } from '../modalMotion';
import '../modalMotion.css';
import './EmailNotes.css';

// Notes and activity in the email thread itself (ported from the "Omni Notes & Activity" prototype):
// - Activity rows sit between the messages; a group of more than one shows "+N more".
// - Notes are cards between the messages. A note opens and closes on click; on hover it shows
//   Pin, Reply, Edit and Delete. One note can be pinned: it is copied to the top of the thread.
// - "Add note" swaps the footer for a composer with @mentions and attachments.

const MENTION_USERS = [
  { id: 'all', name: '@all', description: 'Notify all users', initial: '@', color: 'lightBlue', insert: 'all' },
  ...USERS.map((u) => ({ id: u.id, name: u.name, description: u.email, initial: u.name.charAt(0), color: u.color, insert: u.name })),
];

const MENTION_TOKENS = MENTION_USERS.map((u) => `@${u.insert}`).sort((a, b) => b.length - a.length);
const MENTION_PATTERN = new RegExp(`(${MENTION_TOKENS.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');

export function formatNoteTime(date = new Date()) {
  const day = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return `${day}, ${time}`;
}

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const toAttachments = (files) => Array.from(files).map((file) => ({
  id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name: file.name,
  size: file.size,
  url: URL.createObjectURL(file),
  isImage: file.type.startsWith('image/'),
}));

/** The "@query" being typed just before the caret, or null. */
function getMentionQuery(text, caret) {
  const before = text.slice(0, caret);
  const at = before.lastIndexOf('@');
  if (at < 0) return null;
  const prev = at === 0 ? ' ' : before[at - 1];
  if (prev && !/\s/.test(prev)) return null;
  const query = before.slice(at + 1);
  if (/\s/.test(query)) return null;
  return { start: at, query };
}

function MentionText({ text }) {
  MENTION_PATTERN.lastIndex = 0;
  return text.split(MENTION_PATTERN).map((part, i) =>
    MENTION_TOKENS.includes(part) ? <span key={i} className="en-mention">{part}</span> : part
  );
}

const stop = (e) => e.stopPropagation();

/**
 * A person as the viewer reads them: "You" (or "you" mid-sentence) for themselves, their name for anyone else.
 * `person` is { id, name }.
 */
export const personLabel = (person, viewerId, { start = false } = {}) => {
  if (person?.id !== viewerId) return person?.name;
  return start ? 'You' : 'you';
};

/**
 * An activity row's sentence for this viewer. A row is either plain `text`, or
 * [actor] verb [object] suffix, where actor and object are people ({ id, name }).
 */
export function activityText(row, viewerId) {
  if (row.text) return row.text;
  const words = [];
  if (row.actor) words.push(personLabel(row.actor, viewerId, { start: true }));
  words.push(words.length ? row.verb : row.verb.charAt(0).toUpperCase() + row.verb.slice(1));
  if (row.object) words.push(personLabel(row.object, viewerId));
  if (row.suffix) words.push(row.suffix);
  return words.join(' ');
}

/** The 32px avatar used in the reference prototype (the HOT Avatar is 24px). */
const NoteAvatar = ({ initial, color }) => <span className={`en-avatar en-avatar--${color || 'grey'}`}>{initial}</span>;

/** A 20px (actions) or 28px (composer tools) icon button, as in the reference prototype. */
const IconBtn = ({ className = '', ...props }) => <button type="button" className={`en-icon-btn ${className}`} {...props} />;

/* ---------- Activity ---------- */

/**
 * A group of activity rows (each icon is a HOT icon name or an element). More than one collapses to
 * one row and "+N more": the first row, or with `latest` the newest (used for changes just made).
 */
export function ActivityGroup({ rows, latest }) {
  const { user } = useCurrentUser();
  const [open, setOpen] = React.useState(false);
  const shown = open ? rows : latest ? rows.slice(-1) : rows.slice(0, 1);
  return (
    <div className="en-activity">
      {shown.map((row, i) => (
        <div key={i} className="en-activity__row">
          {typeof row.icon === 'string' ? <Icon name={row.icon} size={14} /> : row.icon}
          <p>{activityText(row, user.id)}</p>
          <span className="en-activity__time">{row.time}</span>
        </div>
      ))}
      {rows.length > 1 && (
        <button type="button" className="en-activity__more" onClick={() => setOpen((o) => !o)}>
          {open ? 'show less' : `+${rows.length - 1} more`}
        </button>
      )}
    </div>
  );
}

/* ---------- Note card ---------- */

function NoteQuote({ author, body, onClick }) {
  return (
    <button type="button" className="en-quote" aria-label={`Quoted note from ${author}`} onClick={(e) => { e.stopPropagation(); onClick?.(); }}>
      <span className="en-quote__bar" />
      <span className="en-quote__text"><MentionText text={body} /></span>
    </button>
  );
}

function AttachmentChip({ file, onRemove }) {
  return (
    <div className="en-attach" onClick={stop}>
      <button type="button" className="en-attach__open" title={file.name} onClick={(e) => { e.preventDefault(); window.open(file.url, '_blank', 'noopener'); }}>
        {file.isImage
          ? <img className="en-attach__thumb" src={file.url} alt="" />
          : <span className="en-attach__icon"><Icon name="attachment" size={16} /></span>}
        <span className="en-attach__copy">
          <span className="en-attach__name">{file.name}</span>
          <span className="en-attach__size">{formatFileSize(file.size)}</span>
        </span>
      </button>
      {onRemove && (
        <button type="button" className="en-attach__remove" aria-label={`Remove ${file.name}`} onClick={onRemove}>
          <Icon name="close" size={14} />
        </button>
      )}
    </div>
  );
}

function NoteHeading({ note }) {
  const { user } = useCurrentUser();
  return (
    <div className="en-note__heading">
      <span className="en-note__name">{personLabel({ id: note.authorId, name: note.author }, user.id, { start: true })}</span>
      <span className="en-note__action">{note.replyTo ? 'replied to' : 'added a note'}</span>
      {note.replyTo && <span className="en-note__name">{personLabel({ id: note.replyTo.authorId, name: note.replyTo.author }, user.id)}</span>}
    </div>
  );
}

function NoteActions({ pinned, onPin, onReply, onEdit, onDelete }) {
  return (
    <div className="en-note__actions" onClick={stop} onKeyDown={stop}>
      <IconBtn aria-label={pinned ? 'Unpin' : 'Pin to top'} aria-pressed={pinned} title={pinned ? 'Unpin' : 'Pin to top'} className={pinned ? 'is-pinned' : ''} onClick={onPin}>
        <Icon name="pin" size={14} />
      </IconBtn>
      <IconBtn aria-label="Reply" title="Reply" onClick={onReply}><Icon name="reply" size={14} /></IconBtn>
      {/* Edit and Delete only show on your own notes (no handler is passed for anyone else's). */}
      {onEdit && <IconBtn aria-label="Edit" title="Edit" onClick={onEdit}><Icon name="edit" size={14} /></IconBtn>}
      {onDelete && <IconBtn aria-label="Delete" title="Delete" onClick={onDelete}><Icon name="delete" size={14} /></IconBtn>}
    </div>
  );
}

export function NoteCard({ note, elementId, expanded, pinned, highlighted, onToggle, onPin, onReply, onQuoteClick, onEdit, onDelete }) {
  const actions = <NoteActions pinned={pinned} onPin={onPin} onReply={onReply} onEdit={onEdit} onDelete={onDelete} />;
  return (
    <article
      id={elementId}
      className={`en-note${expanded ? ' is-open' : ''}${highlighted ? ' is-target' : ''}`}
      onClick={onToggle}
      onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onToggle(); } }}
      tabIndex={0}
      aria-expanded={expanded}
    >
      {expanded ? (
        <>
          <div className="en-note__top">
            <NoteAvatar initial={note.initial} color={note.color} />
            <NoteHeading note={note} />
            {actions}
            <span className="en-note__time">{note.time}</span>
          </div>
          {note.replyTo && <NoteQuote author={note.replyTo.author} body={note.replyTo.body} onClick={onQuoteClick} />}
          {note.body && (
            <p className="en-note__text is-open">
              <MentionText text={note.body} />
              {note.edited && <span className="en-note__edited"> (edited)</span>}
            </p>
          )}
          {note.attachments?.length > 0 && (
            <div className="en-attach-list">{note.attachments.map((f) => <AttachmentChip key={f.id} file={f} />)}</div>
          )}
          <div className="en-note__hidden"><EyeOff size={14} />Not visible to customers</div>
        </>
      ) : (
        <>
          <NoteAvatar initial={note.initial} color={note.color} />
          <div className="en-note__collapsed">
            <div className="en-note__top">
              <NoteHeading note={note} />
              {actions}
              <span className="en-note__time">{note.time}</span>
            </div>
            <p className="en-note__text">
              {note.body ? <MentionText text={note.body} /> : note.attachments?.[0]?.name}
              {note.attachments?.length > 0 && (
                <span className="en-note__attach-count"><Icon name="attachment" size={14} />{note.attachments.length > 1 ? note.attachments.length : null}</span>
              )}
            </p>
          </div>
        </>
      )}
    </article>
  );
}

/** A note copied to the top of the thread, with who pinned it (`by` is { id, name }). */
export function PinnedNote({ by, children }) {
  const { user } = useCurrentUser();
  return (
    <div className="en-pinned">
      <p className="en-pinned__by"><Icon name="pin" size={14} />Pinned by {personLabel(by, user.id)}</p>
      {children}
    </div>
  );
}

/* ---------- Composer ---------- */

/**
 * The note composer that replaces the footer. `editing` is the note being edited, `replyTo` the
 * note being replied to (or neither for a new note). Calls onSubmit({ body, attachments }).
 */
export function NoteComposer({ editing, replyTo, onSubmit, onCancel, onQuoteClick }) {
  const { user } = useCurrentUser();
  const [draft, setDraft] = React.useState(editing?.body ?? '');
  const [caret, setCaret] = React.useState(editing?.body.length ?? 0);
  const [attachments, setAttachments] = React.useState(editing?.attachments ? [...editing.attachments] : []);
  const [mentionOpen, setMentionOpen] = React.useState(false);
  const [mentionIndex, setMentionIndex] = React.useState(0);
  const [dropping, setDropping] = React.useState(false);
  const [dropZone, setDropZone] = React.useState(false);
  const fieldRef = React.useRef(null);
  const menuRef = React.useRef(null);
  const skipSync = React.useRef(false);
  const original = React.useMemo(() => new Set((editing?.attachments ?? []).map((f) => f.id)), [editing]);

  React.useEffect(() => {
    const field = fieldRef.current;
    field?.focus();
    if (field) field.setSelectionRange(field.value.length, field.value.length);
  }, []);

  React.useEffect(() => {
    if (!mentionOpen) return undefined;
    const onDown = (e) => {
      if (menuRef.current?.contains(e.target) || e.target === fieldRef.current || e.target.closest?.('[aria-label="Mention"]')) return;
      setMentionOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [mentionOpen]);

  // Files added in this composer that were not kept are released when it closes.
  const releaseUnsaved = (keep = []) => attachments.forEach((f) => { if (!original.has(f.id) && !keep.includes(f)) URL.revokeObjectURL(f.url); });

  const addFiles = (files) => {
    const next = toAttachments(files);
    if (next.length) { setAttachments((cur) => [...cur, ...next]); setDropZone(false); }
  };
  const removeFile = (id) => setAttachments((cur) => {
    const target = cur.find((f) => f.id === id);
    if (target && !original.has(id)) URL.revokeObjectURL(target.url);
    return cur.filter((f) => f.id !== id);
  });

  const query = getMentionQuery(draft, caret);
  const matches = MENTION_USERS.filter((u) => {
    if (!query?.query) return true;
    const q = query.query.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.description.toLowerCase().includes(q);
  });

  const setDraftCaret = (value, next, openMenu = true) => {
    setDraft(value);
    setCaret(next);
    const q = getMentionQuery(value, next);
    setMentionOpen(openMenu && !!q);
    if (q) setMentionIndex(0);
    requestAnimationFrame(() => {
      const field = fieldRef.current;
      if (field) { field.focus(); field.setSelectionRange(next, next); }
      skipSync.current = false;
    });
  };

  const syncMention = (field) => {
    if (skipSync.current) return;
    const pos = field.selectionStart ?? field.value.length;
    setCaret(pos);
    const q = getMentionQuery(field.value, pos);
    setMentionOpen(!!q);
    if (q) setMentionIndex(0);
  };

  const insertMention = (user) => {
    const pos = fieldRef.current?.selectionStart ?? caret;
    const q = getMentionQuery(draft, pos);
    const start = q ? q.start : pos;
    const token = `@${user.insert} `;
    skipSync.current = true;
    setDraftCaret(draft.slice(0, start) + token + draft.slice(pos), start + token.length, false);
  };

  const openMentionPicker = () => {
    const field = fieldRef.current;
    const pos = field?.selectionStart ?? draft.length;
    const end = field?.selectionEnd ?? pos;
    if (getMentionQuery(draft, pos)) { field?.focus(); setMentionOpen(true); setMentionIndex(0); return; }
    const insert = `${pos > 0 && !/\s/.test(draft[pos - 1] ?? '') ? ' ' : ''}@`;
    setDraftCaret(draft.slice(0, pos) + insert + draft.slice(end), pos + insert.length);
  };

  const canSubmit = draft.trim().length > 0 || attachments.length > 0;
  const submit = () => {
    if (!canSubmit) return;
    releaseUnsaved(attachments);
    onSubmit({ body: draft.trim(), attachments });
  };
  const cancel = () => { releaseUnsaved(); onCancel(); };

  const onKeyDown = (e) => {
    if (mentionOpen && matches.length) {
      if (e.key === 'Escape') { e.preventDefault(); setMentionOpen(false); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex((i) => Math.min(i + 1, matches.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex((i) => Math.max(i - 1, 0)); return; }
      if ((e.key === 'Enter' && !e.metaKey && !e.ctrlKey) || e.key === 'Tab') { e.preventDefault(); insertMention(matches[mentionIndex] ?? matches[0]); return; }
    }
    if (e.key === 'Escape') { e.preventDefault(); cancel(); return; }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); }
  };

  const replyName = replyTo && (replyTo.authorId === user.id ? 'your note' : replyTo.author);
  const label = editing ? 'Edit note' : replyTo ? `Reply to ${replyName}` : 'Add internal note';

  return (
    <div className="en-composer-wrap">
      {mentionOpen && matches.length > 0 && (
        <div className="en-mentions" role="listbox" aria-label="Mention people" ref={menuRef}>
          {matches.map((u, i) => (
            <button
              key={u.id}
              type="button"
              role="option"
              aria-selected={i === mentionIndex}
              className={`en-mentions__item${i === mentionIndex ? ' is-active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setMentionIndex(i)}
              onClick={() => insertMention(u)}
            >
              <NoteAvatar initial={u.initial} color={u.color} />
              <span className="en-mentions__copy">
                <span className="en-mentions__name">{u.name}</span>
                <span className="en-mentions__desc">{u.description}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      <form
        className={`en-composer${dropping ? ' is-drop' : ''}`}
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        onDragOver={(e) => { e.preventDefault(); setDropping(true); }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDropping(false); }}
        onDrop={(e) => { e.preventDefault(); setDropping(false); addFiles(e.dataTransfer.files); }}
      >
        {replyTo && <NoteQuote author={replyTo.author} body={replyTo.body} onClick={onQuoteClick} />}
        <div className="en-composer__field">
          {/* The textarea's text is transparent; this copy under it colours the @mentions. */}
          <div className="en-composer__highlight" aria-hidden="true">{draft ? <MentionText text={draft} /> : ' '}</div>
          <textarea
            ref={fieldRef}
            className="en-composer__input"
            placeholder={label}
            aria-label={label}
            value={draft}
            rows={2}
            onChange={(e) => { setDraft(e.currentTarget.value); syncMention(e.currentTarget); }}
            onKeyUp={(e) => syncMention(e.currentTarget)}
            onClick={(e) => syncMention(e.currentTarget)}
            onKeyDown={onKeyDown}
            onPaste={(e) => { if (e.clipboardData?.files?.length) { e.preventDefault(); addFiles(e.clipboardData.files); } }}
            aria-autocomplete="list"
            aria-expanded={mentionOpen}
          />
        </div>
        {(dropZone || dropping) && (
          <label className={`en-composer__drop${dropping ? ' is-active' : ''}`}>
            <input type="file" className="en-file-input" multiple onChange={(e) => { const files = Array.from(e.target.files ?? []); e.target.value = ''; addFiles(files); }} />
            <Icon name="attachment" size={16} />
            <span>{dropping ? 'Drop files to attach' : 'Drop files here or click to browse'}</span>
          </label>
        )}
        {attachments.length > 0 && (
          <div className="en-attach-list">{attachments.map((f) => <AttachmentChip key={f.id} file={f} onRemove={() => removeFile(f.id)} />)}</div>
        )}
        <div className="en-composer__bar">
          <IconBtn aria-label="Attach file" className={`en-icon-btn--tool${attachments.length || dropZone ? ' is-active' : ''}`} onClick={() => setDropZone(true)}>
            <Icon name="attachment" size={16} />
          </IconBtn>
          {/* No "@" icon in the HOT set, so the button shows the character. */}
          <IconBtn aria-label="Mention" aria-haspopup="listbox" aria-expanded={mentionOpen} className={`en-icon-btn--tool${mentionOpen ? ' is-active' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={openMentionPicker}>
            <span className="en-composer__at">@</span>
          </IconBtn>
          <IconBtn aria-label="Emoji" className="en-icon-btn--tool"><Icon name="emoji" size={16} /></IconBtn>
          <span className="en-composer__spacer" />
          <button type="button" className="en-btn en-btn--cancel" onClick={cancel}>Cancel</button>
          <button type="submit" className="en-btn en-btn--add" disabled={!canSubmit}>{editing ? 'Save' : replyTo ? 'Reply' : 'Add'}</button>
        </div>
      </form>
    </div>
  );
}

/* ---------- Confirm dialogs ---------- */

/** A small confirm dialog (Replace pinned note, Delete note), styled as in the reference prototype. */
export function NoteConfirm({ title, text, confirmLabel, danger, onConfirm, onClose }) {
  const [closing, exit] = useModalExit();
  const close = () => exit(onClose);
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [close]);
  return createPortal(
    <div className={`lc-backdrop${closing ? ' is-closing' : ''}`} onClick={close}>
      <div className="en-dialog" role="dialog" aria-modal="true" aria-labelledby="en-dialog-title" onClick={stop}>
        <h3 id="en-dialog-title">{title}</h3>
        <p>{text}</p>
        <div className="en-dialog__actions">
          <button type="button" className="en-btn en-btn--cancel" onClick={close}>Cancel</button>
          <button type="button" className={`en-btn ${danger ? 'en-btn--danger' : 'en-btn--add'}`} onClick={() => exit(onConfirm)}>{confirmLabel}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
