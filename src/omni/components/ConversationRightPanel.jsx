import React from 'react';
import { ChannelRightPanel } from '../../patterns/RightPanel/ChannelRightPanel';
import { statusOptions } from '../../patterns/RightPanel/data/options';
import { assigneeName, useConversationFields } from '../ConversationFields';
import { useCurrentUser } from '../CurrentUser';
import { useEmailNotes } from '../EmailNotesStore';
import { TAGS } from '../data/tags';
import { CUSTOM_FIELDS } from '../data/customFields';
import { formatNoteTime } from './notes/EmailNotes';

const tagLabels = (values) => values.map((v) => TAGS.find((t) => t.value === v)?.label ?? v).join(', ');
const statusLabel = (value) => statusOptions.find((o) => o.value === value)?.label ?? value;

// The same change made again within this time (with nothing else in between) updates the last row instead of adding one.
const MERGE_WINDOW_MS = 2 * 60 * 1000;

/**
 * The storybook right panel, with the conversation's Assignee, Status and Tags kept per conversation.
 * Every change is also logged as an activity row by whoever is viewing (Email shows them in the thread).
 */
export default function ConversationRightPanel({ conversationId, ...panelProps }) {
  const { assigneeOf, setAssignee, statusOf, setStatus, tagsOf, setTags, customFieldsOf, setCustomField, addActivity } = useConversationFields();
  const { user } = useCurrentUser();
  const { threads } = useEmailNotes();
  const id = conversationId != null ? String(conversationId) : undefined;

  // Rows keep who did it (and who it was assigned to) as people, so each viewer reads themselves as "You".
  const me = { id: user.id, name: user.name };

  /**
   * Logs a change of `kind`. `build(previous)` returns the row's fields; when the last row is the same
   * kind, by the same person, recent, and no note was added after it, it is passed in and replaced.
   */
  const log = (kind, build) => {
    const now = Date.now();
    const noteAfter = (at) => (threads[id]?.notes ?? []).some((n) => (n.at ?? 0) > at);
    const mergeable = (last) => last.kind === kind && last.actor?.id === me.id && now - last.at < MERGE_WINDOW_MS && !noteAfter(last.at);
    const row = (previous) => ({ id: previous?.id ?? `act-${now}-${Math.random().toString(36).slice(2, 6)}`, kind, actor: me, time: formatNoteTime(), at: now, ...build(previous) });
    addActivity(id, row(), (last) => (mergeable(last) ? row(last) : null));
  };

  const changeAssignee = (value) => {
    if (value === assigneeOf(id)) return;
    setAssignee(id, value);
    const name = assigneeName(value);
    // Back-to-back changes keep only the latest assignee.
    log('assignee', () => (name
      ? { icon: 'user', verb: 'assigned to', object: { id: value, name } }
      : { icon: 'user', verb: 'unassigned the conversation', object: undefined }));
  };

  const changeStatus = (value) => {
    if (value === statusOf(id)) return;
    setStatus(id, value);
    log('status', () => ({ icon: 'flag', verb: `changed status to ${statusLabel(value)}` }));
  };

  const changeTags = (value) => {
    const before = tagsOf(id);
    const added = value.filter((v) => !before.includes(v));
    const removed = before.filter((v) => !value.includes(v));
    setTags(id, value);
    // Tags added (or removed) back to back are listed in one row: "applied Urgent, Bug tag(s)".
    const tagRow = (verb, values) => (previous) => {
      const tags = [...new Set([...(previous?.tags ?? []), ...values])];
      return { icon: 'tag', tags, verb: `${verb} ${tagLabels(tags)} tag(s)` };
    };
    if (added.length) log('tag-add', tagRow('applied', added));
    if (removed.length) log('tag-remove', tagRow('removed', removed));
  };

  const changeCustomField = (fieldId, value) => {
    setCustomField(id, fieldId, value);
    const label = CUSTOM_FIELDS.find((f) => f.id === fieldId)?.label ?? fieldId;
    // Editing the same field again back to back keeps one row with its latest value.
    log(`field-${fieldId}`, () => ({ icon: 'edit', verb: value ? `updated ${label} to ${value}` : `cleared ${label}` }));
  };

  return (
    <ChannelRightPanel
      {...panelProps}
      conversationId={id}
      assignee={id ? assigneeOf(id) : undefined}
      onAssigneeChange={id ? changeAssignee : undefined}
      status={id ? statusOf(id) : undefined}
      onStatusChange={id ? changeStatus : undefined}
      tagOptions={TAGS}
      tags={id ? tagsOf(id) : undefined}
      onTagsChange={id ? changeTags : undefined}
      customFields={id ? CUSTOM_FIELDS.map((f) => ({ ...f, value: customFieldsOf(id)[f.id] })) : undefined}
      onCustomFieldChange={id ? changeCustomField : undefined}
    />
  );
}
