import React from 'react';

// The notes in every email thread: { [conversationId]: { notes, pin: { id, by } | null } }.
// Shared by every user (it sits above CurrentUserProvider), so a note Michael adds shows in Jim's view too.

const EmailNotesContext = React.createContext({ threads: {}, setThreads: () => {} });

export const useEmailNotes = () => React.useContext(EmailNotesContext);

export function EmailNotesProvider({ children }) {
  const [threads, setThreads] = React.useState({});
  const value = React.useMemo(() => ({ threads, setThreads }), [threads]);
  return <EmailNotesContext.Provider value={value}>{children}</EmailNotesContext.Provider>;
}
