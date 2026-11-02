// The custom fields every email inbox has (Figma: Tickets Add/Merge › 4023:11145).
// Custom fields come in four kinds (text, number, dropdown, date); this prototype uses one text and two number fields.
export const CUSTOM_FIELDS = [
  { id: 'order-number', label: 'Order number', kind: 'number' },
  { id: 'plan-name', label: 'Plan name', kind: 'text' },
  { id: 'seats', label: 'Seats', kind: 'number' },
];

const PLANS = ['Starter', 'Growth', 'Business', 'Enterprise', 'Pro Annual'];

const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return hash;
};

// Starting values, picked from the conversation id so they stay the same on every load.
// Roughly a third of the values are left empty (the field shows "Empty").
export const defaultCustomFieldsFor = (id) => {
  const values = {};
  CUSTOM_FIELDS.forEach((field) => {
    const h = hashString(`${id}:${field.id}`);
    if (h % 3 === 0) return;
    if (field.id === 'order-number') values[field.id] = String(100000 + (h % 900000));
    else if (field.id === 'plan-name') values[field.id] = PLANS[(h >>> 4) % PLANS.length];
    else values[field.id] = String(1 + ((h >>> 4) % 250));
  });
  return values;
};
