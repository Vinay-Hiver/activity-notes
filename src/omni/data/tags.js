// Every tag that can be put on a conversation. `color` is a Tag component colour.
export const TAGS = [
  { value: 'billing', label: 'Billing', color: 'violet' },
  { value: 'urgent', label: 'Urgent', color: 'red' },
  { value: 'bug', label: 'Bug', color: 'orange' },
  { value: 'feature-request', label: 'Feature request', color: 'lightBlue' },
  { value: 'refund', label: 'Refund', color: 'yellow' },
  { value: 'vip', label: 'VIP', color: 'green' },
];

const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return hash;
};

// Two different tags per conversation, picked from its id so they stay the same on every load.
export const defaultTagsFor = (id) => {
  const h = hashString(String(id));
  const first = h % TAGS.length;
  const second = (first + 1 + ((h >>> 8) % (TAGS.length - 1))) % TAGS.length;
  return [TAGS[first].value, TAGS[second].value];
};
