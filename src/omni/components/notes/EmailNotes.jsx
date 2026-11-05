import React from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../../../components/Button';
import { Modal, ModalText } from '../../../components/Modal';
import { Tooltip } from '../../../components/Tooltip';
import { Icon } from '../../../icons/Icon';
// The Mention icon from Figma (Activity - Notes › 21:5693), used as it is.
import mentionIcon from '../../assets/icons/mention.svg';
import { USERS, useCurrentUser } from '../../CurrentUser';
import { useModalExit } from '../modalMotion';
import { downloadAsZip } from '../../utils/zip';
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

export const toAttachments = (files) => Array.from(files).map((file) => ({
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
 * A person as the viewer reads them: "You" at the start of a sentence (or "you" mid-sentence) for
 * themselves, their name for anyone else. `person` is { id, name }.
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

// How a group sums up each kind of event, for `n` events of that kind.
const SUMMARY_BY_KIND = {
  'tag-add': (n) => (n === 1 ? '1 tag added' : `${n} tags added`),
  'tag-remove': (n) => (n === 1 ? '1 tag removed' : `${n} tags removed`),
  status: (n) => (n === 1 ? 'Status changed' : `Status changed ${n} times`),
  assignee: (n) => (n === 1 ? 'Assignee changed' : `Assignee changed ${n} times`),
  field: (n) => (n === 1 ? '1 custom field updated' : `${n} custom fields updated`),
  created: () => 'Conversation created',
  sla: (n) => (n === 1 ? 'SLA overdue' : `${n} SLA alerts`),
  ai: (n) => (n === 1 ? 'Topic updated by Hiver AI' : `${n} Hiver AI updates`),
};

/**
 * The folded line for a group, as in Front: the first two kinds of event with their counts
 * ("2 tags added, status changed"), and `rest`, the number of events it doesn't name.
 */
function summarize(rows) {
  const counts = [];
  rows.forEach((row) => {
    const entry = counts.find((c) => c.kind === row.kind);
    if (entry) entry.n += 1;
    else counts.push({ kind: row.kind, n: 1 });
  });
  const named = counts.slice(0, 2);
  const rest = counts.slice(2).reduce((sum, c) => sum + c.n, 0);
  const lead = named.map((c, i) => {
    const text = (SUMMARY_BY_KIND[c.kind] ?? ((n) => `${n} updates`))(c.n);
    return i === 0 ? text : text.charAt(0).toLowerCase() + text.slice(1);
  }).join(', ');
  return { lead, rest };
}

/**
 * The activity between two messages or notes (each icon is a HOT icon name or an element).
 * One event shows as its own row. More fold into a summary line with "+ N more" or "See more" under it;
 * opening it lists every event, with "See less".
 */
export function ActivityGroup({ rows }) {
  const { user } = useCurrentUser();
  const [open, setOpen] = React.useState(false);
  const row = (r) => (
    <div key={r.id} className="en-activity__row">
      {typeof r.icon === 'string' ? <Icon name={r.icon} size={14} /> : r.icon}
      <p>{activityText(r, user.id)}</p>
      <span className="en-activity__time">{r.time}</span>
    </div>
  );
  if (rows.length === 1) return <div className="en-activity">{row(rows[0])}</div>;
  if (open) {
    return (
      <div className="en-activity">
        {rows.map(row)}
        <button type="button" className="en-activity__more" onClick={() => setOpen(false)}>See less</button>
      </div>
    );
  }
  // The summary line, then the link that opens the group under it: "+ N more" for the events the
  // line doesn't name, or "See more" when it names them all.
  const { lead, rest } = summarize(rows);
  return (
    <div className="en-activity">
      <div className="en-activity__row">
        <Icon name="layering" size={14} />
        <p>{lead}</p>
        <span className="en-activity__time">{rows[rows.length - 1].time}</span>
      </div>
      <button type="button" className="en-activity__more" aria-expanded={false} onClick={() => setOpen(true)}>
        {rest > 0 ? `+${rest} more` : 'See more'}
      </button>
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

export function AttachmentChip({ file, onRemove }) {
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

/** One hover action: an icon button with its tooltip above it, centred. */
const NoteAction = ({ label, children, ...props }) => (
  <Tooltip content={label} placement="top" portal>
    <IconBtn aria-label={label} {...props}>{children}</IconBtn>
  </Tooltip>
);

function NoteActions({ pinned, attachments, onPin, onReply, onEdit, onDelete }) {
  return (
    <div className="en-note__actions" onClick={stop} onKeyDown={stop}>
      {/* With more than one file, the first action saves them all in one .zip. */}
      {attachments?.length > 1 && (
        <NoteAction label="Download all attachments" onClick={() => downloadAsZip(attachments, 'note-attachments.zip')}>
          <Icon name="download" size={14} />
        </NoteAction>
      )}
      <NoteAction label={pinned ? 'Unpin' : 'Pin to top'} aria-pressed={pinned} className={pinned ? 'is-pinned' : ''} onClick={onPin}>
        <Icon name={pinned ? 'unpin' : 'pin'} size={14} />
      </NoteAction>
      <NoteAction label="Reply" onClick={onReply}><Icon name="reply" size={14} /></NoteAction>
      {/* Edit and Delete only show on your own notes (no handler is passed for anyone else's). */}
      {onEdit && <NoteAction label="Edit" onClick={onEdit}><Icon name="edit" size={14} /></NoteAction>}
      {onDelete && <NoteAction label="Delete" onClick={onDelete}><Icon name="delete" size={14} /></NoteAction>}
    </div>
  );
}

export function NoteCard({ note, elementId, expanded, pinned, highlighted, onToggle, onPin, onReply, onQuoteClick, onEdit, onDelete }) {
  const actions = <NoteActions pinned={pinned} attachments={note.attachments} onPin={onPin} onReply={onReply} onEdit={onEdit} onDelete={onDelete} />;
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

/* ---------- @mentions (shared by the email note composer and the real-time channel composer) ---------- */

/**
 * @mention typing for a text box: typing "@" (or the Mention button) opens a list of people under the
 * caret's word; arrows move, Enter or Tab inserts "@Name ". `draft` / `setDraft` are the box's text.
 * Spread `fieldProps` on the textarea, call `handleKey(e)` first in its onKeyDown (true = handled),
 * and render `menu` inside a positioned wrapper (it sits above the composer).
 */
export function useMentions(draft, setDraft) {
  const [caret, setCaret] = React.useState(draft.length);
  const [open, setOpen] = React.useState(false);
  const [index, setIndex] = React.useState(0);
  const fieldRef = React.useRef(null);
  const menuRef = React.useRef(null);
  const skipSync = React.useRef(false);

  React.useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (menuRef.current?.contains(e.target) || e.target === fieldRef.current || e.target.closest?.('[aria-label="Mention"]')) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

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
    setOpen(openMenu && !!q);
    if (q) setIndex(0);
    requestAnimationFrame(() => {
      const field = fieldRef.current;
      if (field) { field.focus(); field.setSelectionRange(next, next); }
      skipSync.current = false;
    });
  };

  const sync = (field) => {
    if (skipSync.current) return;
    const pos = field.selectionStart ?? field.value.length;
    setCaret(pos);
    const q = getMentionQuery(field.value, pos);
    setOpen(!!q);
    if (q) setIndex(0);
  };

  const insert = (person) => {
    const pos = fieldRef.current?.selectionStart ?? caret;
    const q = getMentionQuery(draft, pos);
    const start = q ? q.start : pos;
    const token = `@${person.insert} `;
    skipSync.current = true;
    setDraftCaret(draft.slice(0, start) + token + draft.slice(pos), start + token.length, false);
  };

  /** The Mention button: starts an "@" at the caret (or reopens the list for one being typed). */
  const openPicker = () => {
    const field = fieldRef.current;
    const pos = field?.selectionStart ?? draft.length;
    const end = field?.selectionEnd ?? pos;
    if (getMentionQuery(draft, pos)) { field?.focus(); setOpen(true); setIndex(0); return; }
    const text = `${pos > 0 && !/\s/.test(draft[pos - 1] ?? '') ? ' ' : ''}@`;
    setDraftCaret(draft.slice(0, pos) + text + draft.slice(end), pos + text.length);
  };

  /** Arrow, Enter, Tab and Escape while the list is open. Returns true when it used the key. */
  const handleKey = (e) => {
    if (!open || !matches.length) return false;
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); return true; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setIndex((i) => Math.min(i + 1, matches.length - 1)); return true; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)); return true; }
    if ((e.key === 'Enter' && !e.metaKey && !e.ctrlKey) || e.key === 'Tab') { e.preventDefault(); insert(matches[index] ?? matches[0]); return true; }
    return false;
  };

  const fieldProps = {
    ref: fieldRef,
    onChange: (e) => { setDraft(e.currentTarget.value); sync(e.currentTarget); },
    onKeyUp: (e) => sync(e.currentTarget),
    onClick: (e) => sync(e.currentTarget),
    'aria-autocomplete': 'list',
    'aria-expanded': open,
  };

  const menu = open && matches.length > 0 ? (
    <div className="en-mentions" role="listbox" aria-label="Mention people" ref={menuRef}>
      {matches.map((u, i) => (
        <button
          key={u.id}
          type="button"
          role="option"
          aria-selected={i === index}
          className={`en-mentions__item${i === index ? ' is-active' : ''}`}
          onMouseDown={(e) => e.preventDefault()}
          onMouseEnter={() => setIndex(i)}
          onClick={() => insert(u)}
        >
          <NoteAvatar initial={u.initial} color={u.color} />
          <span className="en-mentions__copy">
            <span className="en-mentions__name">{u.name}</span>
            <span className="en-mentions__desc">{u.description}</span>
          </span>
        </button>
      ))}
    </div>
  ) : null;

  return { fieldRef, fieldProps, handleKey, openPicker, open, menu };
}

/** The text that colours @mentions under a transparent textarea (see .en-composer__highlight). */
export const MentionHighlight = ({ text, className }) => (
  <div className={className} aria-hidden="true">{text ? <MentionText text={text} /> : ' '}</div>
);

/** The quote of the note being replied to, for a composer. */
export { NoteQuote };

/* ---------- Composer ---------- */

/**
 * The note composer that replaces the footer. `editing` is the note being edited, `replyTo` the
 * note being replied to (or neither for a new note). Calls onSubmit({ body, attachments }).
 */
export function NoteComposer({ editing, replyTo, onSubmit, onCancel, onQuoteClick }) {
  const [draft, setDraft] = React.useState(editing?.body ?? '');
  const [attachments, setAttachments] = React.useState(editing?.attachments ? [...editing.attachments] : []);
  const [dropping, setDropping] = React.useState(false);
  const fileRef = React.useRef(null);
  const mentions = useMentions(draft, setDraft);
  const original = React.useMemo(() => new Set((editing?.attachments ?? []).map((f) => f.id)), [editing]);

  React.useEffect(() => {
    const field = mentions.fieldRef.current;
    field?.focus();
    if (field) field.setSelectionRange(field.value.length, field.value.length);
  }, []);

  // Files added in this composer that were not kept are released when it closes.
  const releaseUnsaved = (keep = []) => attachments.forEach((f) => { if (!original.has(f.id) && !keep.includes(f)) URL.revokeObjectURL(f.url); });

  const addFiles = (files) => {
    const next = toAttachments(files);
    if (next.length) setAttachments((cur) => [...cur, ...next]);
  };
  const removeFile = (id) => setAttachments((cur) => {
    const target = cur.find((f) => f.id === id);
    if (target && !original.has(id)) URL.revokeObjectURL(target.url);
    return cur.filter((f) => f.id !== id);
  });

  const canSubmit = draft.trim().length > 0 || attachments.length > 0;
  const submit = () => {
    if (!canSubmit) return;
    releaseUnsaved(attachments);
    onSubmit({ body: draft.trim(), attachments });
  };
  const cancel = () => { releaseUnsaved(); onCancel(); };

  const onKeyDown = (e) => {
    if (mentions.handleKey(e)) return;
    if (e.key === 'Escape') { e.preventDefault(); cancel(); return; }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); }
  };

  const title = editing ? 'Editing a note' : replyTo ? 'Reply to note' : 'Internal note';

  return (
    <div className="en-composer-wrap">
      {mentions.menu}
      <form
        className={`en-composer${dropping ? ' is-drop' : ''}`}
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        onDragOver={(e) => { e.preventDefault(); setDropping(true); }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDropping(false); }}
        onDrop={(e) => { e.preventDefault(); setDropping(false); addFiles(e.dataTransfer.files); }}
      >
        {/* Figma: Activity - Notes › 43:7961 Form (Activity and Notes) */}
        <div className="en-composer__head">
          <span className="en-composer__title">{title}</span>
          <span className="en-composer__hint">Only your team sees notes</span>
        </div>
        {replyTo && <NoteQuote author={replyTo.author} body={replyTo.body} onClick={onQuoteClick} />}
        <div className="en-composer__field">
          {/* The textarea's text is transparent; this copy under it colours the @mentions. */}
          <MentionHighlight text={draft} className="en-composer__highlight" />
          <textarea
            {...mentions.fieldProps}
            className="en-composer__input"
            placeholder="Write an internal note"
            aria-label={title}
            value={draft}
            rows={2}
            onKeyDown={onKeyDown}
            onPaste={(e) => { if (e.clipboardData?.files?.length) { e.preventDefault(); addFiles(e.clipboardData.files); } }}
          />
        </div>
        {attachments.length > 0 && (
          <div className="en-attach-list">{attachments.map((f) => <AttachmentChip key={f.id} file={f} onRemove={() => removeFile(f.id)} />)}</div>
        )}
        <div className="en-composer__bar">
          {/* Attach opens the file picker straight away; files can also be dropped or pasted on the composer. */}
          <input ref={fileRef} type="file" className="en-file-input" multiple onChange={(e) => { const files = Array.from(e.target.files ?? []); e.target.value = ''; addFiles(files); }} />
          <IconBtn aria-label="Attach file" className={`en-icon-btn--tool${attachments.length ? ' is-active' : ''}`} onClick={() => fileRef.current?.click()}>
            <Icon name="attachment" size={16} />
          </IconBtn>
          <IconBtn aria-label="Mention" aria-haspopup="listbox" aria-expanded={mentions.open} className={`en-icon-btn--tool${mentions.open ? ' is-active' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={mentions.openPicker}>
            <img src={mentionIcon} alt="" />
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

/**
 * A small confirm dialog: the HOT Modal (Figma: Activity - Notes › 12:29213 Delete, 12:29892 Replace).
 * `icon` is an optional icon name before the title, such as delete.
 */
export function NoteConfirm({ title, text, confirmLabel, danger, icon, onConfirm, onClose }) {
  const [closing, exit] = useModalExit();
  const close = () => exit(onClose);
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [close]);
  return createPortal(
    <div className={`lc-backdrop${closing ? ' is-closing' : ''}`} onClick={close}>
      <div onClick={stop}>
        <Modal
          title={title}
          icon={icon}
          onClose={close}
          actions={(
            <>
              <Button variant="secondary" onClick={close}>Cancel</Button>
              <Button variant={danger ? 'error' : 'primary'} onClick={() => exit(onConfirm)}>{confirmLabel}</Button>
            </>
          )}
        >
          <ModalText>{text}</ModalText>
        </Modal>
      </div>
    </div>,
    document.body
  );
}
