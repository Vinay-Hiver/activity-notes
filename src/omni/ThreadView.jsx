import React from 'react';
import { ActivityPulse } from '../icons/ActivityPulse';

/**
 * "Hide notes" and "Hide activity" from the conversation ⋮ menu. Both start off; either or both can be on.
 * Messages always stay visible. The choice carries over as you switch conversations (and channels) in this
 * tab, but it lives in memory only, so a reload starts with both off again.
 */
const ThreadViewContext = React.createContext(null);

export const HIDE_NOTES = { value: 'hide-notes', label: 'Hide notes', icon: 'note' };
// Its icon is not in the HOT set, so the row passes it as `leading`, styled like the other 14px row icons.
export const HIDE_ACTIVITY = {
  value: 'hide-activity',
  label: 'Hide activity',
  leading: <span className="hot-list-el hot-list-icon"><ActivityPulse size={14} /></span>,
};
export const THREAD_VIEW_OPTIONS = [HIDE_NOTES, HIDE_ACTIVITY];

export function ThreadViewProvider({ children }) {
  const [hideNotes, setHideNotes] = React.useState(false);
  const [hideActivity, setHideActivity] = React.useState(false);
  const value = React.useMemo(() => ({
    hideNotes,
    hideActivity,
    /** The menu values that are on, for the ticks. */
    selected: [hideNotes && HIDE_NOTES.value, hideActivity && HIDE_ACTIVITY.value].filter(Boolean),
    /** Flips one option; returns false for any other menu value. */
    toggle: (v) => {
      if (v === HIDE_NOTES.value) { setHideNotes((on) => !on); return true; }
      if (v === HIDE_ACTIVITY.value) { setHideActivity((on) => !on); return true; }
      return false;
    },
    /** Drops hidden notes and activity from a list of thread items ({ kind: 'message' | 'note' | 'activity' }). */
    visible: (items) => items.filter((i) => !(hideNotes && i.kind === 'note') && !(hideActivity && i.kind === 'activity')),
  }), [hideNotes, hideActivity]);
  return <ThreadViewContext.Provider value={value}>{children}</ThreadViewContext.Provider>;
}

export function useThreadView() {
  const ctx = React.useContext(ThreadViewContext);
  if (!ctx) throw new Error('useThreadView must be used inside ThreadViewProvider');
  return ctx;
}
