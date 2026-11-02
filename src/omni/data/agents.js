// The people a conversation can be assigned to, in every inbox: the two people you can view the
// prototype as (see CurrentUser.jsx) and four teammates. `color` is an Avatar colour.
export const AGENTS = [
  { value: 'michael', label: 'Michael Scott', color: 'red' },
  { value: 'jim', label: 'Jim Halpert', color: 'lightBlue' },
  { value: 'pam', label: 'Pam Beesly', color: 'orange' },
  { value: 'dwight', label: 'Dwight Schrute', color: 'green' },
  { value: 'angela', label: 'Angela Martin', color: 'purple' },
  { value: 'stanley', label: 'Stanley Hudson', color: 'violet' },
];

/** The Assignee list as `userId` sees it: their own name ends in "(Me)". */
export const agentOptionsFor = (userId) => AGENTS.map((a) => (a.value === userId ? { ...a, label: `${a.label} (Me)` } : a));

/** The 32px avatar background for each Avatar colour, for avatars drawn outside the HOT Avatar (Slack messages). */
export const AVATAR_BG = {
  red: 'var(--pastelRed400)',
  lightBlue: 'var(--pastelLightBlueBorderDefault)',
  orange: 'var(--pastelOrangeBorderDefault)',
  green: 'var(--pastelGreenSurfaceDefault)',
  purple: 'var(--pastelPurpleBorderDefault)',
  violet: 'var(--pastelVioletBorderDefault)',
  yellow: 'var(--pastelYellowBorderDefault)',
  grey: 'var(--slateTextDisabled)',
};
