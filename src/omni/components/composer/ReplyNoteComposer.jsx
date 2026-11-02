import React from 'react';
import { Dropdown } from '../../../components/Dropdown';
import { Popover } from '../../../components/Popover';
import { Icon } from '../../../icons/Icon';
import { MentionHighlight, NoteQuote, useMentions } from '../notes/EmailNotes';
import './ReplyNoteComposer.css';

// The composer for real-time channels (Chat, Slack, WhatsApp, SMS), Figma: Activity - Notes › 21:5631.
// The text box is always there; the switch at the bottom left picks whether Send posts a reply to the
// customer or an internal note. Notes mode tints the action bar yellow, adds @mentions and Send becomes Add.
// Tools are 14px icons: Reply has Attach and Emoji, Notes has Attach, Mention and Emoji.

const MODE_OPTIONS = [
  { value: 'note', label: 'Notes', icon: 'note' },
  { value: 'reply', label: 'Reply', icon: 'reply' },
];

const EMOJIS = [
  '😀', '😂', '😊', '😍', '🤔', '😅', '😢', '😮',
  '👍', '🙏', '👏', '🤝', '🎉', '🔥', '❤️', '💯',
  '✅', '🚀', '📦', '📍', '⏰', '💬', '😎', '🙌',
];

function EmojiButton({ onSelect }) {
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef(null);
  React.useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);
  return (
    <div className="rn-emoji" ref={wrapRef}>
      <button type="button" className={`rn-composer__tool${open ? ' is-active' : ''}`} aria-label="Emoji" onClick={() => setOpen((o) => !o)}>
        <Icon name="emoji" size={14} />
      </button>
      {open && (
        <div className="rn-emoji__picker">
          {EMOJIS.map((emoji) => (
            <button key={emoji} type="button" className="rn-emoji__item" onClick={() => { onSelect(emoji); setOpen(false); }}>{emoji}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * `mode` is 'reply' or 'note'; `value` / `onValueChange` are the text. Enter sends (Shift + Enter for a
 * new line). In Notes mode, `context` can be { kind: 'reply' | 'edit', note }: replying shows the
 * note's quote above the text, editing fills in its text and Send becomes Save; `onClearContext`
 * drops it (also on Escape).
 */
export default function ReplyNoteComposer({ mode, onModeChange, value, onValueChange, onSend, placeholder, context, onClearContext, onQuoteClick }) {
  const switchRef = React.useRef(null);
  const [open, setOpen] = React.useState(false);
  const mentions = useMentions(value, onValueChange);
  const canSend = value.trim().length > 0;
  const isNote = mode === 'note';

  // Picking a note to reply to or edit puts the cursor in the box.
  React.useEffect(() => {
    if (!context) return;
    const field = mentions.fieldRef.current;
    field?.focus();
    if (field) field.setSelectionRange(field.value.length, field.value.length);
  }, [context]);

  const onKeyDown = (e) => {
    if (isNote && mentions.handleKey(e)) return;
    if (e.key === 'Escape' && context) { e.preventDefault(); onClearContext(); return; }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (canSend) onSend(); }
  };

  const fieldProps = isNote
    ? mentions.fieldProps
    : { ref: mentions.fieldRef, onChange: (e) => onValueChange(e.currentTarget.value) };

  return (
    <div className="rn-composer-wrap">
      {isNote && mentions.menu}
      <div className={`rn-composer${isNote ? ' rn-composer--note' : ''}`}>
        {isNote && context && (
          <div className="rn-composer__context">
            {context.kind === 'reply'
              ? <NoteQuote author={context.note.author} body={context.note.body} onClick={onQuoteClick} />
              : <span className="rn-composer__context-label">Editing note</span>}
            <button type="button" className="rn-composer__tool" aria-label={context.kind === 'reply' ? 'Cancel reply' : 'Cancel edit'} onClick={onClearContext}>
              <Icon name="close" size={14} />
            </button>
          </div>
        )}
        <div className={`rn-composer__field${isNote ? ' has-mentions' : ''}`}>
          {/* In Notes mode the textarea's text is transparent; this copy under it colours the @mentions. */}
          {isNote && <MentionHighlight text={value} className="rn-composer__highlight" />}
          <textarea
            {...fieldProps}
            className="rn-composer__input"
            placeholder={placeholder}
            aria-label={isNote ? 'Internal note' : 'Reply'}
            value={value}
            onKeyDown={onKeyDown}
          />
        </div>
        <div className="rn-composer__bar">
          <div className="rn-composer__left">
            <button
              ref={switchRef}
              type="button"
              className={`rn-composer__mode${open ? ' is-open' : ''}`}
              aria-haspopup="listbox"
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
            >
              {isNote ? 'Notes' : 'Reply'}
              <Icon name="chevrondown" size={14} />
            </button>
            <Popover open={open} onClose={() => setOpen(false)} anchorRef={switchRef}>
              <Dropdown
                className="rn-mode-menu"
                variant="icon"
                options={MODE_OPTIONS}
                value={mode}
                onChange={(next) => { onModeChange(next); setOpen(false); }}
              />
            </Popover>
            <div className="rn-composer__tools">
              <button type="button" className="rn-composer__tool" aria-label="Attach file"><Icon name="attachment" size={14} /></button>
              {isNote && (
                <button
                  type="button"
                  className={`rn-composer__tool${mentions.open ? ' is-active' : ''}`}
                  aria-label="Mention"
                  aria-haspopup="listbox"
                  aria-expanded={mentions.open}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={mentions.openPicker}
                >
                  <Icon name="alias" size={14} />
                </button>
              )}
              <EmojiButton onSelect={(emoji) => onValueChange(value + emoji)} />
            </div>
          </div>
          <button type="button" className="rn-composer__send" disabled={!canSend} onClick={onSend}>
            {!isNote ? 'Send' : context?.kind === 'edit' ? 'Save' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}
