import React, { useState, useRef, useEffect } from 'react';
import addEmojiIcon from '../../icons/add-emoji.svg';
import deleteMessageIcon from '../../icons/delete-message.svg';
import openInSlackIcon from '../../icons/optn-in-slack.svg';
import ReplyNoteComposer from '../composer/ReplyNoteComposer';
import { ActivityGroup } from '../notes/EmailNotes';
import { useNotesThread } from '../notes/useNotesThread';
import { groupActivity, seedActivity } from '../notes/threadTimeline';
import { useConversationFields } from '../../ConversationFields';
import { useCurrentUser } from '../../CurrentUser';
import { AGENTS, AVATAR_BG } from '../../data/agents';
import './SlackChatPanel.css';

const RANDOM_REPLIES = [
  'Thanks, got it!', 'Sure, let me check.', 'Sounds good 👍', 'On it!',
  'Appreciate it.', 'Okay, will do.', 'Great, thanks for the update.',
];
const randomReply = () => RANDOM_REPLIES[Math.floor(Math.random() * RANDOM_REPLIES.length)];

function formatNow() {
  return new Date().toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

const EMOJIS = ['👍', '❤️', '😀', '🎉', '✅', '🙏', '🔥', '👀', '😂', '💯'];

// A single Slack-style full-width message row with a hover toolbar + reactions.
function SlackMessage({ name, time, text, role, initial, color, reactions = {}, onAddReaction, onRemoveReaction, onDelete }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!pickerOpen) return undefined;
    const onClick = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setPickerOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [pickerOpen]);

  const reactionList = Object.entries(reactions);

  return (
    <div className={`slack-msg slack-msg--${role}`}>
      <span className="slack-msg__avatar" style={{ background: color }}>{initial}</span>
      <div className="slack-msg__body">
        <div className="slack-msg__head">
          <span className="slack-msg__name">{name}</span>
          <span className="slack-msg__time">{time}</span>
        </div>
        <div className="slack-msg__text">{text}</div>

        {reactionList.length > 0 && (
          <div className="slack-reactions">
            {reactionList.map(([emoji, count]) => (
              <button key={emoji} type="button" className="slack-reaction" title="Remove reaction" onClick={() => onRemoveReaction(emoji)}>
                <span className="slack-reaction__emoji">{emoji}</span>
                <span className="slack-reaction__count">{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="slack-msg__toolbar" ref={wrapRef}>
        <button type="button" className="slack-msg__tool" title="Add emoji" onClick={() => setPickerOpen((o) => !o)}>
          <img src={addEmojiIcon} width="14" height="14" alt="" />
        </button>
        {role === 'agent' && (
          <button type="button" className="slack-msg__tool" title="Delete message" onClick={onDelete}>
            <img src={deleteMessageIcon} width="14" height="14" alt="" />
          </button>
        )}
        <button type="button" className="slack-msg__tool" title="Open in Slack">
          <img src={openInSlackIcon} width="14" height="14" alt="" />
        </button>

        {pickerOpen && (
          <div className="slack-emoji-picker">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="slack-emoji-picker__item"
                onClick={() => { onAddReaction(emoji); setPickerOpen(false); }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SlackChatPanel({ inboxName, conversation }) {
  // Send posts a reply in Slack, or (in Notes mode) an internal note in the thread.
  const [mode, setMode] = useState('reply');
  // In Notes mode: the note being replied to or edited ({ kind: 'reply' | 'edit', note }).
  const [context, setContext] = useState(null);
  // Messages sent here carry the name of whoever is viewing (Michael or Jim); your own say "(You)".
  const { user } = useCurrentUser();
  const agentFor = (name) => {
    const agent = AGENTS.find((a) => a.label === name);
    return { name: name === user.name ? `${name} (You)` : name, initial: name.charAt(0), color: AVATAR_BG[agent?.color ?? 'grey'] };
  };
  const custDisplay = conversation?.name || 'Customer';
  const CUSTOMER = { name: custDisplay, initial: custDisplay.charAt(0).toUpperCase(), color: conversation?.avatarColor || '#7b8bd4' };

  const [messages, setMessages] = useState(
    (conversation?.messages || []).map((m, i) => ({ ...m, id: m.id || `m-${i}` }))
  );
  const [text, setText] = useState('');
  const threadRef = useRef(null);

  // Notes (email-style cards, shared by Michael and Jim) and right-panel activity, in the thread.
  const notes = useNotesThread(conversation?.id, {
    scrollRef: threadRef,
    onReply: (note) => { setMode('note'); setContext({ kind: 'reply', note }); setText(''); },
    onEdit: (note) => { setMode('note'); setContext({ kind: 'edit', note }); setText(note.body); },
  });
  const { activityOf } = useConversationFields();
  const activity = conversation ? activityOf(conversation.id) : [];

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, notes.notes.length, activity.length]);

  function send() {
    const value = text.trim();
    if (!value) return;
    if (mode === 'note') {
      if (context?.kind === 'edit') notes.edit(context.note.id, value);
      else notes.add({ body: value, replyTo: context?.kind === 'reply' ? context.note : null });
      setContext(null);
      setText('');
      return;
    }
    setMessages((prev) => [...prev, { id: `agent-${Date.now()}`, kind: 'agent-text', text: value, sender: user.name, time: formatNow() }]);
    setText('');
    setTimeout(() => {
      setMessages((prev) => [...prev, { id: `reply-${Date.now()}`, kind: 'incoming', text: randomReply(), time: formatNow() }]);
    }, 2000);
  }

  const deleteMsg = (id) => setMessages((prev) => prev.filter((m) => m.id !== id));

  const addReaction = (id, emoji) =>
    setMessages((prev) => prev.map((m) => {
      if (m.id !== id) return m;
      const reactions = { ...(m.reactions || {}) };
      reactions[emoji] = (reactions[emoji] || 0) + 1;
      return { ...m, reactions };
    }));

  // Clicking an existing reaction removes it entirely.
  const removeReaction = (id, emoji) =>
    setMessages((prev) => prev.map((m) => {
      if (m.id !== id) return m;
      const reactions = { ...(m.reactions || {}) };
      delete reactions[emoji];
      return { ...m, reactions };
    }));

  // The conversation's own messages, then the ones sent here (their ids end in the time they were sent).
  const sentAt = (m) => Number(String(m.id).split('-').pop());
  const isLater = (m) => /^(agent|reply)-/.test(String(m.id));
  const base = messages.filter((m) => !isLater(m));
  // The conversation's starting history (as in email), after its first and last messages.
  const seed = conversation ? seedActivity({
    id: conversation.id,
    firstTime: base[0]?.time,
    lastTime: base[base.length - 1]?.time,
  }) : { first: [], last: [] };
  const later = [
    ...messages.filter(isLater).map((m) => ({ kind: 'message', at: sentAt(m), message: m })),
    ...notes.notes.map((note) => ({ kind: 'note', at: note.at ?? 0, note })),
    ...activity.map((row) => ({ kind: 'activity', at: row.at, row })),
  ].sort((a, b) => a.at - b.at);
  const asActivity = (rows) => rows.map((row) => ({ kind: 'activity', row }));
  // What follows message `i`: activity between two messages or notes is one group, as in email.
  const threadAfter = (i) => groupActivity([
    ...(i === 0 ? asActivity(seed.first) : []),
    ...(i === base.length - 1 ? [...asActivity(seed.last), ...later] : []),
  ]);

  function renderMessage(m) {
    const isAgent = m.kind === 'agent-text';
    const who = isAgent ? agentFor(m.sender ?? AGENTS[0].label) : CUSTOMER;
    return (
      <SlackMessage
        key={m.id}
        role={isAgent ? 'agent' : 'user'}
        name={who.name}
        initial={who.initial}
        color={who.color}
        time={m.time}
        text={m.text}
        reactions={m.reactions}
        onAddReaction={(emoji) => addReaction(m.id, emoji)}
        onRemoveReaction={(emoji) => removeReaction(m.id, emoji)}
        onDelete={() => deleteMsg(m.id)}
      />
    );
  }

  function renderThreadItem(item) {
    if (item.kind === 'activity') return <div key={item.key} className="slack-note slack-note--activity"><ActivityGroup rows={item.rows} /></div>;
    if (item.kind === 'note') return <div key={item.note.id} className="slack-note">{notes.renderNote(item.note)}</div>;
    return renderMessage(item.message);
  }

  return (
    <div className="slack-panel">
      <div className="slack-topbar">
        <span className="slack-topbar__name">{conversation?.name}</span>
        <span className="slack-topbar__chip">#{conversation?.channel}</span>
      </div>

      <div className="slack-thread" ref={threadRef}>
        {notes.pinned && <div className="slack-note slack-note--pinned">{notes.pinned}</div>}
        {base.map((m, i) => (
          <React.Fragment key={m.id}>
            {renderMessage(m)}
            {threadAfter(i).map(renderThreadItem)}
          </React.Fragment>
        ))}
        {base.length === 0 && groupActivity(later).map(renderThreadItem)}
      </div>

      <div className="slack-composer-wrap">
        <ReplyNoteComposer
          mode={mode}
          onModeChange={(next) => { setMode(next); setContext(null); }}
          placeholder={mode === 'note'
            ? 'Add an internal note. Type @ to mention a teammate'
            : 'Shift + Enter for new line. Type ‘/’ to search for Slack templates and send quick replies'}
          value={text}
          onValueChange={setText}
          onSend={send}
          context={context}
          onClearContext={() => { if (context?.kind === 'edit') setText(''); setContext(null); }}
          onQuoteClick={() => context && notes.scrollToNote(context.note.id)}
        />
      </div>
      {notes.dialogs}
    </div>
  );
}
