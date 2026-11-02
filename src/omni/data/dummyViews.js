// Dummy Views data per Shared Inbox.
// `views` holds every View in the inbox (system + custom), in catalogue order.
// `favouriteIds` is keyed by role — Admin and Agent each have their own
// personal favourites, kept entirely separate — with each value the ordered
// list of favourited View ids for that inbox (max 5 personal, separately
// capped from `teamFavouriteIds`).
// `sidebarOrder` (also keyed by role) is the single merged, drag-reorderable
// order of every id currently in favouriteIds[role] or teamFavouriteIds —
// personal and Team Favourites can be freely reordered against each other
// in this one list. The first 5 entries are what shows in the home nav.

// Standard set of system views shared by every inbox, with per-inbox counts.
const systemViews = (counts) => [
  { id: 'mine', name: 'Mine', type: 'system', icon: 'mine', count: counts.mine },
  { id: 'unassigned', name: 'Unassigned', type: 'system', icon: 'unassigned', count: counts.unassigned },
  { id: 'team', name: 'Team', type: 'system', icon: 'team', count: counts.team },
  { id: 'tickets', name: 'Tickets', type: 'system', icon: 'tickets', count: counts.tickets },
  { id: 'pending', name: 'Pending', type: 'system', icon: 'pending', count: counts.pending },
  { id: 'closed', name: 'Closed', type: 'system', icon: 'closed', count: counts.closed },
];

// Build an inbox in the standard format. `fav` is the personal-favourite id
// order (same for Admin & Agent by default); it drives the home-nav rows.
const makeInbox = (views, fav = ['mine'], channel = 'email') => ({
  channel,
  views,
  favouriteIds: { Admin: fav, Agent: fav },
  sidebarOrder: { Admin: fav, Agent: fav },
  teamFavouriteIds: [],
});

// One Shared Inbox per channel. Order shown in the sidebar: Chat, Slack, WhatsApp, SMS, Voice, Email.
export const INITIAL_VIEWS_BY_INBOX = {
  'Website Chat': makeInbox([
    ...systemViews({ mine: 2, unassigned: 2, team: 0, tickets: 0, pending: 0, closed: 0 }),
  ], ['mine'], 'chat'),
  'Slack Connect': makeInbox([
    ...systemViews({ mine: 2, unassigned: 2, team: 0, tickets: 0, pending: 0, closed: 0 }),
  ], ['mine'], 'slack'),
  'WhatsApp Support': makeInbox([
    ...systemViews({ mine: 2, unassigned: 2, team: 0, tickets: 0, pending: 0, closed: 0 }),
  ], ['mine'], 'whatsapp'),
  'SMS Support': makeInbox([
    ...systemViews({ mine: 2, unassigned: 2, team: 0, tickets: 0, pending: 0, closed: 0 }),
  ], ['mine'], 'sms'),
  'Phone Support': makeInbox([
    ...systemViews({ mine: 2, unassigned: 1, team: 0, tickets: 0, pending: 0, closed: 0 }),
  ], ['mine'], 'voice'),
  'Customer Support': makeInbox([
    ...systemViews({ mine: 4, unassigned: 3, team: 0, tickets: 0, pending: 0, closed: 0 }),
  ], ['mine', 'unassigned'], 'email'),
};

export const MAX_FAVOURITES = 5;
