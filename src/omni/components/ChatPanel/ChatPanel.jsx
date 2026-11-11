import React, { useState, useRef, useEffect } from 'react';
import {
  WhatsAppIcon,
  ChannelGlyph,
  SmileIcon,
  PaperclipIcon,
  SingleTickIcon,
  DoubleTickIcon,
  ReadTickIcon,
  WhatsAppTemplateIcon,
} from '../icons/Icon';
import whatsappTemplateUrl from '../../icons/whatsapp-template.svg';
import emojiIconUrl from '../../icons/emoji.svg';
import attachFileUrl from '../../icons/attach-file.svg';
import whatsappTemplatesUrl from '../../icons/whatsapp-templates.svg';
// The Note icon from Figma (Activity - Notes › 12:24260), used as it is.
import noteIcon from '../../assets/icons/note.svg';
import TemplateModal from '../TemplateModal/TemplateModal';
import TemplatePickerPopover from '../TemplateModal/TemplatePickerPopover';
import TemplatePreviewCard from '../TemplateModal/TemplatePreview';
import ConversationMenu, { VIEW_ONLY_NOTES } from '../ConversationMenu';
import { ActivityGroup, AttachmentChip, NoteComposer, NotesOnlyBar } from '../notes/EmailNotes';
import { useNotesThread } from '../notes/useNotesThread';
import { groupActivity, seedActivity } from '../notes/threadTimeline';
import { useConversationFields } from '../../ConversationFields';
import { useCurrentUser } from '../../CurrentUser';
import './ChatPanel.css';

// Must match .template-picker-popover's CSS height.
const TEMPLATE_PICKER_POPOVER_HEIGHT = 532;

