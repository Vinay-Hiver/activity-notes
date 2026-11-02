import { assigneeName, initialFieldsOf } from '../../ConversationFields';

// What a thread shows besides its messages, for every channel: the conversation's starting history
// and the way activity is grouped (as in Front: everything between two messages or notes is one group).

// Who handed the conversation over in the "assigned this conversation to" row.
const ASSIGNER = { id: 'jim', name: 'Jim Halpert' };

const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return hash;
};

/**
 * The starting history of conversation `id`: who it was assigned to after its first message (`firstTime`).
 * `last` (rows after the last message) is empty for now. Each row is one event with a `kind`,
 * so a group of them can be summed up ("2 tags added").
 */
export function seedActivity({ id, firstTime }) {
  const start = initialFieldsOf(id);
  // People are { id, name }, so the viewer reads themselves as "You" (see activityText).
  const owner = start.assignee !== 'none' ? { id: start.assignee, name: assigneeName(start.assignee) } : null;
  const key = `seed-${id}`;
  // Every conversation is assigned right after its first message, one of two ways (picked from its id,
  // so it stays the same on every load). The person reads it from where they stand:
  //   "Assigned to Michael Scott through auto assignment"
  //   Jim reads "You assigned this conversation to Michael Scott"; Michael reads "Jim Halpert assigned this conversation to you".
  const assignee = owner ?? { id: 'michael', name: assigneeName('michael') };
  const assignRow = hashString(String(id)) % 2 === 0
    ? { verb: 'assigned to', object: assignee, suffix: 'through auto assignment' }
    : { actor: ASSIGNER, verb: 'assigned this conversation to', object: assignee };
  return {
    first: [{ id: `${key}-assign`, kind: 'assignee', icon: 'assigned', time: firstTime, ...assignRow }],
    // Nothing else is added by default: tags, status and the rest come from changes made in the right panel.
    last: [],
  };
}

/**
 * Puts activity rows that follow each other into one group. `items` are { kind: 'activity', row } or
 * anything else (a message or a note), which ends the group. Returns the same items with each run of
 * activity replaced by { kind: 'activity', key, rows }.
 */
export function groupActivity(items) {
  return items.reduce((out, item) => {
    const prev = out[out.length - 1];
    if (item.kind === 'activity' && prev?.kind === 'activity') prev.rows.push(item.row);
    else out.push(item.kind === 'activity' ? { kind: 'activity', key: item.row.id, rows: [item.row] } : item);
    return out;
  }, []);
}
