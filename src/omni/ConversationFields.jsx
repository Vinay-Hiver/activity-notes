import React from 'react';
import { sampleAssignees } from '../patterns/RightPanel/data/options';
import { conversationsData } from './data/emailConversations';
import { CHANNEL_CHATS } from './data/channelChats';
import { VOICE_CALLS } from './data/voiceCalls';
import { defaultTagsFor } from './data/tags';
import { defaultCustomFieldsFor } from './data/customFields';

// Each conversation's Assignee, Status, Tags and Custom fields, as set in the top section of its right panel,
// and the activity those changes leave (shown in the email thread).
// One value per conversation: the right panel shows and edits it.
// Shared by every user (it sits above CurrentUserProvider): these are data, not per-viewer settings.
//
// Starting values: Unassigned conversations have no assignee ("none"), everything else belongs to
// the first person in the list (Michael Scott). Conversations in a Closed view start Closed, the rest Open.

const NONE = 'none';

const ConversationFieldsContext = React.createContext({
  assigneeOf: () => NONE,
  assigneeNameOf: () => undefined,
  setAssignee: () => {},
  statusOf: () => 'open',
  setStatus: () => {},
  tagsOf: () => [],
  setTags: () => {},
  customFieldsOf: () => ({}),
  setCustomField: () => {},
  activityOf: () => [],
  addActivity: () => {},
});

export const useConversationFields = () => React.useContext(ConversationFieldsContext);

// The view each conversation starts in, whatever its channel.
const VIEW_BY_ID = Object.fromEntries([
  ...conversationsData.map((c) => [String(c.id), c.type]),
  ...Object.values(CHANNEL_CHATS).flat().map((c) => [String(c.id), c.view]),
  ...VOICE_CALLS.map((c) => [String(c.id), c.view]),
]);

const defaultAssignee = (id) => (VIEW_BY_ID[String(id)] === 'Unassigned' ? NONE : sampleAssignees[0].value);
const defaultStatus = (id) => (VIEW_BY_ID[String(id)] === 'Closed' ? 'closed' : 'open');

/** A person's name as the Assignee list shows it, without "(Me)"; undefined for None. */
export const assigneeName = (value) => sampleAssignees.find((p) => p.value === value)?.label.replace(/ \(Me\)$/, '');

/** The values a conversation starts with, before anyone changes them (its history in the thread). */
export const initialFieldsOf = (id) => ({ assignee: defaultAssignee(id), status: defaultStatus(id), tags: defaultTagsFor(id) });

export function ConversationFieldsProvider({ children }) {
  const [assignees, setAssignees] = React.useState({}); // id -> assignee value, once changed
  const [statuses, setStatuses] = React.useState({}); // id -> 'open' | 'pending' | 'closed', once changed
  const [tags, setTagsState] = React.useState({}); // id -> list of tag values, once changed
  const [customFields, setCustomFields] = React.useState({}); // id -> { fieldId: value }, once changed
  const [activity, setActivity] = React.useState({}); // id -> [{ id, icon, text, time, at }], oldest first

  const value = React.useMemo(() => {
    const assigneeOf = (id) => assignees[String(id)] ?? defaultAssignee(id);
    return {
      /** The assignee's value (`none` when unassigned). */
      assigneeOf,
      /** The assignee's name without "(Me)", or undefined when unassigned. */
      assigneeNameOf: (id) => assigneeName(assigneeOf(id)),
      setAssignee: (id, next) => setAssignees((prev) => ({ ...prev, [String(id)]: next })),
      /** The status: open, pending or closed. */
      statusOf: (id) => statuses[String(id)] ?? defaultStatus(id),
      setStatus: (id, next) => setStatuses((prev) => ({ ...prev, [String(id)]: next })),
      /** The tag values on the conversation. Every conversation starts with two (see data/tags.js). */
      tagsOf: (id) => tags[String(id)] ?? defaultTagsFor(id),
      setTags: (id, next) => setTagsState((prev) => ({ ...prev, [String(id)]: next })),
      /** The custom field values on the conversation, keyed by field id (a missing key is empty). */
      customFieldsOf: (id) => customFields[String(id)] ?? defaultCustomFieldsFor(id),
      setCustomField: (id, fieldId, next) => setCustomFields((prev) => {
        const current = prev[String(id)] ?? defaultCustomFieldsFor(id);
        return { ...prev, [String(id)]: { ...current, [fieldId]: next } };
      }),
      /** The activity rows left by changes made in the right panel, oldest first. */
      activityOf: (id) => activity[String(id)] ?? [],
      /** Adds a row; `merge(lastRow)` may instead return a replacement for the last row (or null to add). */
      addActivity: (id, row, merge) => setActivity((prev) => {
        const list = prev[String(id)] ?? [];
        const merged = merge && list.length ? merge(list[list.length - 1]) : null;
        return { ...prev, [String(id)]: merged ? [...list.slice(0, -1), merged] : [...list, row] };
      }),
    };
  }, [assignees, statuses, tags, customFields, activity]);

  return <ConversationFieldsContext.Provider value={value}>{children}</ConversationFieldsContext.Provider>;
}