function formatNow() {
  return new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function StatusTick({ status }) {
  if (status === 'sent') return <SingleTickIcon size={14} />;
  if (status === 'delivered') return <DoubleTickIcon size={14} />;
  return <ReadTickIcon size={14} />;
}

function IncomingBubble({ text, time }) {
  return (
    <div className="chat-message chat-message--incoming">
      <div className="chat-bubble chat-bubble--incoming">{text}</div>
      <span className="chat-message__time">{time}</span>
    </div>
  );
}

function OutgoingTextBubble({ text, attachments, time, sender, status = 'read', showStatus = true }) {
  return (
    <div className="chat-message chat-message--outgoing">
      {text && <div className="chat-bubble chat-bubble--outgoing-card">{text}</div>}
      {attachments?.length > 0 && (
        <div className="en-attach-list chat-message__files">{attachments.map((f) => <AttachmentChip key={f.id} file={f} />)}</div>
      )}
      <div className="chat-message__meta">
        <span>{sender}</span>
        <span className="chat-message__meta-dash">-</span>
        <span>{time}</span>
        {showStatus && <StatusTick status={status} />}
      </div>
    </div>
  );
}

// Canned replies used to simulate an incoming response for Chat/Slack.
const RANDOM_REPLIES = [
  'Thanks, got it!', 'Sure, let me check.', 'Sounds good 👍', 'On it!',
  'Perfect, appreciate it.', 'Okay, will do.', 'Great, thanks for the update.',
];
const randomReply = () => RANDOM_REPLIES[Math.floor(Math.random() * RANDOM_REPLIES.length)];

function TwentyFourHourBlock({ onChooseTemplate }) {
  return (
    <div className="reply-block">
      <div className="reply-block__inner">
        <div className="reply-block__text">
          <p className="reply-block__title">You’ve reached WhatsApp’s 24 hour reply limit</p>
          <p className="reply-block__body">
            Send a pre-approved template to restart the conversation. Once the customer replies, you
            can continue the conversation as usual.
          </p>
        </div>
        <button className="reply-block__cta" type="button" onClick={onChooseTemplate}>
          <img src={whatsappTemplateUrl} width={16} height={16} alt="" className="reply-block__cta-icon" />
          Choose a template
        </button>
      </div>
    </div>
  );
}

const EMOJIS = [
  '😀', '😂', '😊', '😍', '🤔', '😅', '😢', '😮',
  '👍', '🙏', '👏', '🤝', '🎉', '🔥', '❤️', '💯',
  '✅', '🚀', '📦', '📍', '⏰', '💬', '😎', '🙌',
];

function EmojiPickerButton({ onSelect }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="emoji-picker-wrap" ref={wrapRef}>
      <button
        type="button"
        className="chat-composer__tool-btn"
        onClick={() => setOpen((o) => !o)}
      >
        <img src={emojiIconUrl} width={16} height={16} alt="" />
      </button>
      {open && (
        <div className="emoji-picker">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="emoji-picker__item"
              onClick={() => {
                onSelect(emoji);
                setOpen(false);
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChatPanel({ channel = 'whatsapp', conversation }) {
  const isWhatsApp = channel === 'whatsapp';
  // Messages sent here carry the name of whoever is viewing (Michael or Jim).
  const { user } = useCurrentUser();
  // The note composer (email's), shown in place of the reply box: null, { mode: 'new' }, or
  // { mode: 'reply' | 'edit', note } after Reply or Edit on a note.
  const [noteComposer, setNoteComposer] = useState(null);
  // "View only notes" in the ⋮ menu: the thread shows its notes alone, without messages or activity.
  const [onlyNotes, setOnlyNotes] = useState(false);
  const baseMessages = conversation?.messages || [];
  const [isBlocked, setIsBlocked] = useState(isWhatsApp && !!conversation?.blocked);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateModalKey, setTemplateModalKey] = useState(0);
  const [dynamicMessages, setDynamicMessages] = useState([]);
  const [composerText, setComposerText] = useState('');
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const [templatePickerKey, setTemplatePickerKey] = useState(0);
  const [templatePickerAnchorLeft, setTemplatePickerAnchorLeft] = useState(0);
  const [templatePickerAnchorTop, setTemplatePickerAnchorTop] = useState(0);
  const threadRef = useRef(null);
  const composerWrapRef = useRef(null);
  const templateButtonRef = useRef(null);

  // Notes (email-style cards, shared by Michael and Jim) and right-panel activity, in the thread.
  const notes = useNotesThread(conversation?.id, {
    scrollRef: threadRef,
    onReply: (note) => setNoteComposer({ mode: 'reply', note }),
    onEdit: (note) => setNoteComposer({ mode: 'edit', note }),
  });
  const { activityOf } = useConversationFields();
  const activity = conversation ? activityOf(conversation.id) : [];

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [dynamicMessages, isBlocked, notes.notes.length, activity.length]);

  useEffect(() => {
    if (!isTemplatePickerOpen) return undefined;
    function handleClickOutside(e) {
      if (composerWrapRef.current && !composerWrapRef.current.contains(e.target)) {
        setIsTemplatePickerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isTemplatePickerOpen]);

  function handleSendTemplate(template, values) {
    const msgId = `template-${Date.now()}`;
    const templateMessage = {
      id: msgId,
      kind: 'template',
      sender: user.name,
      template,
      values,
      time: formatNow(),
      status: 'sent',
    };
    setDynamicMessages((prev) => [...prev, templateMessage]);

    // Simulate status progression with 1.5s gap: sent (single tick) -> delivered (double tick) -> read (blue double tick)
    setTimeout(() => {
      setDynamicMessages((prev) =>
        prev.map((msg) => (msg.id === msgId ? { ...msg, status: 'delivered' } : msg))
      );
    }, 1500);

    setTimeout(() => {
      setDynamicMessages((prev) =>
        prev.map((msg) => (msg.id === msgId ? { ...msg, status: 'read' } : msg))
      );
    }, 3000);

    // Simulate customer reply, lifting 24-hour block
    setTimeout(() => {
      setDynamicMessages((prev) => [
        ...prev,
        { id: `reply-${Date.now()}`, kind: 'incoming', text: 'Hello', time: formatNow() },
      ]);
      setIsBlocked(false);
    }, 3500);
  }

  function submitNote({ body, attachments }) {
    if (noteComposer.mode === 'edit') notes.edit(noteComposer.note.id, body, attachments);
    else notes.add({ body, attachments, replyTo: noteComposer.mode === 'reply' ? noteComposer.note : null });
    setNoteComposer(null);
  }

  function handleSendComposerMessage() {
    const text = composerText.trim();
    if (!text) return;
    const msgId = `agent-${Date.now()}`;
    setDynamicMessages((prev) => [
      ...prev,
      { id: msgId, kind: 'agent-text', text, sender: user.name, time: formatNow(), status: 'sent' },
    ]);
    setComposerText('');

    if (isWhatsApp) {
      // WhatsApp shows the tick progression sent -> delivered -> read.
      setTimeout(() => {
        setDynamicMessages((prev) =>
          prev.map((msg) => (msg.id === msgId ? { ...msg, status: 'delivered' } : msg))
        );
      }, 1500);
      setTimeout(() => {
        setDynamicMessages((prev) =>
          prev.map((msg) => (msg.id === msgId ? { ...msg, status: 'read' } : msg))
        );
      }, 3000);
    } else {
      // Chat/Slack: no ticks — instead a random reply comes back after 2s.
      setTimeout(() => {
        setDynamicMessages((prev) => [
          ...prev,
          { id: `reply-${Date.now()}`, kind: 'incoming', text: randomReply(), time: formatNow() },
        ]);
      }, 2000);
    }
  }

  function handleComposerKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendComposerMessage();
    }
  }

  function handleComposerChange(e) {
    const val = e.target.value;
    if (isWhatsApp && val.startsWith('/') && !isTemplatePickerOpen) {
      setComposerText(val);
      openTemplatePickerAtComposer();
      return;
    }
    setComposerText(val);
  }

  function openTemplateModal() {
    setTemplateModalKey((key) => key + 1);
    setIsTemplateModalOpen(true);
  }

  function openTemplatePickerAtComposer() {
    setIsTemplatePickerOpen(true);
    setTemplatePickerKey((key) => key + 1);
    if (composerWrapRef.current) {
      // 20px padding of composerWrapRef plus positioning right above the composer box (no gap)
      setTemplatePickerAnchorLeft(20);
      setTemplatePickerAnchorTop(20 - TEMPLATE_PICKER_POPOVER_HEIGHT);
    }
  }

  // The WhatsApp templates button: opens the template picker right above itself.
  function toggleTemplatePicker() {
    if (isTemplatePickerOpen) { setIsTemplatePickerOpen(false); return; }
    setIsTemplatePickerOpen(true);
    setTemplatePickerKey((key) => key + 1);
    if (templateButtonRef.current && composerWrapRef.current) {
      const btnRect = templateButtonRef.current.getBoundingClientRect();
      const wrapRect = composerWrapRef.current.getBoundingClientRect();
      setTemplatePickerAnchorLeft(btnRect.left - wrapRect.left);
      setTemplatePickerAnchorTop(btnRect.top - wrapRect.top - 8 - TEMPLATE_PICKER_POPOVER_HEIGHT);
    }
  }

  // The conversation's starting history (as in email), shown after its first and last messages.
  const seed = conversation ? seedActivity({
    id: conversation.id,
    firstTime: baseMessages[0]?.time,
    lastTime: baseMessages[baseMessages.length - 1]?.time,
  }) : { first: [], last: [] };
  // Messages sent here, notes and right-panel activity, in the order they happened (all after the last message).
  const later = [
    ...dynamicMessages.map((entry) => ({ kind: 'message', at: Number(entry.id.split('-').pop()), entry })),
    ...notes.notes.map((note) => ({ kind: 'note', at: note.at ?? 0, note })),
    ...activity.map((row) => ({ kind: 'activity', at: row.at, row })),
  ].sort((a, b) => a.at - b.at);
  const asActivity = (rows) => rows.map((row) => ({ kind: 'activity', row }));
  // What follows message `i`: activity between two messages or notes is one group, as in email.
  const threadAfter = (i) => groupActivity([
    ...(i === 0 ? asActivity(seed.first) : []),
    ...(i === baseMessages.length - 1 ? [...asActivity(seed.last), ...later] : []),
  ]);

  function renderMessage(entry) {
    if (entry.kind === 'template') {
      return (
        <div className="chat-message chat-message--outgoing" key={entry.id}>
          <TemplatePreviewCard template={entry.template} values={entry.values} />
          <div className="chat-message__meta">
            <span>{entry.sender} (sent via template)</span>
            <span className="chat-message__meta-dash">-</span>
            <span>{entry.time}</span>
            <StatusTick status={entry.status || 'read'} />
          </div>
        </div>
      );
    }
    if (entry.kind === 'agent-text') {
      return (
        <OutgoingTextBubble
          key={entry.id}
          text={entry.text}
          attachments={entry.attachments}
          time={entry.time}
          sender={entry.sender}
          status={entry.status || 'read'}
          showStatus={isWhatsApp}
        />
      );
    }
    return <IncomingBubble key={entry.id} text={entry.text} time={entry.time} />;
  }

  function renderThreadItem(item) {
    if (item.kind === 'activity') return <div key={item.key} className="chat-thread-item chat-thread-item--activity"><ActivityGroup rows={item.rows} /></div>;
    if (item.kind === 'note') return <div key={item.note.id} className="chat-thread-item chat-thread-item--note">{notes.renderNote(item.note)}</div>;
    return renderMessage(item.entry);
  }

  return (
    <div className={`chat-panel chat-panel--${channel}`}>
      <div className="chat-panel__topbar">
        <span className="chat-panel__topbar-avatar">
          {(conversation?.avatarInitial || conversation?.title || '?').charAt(0).toUpperCase()}
        </span>
        <span className="chat-panel__topbar-title">{conversation?.title}</span>
        <ConversationMenu className="chat-panel__menu" options={[VIEW_ONLY_NOTES]} onlyNotes={onlyNotes} onSelect={() => setOnlyNotes((on) => !on)} />
      </div>

      {notes.sticky}
      <div className="chat-panel__thread" ref={threadRef}>
        {onlyNotes && <NotesOnlyBar count={notes.notes.length} onExit={() => setOnlyNotes(false)} />}
        {notes.pinned}
        {onlyNotes && (notes.notes.length
          ? notes.notes.map((note) => <div key={note.id} className="chat-thread-item chat-thread-item--note">{notes.renderNote(note)}</div>)
          : <p className="en-notes-empty">No notes in this conversation yet.</p>)}
        {!onlyNotes && baseMessages.map((m, i) => (
          <React.Fragment key={`base-${i}`}>
            {m.kind === 'incoming' ? (
              <IncomingBubble text={m.text} time={m.time} />
            ) : (
              <OutgoingTextBubble
                text={m.text}
                time={m.time}
                sender={m.sender}
                status={m.status || 'read'}
                showStatus={isWhatsApp}
              />
            )}
            {threadAfter(i).map(renderThreadItem)}
          </React.Fragment>
        ))}
        {!onlyNotes && baseMessages.length === 0 && groupActivity(later).map(renderThreadItem)}
      </div>

      {conversation?.view !== 'Assigned to Bot' && (
        <div className="chat-panel__composer-wrap" ref={composerWrapRef}>
          {noteComposer ? (
            // Add note (or Reply / Edit on a note) swaps the reply box for email's note composer.
            <NoteComposer
              key={`${noteComposer.mode}-${noteComposer.note?.id ?? 'new'}`}
              editing={noteComposer.mode === 'edit' ? noteComposer.note : undefined}
              replyTo={noteComposer.mode === 'reply' ? noteComposer.note : undefined}
              onQuoteClick={() => noteComposer.note && notes.scrollToNote(noteComposer.note.id)}
              onSubmit={submitNote}
              onCancel={() => setNoteComposer(null)}
            />
          ) : (
            <>
              {/* Viewing only notes hides the reply box; Add note stays. */}
              {onlyNotes ? null : isBlocked ? (
                <TwentyFourHourBlock onChooseTemplate={openTemplateModal} />
              ) : (
                <div className="chat-composer">
                  <textarea
                    className="chat-composer__input"
                    placeholder={
                      isWhatsApp
                        ? "Shift + Enter for new line. Type ‘/’ to search for WhatsApp templates and send quick replies"
                        : 'Shift + Enter for new line'
                    }
                    value={composerText}
                    onChange={handleComposerChange}
                    onKeyDown={handleComposerKeyDown}
                  />
                  <div className="chat-composer__toolbar">
                    <div className="chat-composer__tools">
                      <EmojiPickerButton onSelect={(emoji) => setComposerText((prev) => prev + emoji)} />
                      <button className="chat-composer__tool-btn" type="button">
                        <img src={attachFileUrl} width={16} height={16} alt="" />
                      </button>
                      {isWhatsApp && (
                        <button
                          ref={templateButtonRef}
                          type="button"
                          className={'chat-composer__tool-btn' + (isTemplatePickerOpen ? ' chat-composer__tool-btn--active' : '')}
                          onClick={toggleTemplatePicker}
                        >
                          <img src={whatsappTemplatesUrl} width={16} height={16} alt="" />
                        </button>
                      )}
                    </div>
                    <button
                      className="chat-composer__send"
                      type="button"
                      disabled={!composerText.trim()}
                      onClick={handleSendComposerMessage}
                    >
                      Send
                    </button>
                  </div>
                </div>
              )}
              {/* Email's Add note button, 12px under the reply box */}
              <div className="add-note-row">
                <button type="button" className="en-footer__btn" onClick={() => setNoteComposer({ mode: 'new' })}><img src={noteIcon} alt="" />Add note</button>
              </div>
            </>
          )}
          {isWhatsApp && isTemplatePickerOpen && (
            <TemplatePickerPopover
              key={templatePickerKey}
              anchorLeft={templatePickerAnchorLeft}
              anchorTop={templatePickerAnchorTop}
              onSend={handleSendTemplate}
              onDone={() => setIsTemplatePickerOpen(false)}
            />
          )}
        </div>
      )}

      {notes.dialogs}

      {isWhatsApp && (
        <TemplateModal
          key={templateModalKey}
          open={isTemplateModalOpen}
          onClose={() => setIsTemplateModalOpen(false)}
          onSend={handleSendTemplate}
        />
      )}
    </div>
  );
}
