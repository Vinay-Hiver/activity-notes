import React from 'react';
import { ChannelRightPanel } from '../../patterns/RightPanel/ChannelRightPanel';
import { statusOptions } from '../../patterns/RightPanel/data/options';
import { assigneeName, useConversationFields } from '../ConversationFields';
import { useCurrentUser } from '../CurrentUser';
import { TAGS } from '../data/tags';
import { CUSTOM_FIELDS } from '../data/customFields';
import { agentOptionsFor } from '../data/agents';
import { formatNoteTime } from './notes/EmailNotes';

const tagLabel = (value) => TAGS.find((t) => t.value === value)?.label ?? value;
const statusLabel = (value) => statusOptions.find((o) => o.value === value)?.label ?? value;

/**
 * The storybook right panel, with the conversation's Assignee, Status, Tags and Custom fields kept per conversation.
 * Every change is also logged as an activity event by whoever is viewing (Email shows them in the thread,
 * where events between two messages or notes are grouped into one summary line).
 */
export default function ConversationRightPanel({ conversationId, ...panelProps }) {
  const { assigneeOf, setAssignee, statusOf, setStatus, tagsOf, setTags, customFieldsOf, setCustomField, addActivity } = useConversationFields();
  const { user } = useCurrentUser();
  const id = conversationId != null ? String(conversationId) : undefined;

  // Rows keep who did it (and who it was assigned to) as people, so each viewer reads themselves as "You".
  const me = { id: user.id, name: user.name };
  const log = (kind, fields) => {
    const now = Date.now();
    addActivity(id, { id: `act-${now}-${Math.random().toString(36).slice(2, 6)}`, kind, actor: me, time: formatNoteTime(), at: now, ...fields });
  };

  const changeAssignee = (value) => {
    if (value === assigneeOf(id)) return;
    setAssignee(id, value);
    const name = assigneeName(value);
    log('assignee', name
      ? { icon: 'assigned', verb: 'assigned this conversation to', object: { id: value, name } }
      : { icon: 'assigned', verb: 'unassigned the conversation' });
  };

  const changeStatus = (value) => {
    if (value === statusOf(id)) return;
    setStatus(id, value);
    log('status', { icon: 'flag', verb: `changed status to ${statusLabel(value)}` });
  };

  // One event per tag, so the summary can count them ("3 tags added").
  const changeTags = (value) => {
    const before = tagsOf(id);
    setTags(id, value);
    value.filter((v) => !before.includes(v)).forEach((v) => log('tag-add', { icon: 'tag', verb: `applied ${tagLabel(v)} tag`, tag: tagLabel(v) }));
    before.filter((v) => !value.includes(v)).forEach((v) => log('tag-remove', { icon: 'tag', verb: `removed ${tagLabel(v)} tag`, tag: tagLabel(v) }));
  };

  const changeCustomField = (fieldId, value) => {
    setCustomField(id, fieldId, value);
    const label = CUSTOM_FIELDS.find((f) => f.id === fieldId)?.label ?? fieldId;
    log('field', { icon: 'text', verb: value ? `updated ${label} to ${value}` : `cleared ${label}`, field: label, value });
  };

  return (
    <ChannelRightPanel
      {...panelProps}
      conversationId={id}
      people={agentOptionsFor(user.id)}
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
