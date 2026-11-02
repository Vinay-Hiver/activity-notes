import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import './App.css';
import Sidebar from './Sidebar';
import ConversationList from './components/ConversationList';
import ConversationDetail from './components/ConversationDetail';
import ConversationRightPanel from './components/ConversationRightPanel';
import ChannelChatView from './components/ChannelChatView';
import VoiceCallView from './components/voice/VoiceCallView';
import { VOICE_INBOXES } from './data/voiceCalls';
import { CHANNEL_BY_INBOX } from './data/channelChats';
import SettingsPage from './pages/SettingsPage';
import MySettingsPage from './pages/MySettingsPage';
import { useState } from 'react';
import { conversationsData } from './data/emailConversations';
import { INITIAL_VIEWS_BY_INBOX } from './data/dummyViews';
import { useCurrentUser } from './CurrentUser';


// Fallback dummy threads for views (e.g. Team, Tickets, Pending, Closed,
// custom views) that don't have hand-authored conversation data above.
const DUMMY_SENDERS = [
  { sender: 'Priya Nair', initial: 'P', avatarColor: 'var(--pastelVioletBorderDefault)', email: 'priya.nair@acme.com' },
  { sender: 'Marcus Lee', initial: 'M', avatarColor: 'var(--pastelLightBlueBorderDefault)', email: 'marcus.lee@brightbox.io' },
  { sender: 'Sofia Reyes', initial: 'S', avatarColor: 'var(--pastelOrangeSurfaceDefault)', email: 'sofia.reyes@northwind.com' },
  { sender: 'Daniel Kim', initial: 'D', avatarColor: 'var(--pastelRedBorderDefault)', email: 'daniel.kim@vertex.co' },
  { sender: 'Grace Okafor', initial: 'G', avatarColor: 'var(--pastelVioletBorderDefault)', email: 'grace.okafor@lumen.com' },
  { sender: 'Tom Becker', initial: 'T', avatarColor: 'var(--pastelLightBlueBorderDefault)', email: 'tom.becker@fernco.com' },
  { sender: 'Hana Sato', initial: 'H', avatarColor: 'var(--pastelOrangeSurfaceDefault)', email: 'hana.sato@orbital.io' },
  { sender: 'Liam Walsh', initial: 'L', avatarColor: 'var(--pastelRedBorderDefault)', email: 'liam.walsh@acme.com' },
  { sender: 'Ava Patel', initial: 'A', avatarColor: 'var(--pastelVioletBorderDefault)', email: 'ava.patel@horizon.org' },
  { sender: 'Noah Khan', initial: 'N', avatarColor: 'var(--pastelLightBlueBorderDefault)', email: 'noah.khan@apex.com' },
  { sender: 'Arlene McCoy', initial: 'A', avatarColor: 'var(--pastelOrangeSurfaceDefault)', email: 'arlene.mccoy@vanguard.com' },
  { sender: 'Guy Hawkins', initial: 'G', avatarColor: 'var(--pastelRedBorderDefault)', email: 'guy.hawkins@nexus.io' },
  { sender: 'Courtney Henry', initial: 'C', avatarColor: 'var(--pastelVioletBorderDefault)', email: 'courtney.henry@starlight.com' },
  { sender: 'Darlene Robertson', initial: 'D', avatarColor: 'var(--pastelLightBlueBorderDefault)', email: 'darlene.robertson@pulse.com' },
  { sender: 'Eleanor Pena', initial: 'E', avatarColor: 'var(--pastelOrangeSurfaceDefault)', email: 'eleanor.pena@summit.io' },
  { sender: 'Floyd Miles', initial: 'F', avatarColor: 'var(--pastelRedBorderDefault)', email: 'floyd.miles@beacon.com' },
];

const DUMMY_SUBJECTS = [
  { subject: 'Need help with account setup', preview: 'I followed the steps but still can\'t log in.' },
  { subject: 'Order not received yet', preview: 'It has been over a week since I placed the order.' },
  { subject: 'Question about pricing plan', preview: 'Can you clarify what is included in the pro tier?' },
  { subject: 'Feature request: dark mode', preview: 'Would love to see a dark mode option added.' },
  { subject: 'Unable to reset password', preview: 'The reset link keeps expiring before I can use it.' },
  { subject: 'Integration not syncing', preview: 'Data stopped syncing since yesterday afternoon.' },
  { subject: 'Follow-up on previous ticket', preview: 'Just checking in on the status of this request.' },
  { subject: 'Thank you for the quick fix', preview: 'Everything is working well now, appreciate it!' },
];

const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const generateDummyConversations = (inbox, type) => {
  const seed = hashString(`${inbox}|${type}`);
  const count = 4 + (seed % 5); // 4-8 threads
  return Array.from({ length: count }, (_, i) => {
    const person = DUMMY_SENDERS[(seed + i) % DUMMY_SENDERS.length];
    const topic = DUMMY_SUBJECTS[(seed + i * 3) % DUMMY_SUBJECTS.length];
    return {
      id: `dummy-${inbox}-${type}-${i}`,
      inbox,
      type,
      sender: person.sender,
      initial: person.initial,
      avatarColor: person.avatarColor,
      time: 'Feb 4, 0' + (1 + (i % 9)) + ':00 PM',
      subject: topic.subject,
      preview: topic.preview,
      threadCount: 1 + (i % 3),
      messages: [
        {
          id: 'm1',
          sender: person.sender,
          email: person.email,
          time: 'Feb 4, 0' + (1 + (i % 9)) + ':00 PM',
          initial: person.initial,
          avatarColor: person.avatarColor,
          body: `Hi,\n\n${topic.preview}\n\nLooking forward to your help.`
        },
        {
          id: 'm2',
          sender: 'Ruben Geidt',
          email: 'ruben@acme.com',
          time: 'Feb 4, 0' + (1 + ((i + 1) % 9)) + ':30 PM',
          initial: 'R',
          avatarColor: 'var(--pastelLightBlueBorderDefault)',
          body: 'Thanks for reaching out — taking a look into this now and will follow up shortly.'
        }
      ]
    };
  });
};

// Each user opens on the Unassigned view of the first inbox they are a member of.
const firstInboxFor = (user) =>
  Object.keys(INITIAL_VIEWS_BY_INBOX).find((name) => !user.hiddenInboxes?.includes(name));

function App() {
  const { user } = useCurrentUser();
  const [activeFilter, setActiveFilter] = useState(() => ({ inbox: firstInboxFor(user), type: 'Unassigned' }));
  const [selectedId, setSelectedId] = useState(null);

  // Prototype role — All Views pins Team Favourites as Admin. No toggle UI.
  const activeRole = 'Admin';

  const dummyCacheRef = React.useRef({});

  const filteredConversations = React.useMemo(() => {
    const real = conversationsData.filter(c =>
      c.inbox === activeFilter.inbox && c.type === activeFilter.type
    );
    if (real.length > 0) return real;

    const key = `${activeFilter.inbox}|${activeFilter.type}`;
    if (!dummyCacheRef.current[key]) {
      dummyCacheRef.current[key] = generateDummyConversations(activeFilter.inbox, activeFilter.type);
    }
    return dummyCacheRef.current[key];
  }, [activeFilter.inbox, activeFilter.type]);

  const location = useLocation();
  React.useEffect(() => {
    // Each route/page sets its own title (e.g. SettingsPage). Only own the
    // mailbox title here so this always-mounted component doesn't clobber it.
    if (location.pathname === '/') {
      document.title = 'Activity and Notes';
    }
  }, [location.pathname]);

  React.useEffect(() => {
    if (filteredConversations.length > 0) {
      setSelectedId(filteredConversations[0].id);
    } else {
      setSelectedId(null);
    }
  }, [activeFilter.inbox, activeFilter.type]);

  const [signatures, setSignatures] = useState([]);
  const [defaultSignatureId, setDefaultSignatureId] = useState(null);

  const selectedConversation = conversationsData.find(c => c.id === selectedId)
    || filteredConversations.find(c => c.id === selectedId);

  return (
    <div className="app-container">
      <Routes>
        <Route path="/" element={
          <>
            <Sidebar
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              activeRole={activeRole}
            />
            {VOICE_INBOXES.includes(activeFilter.inbox) ? (
              <VoiceCallView key={`${activeFilter.inbox}|${activeFilter.type}`} inboxName={activeFilter.inbox} viewType={activeFilter.type} />
            ) : CHANNEL_BY_INBOX[activeFilter.inbox] ? (
              <ChannelChatView key={`${activeFilter.inbox}|${activeFilter.type}`} inboxName={activeFilter.inbox} viewType={activeFilter.type} />
            ) : (
              <>
                <ConversationList
                  conversations={filteredConversations}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  activeFilter={activeFilter}
                />
                <ConversationDetail
                  conversation={selectedConversation}
                  signatures={signatures}
                  setSignatures={setSignatures}
                  defaultSignatureId={defaultSignatureId}
                />
                <ConversationRightPanel channel="email" ticketId={selectedConversation?.ticketId} inboxName={activeFilter.inbox} unassigned={activeFilter.type === 'Unassigned'} conversationId={String(selectedId)} />
              </>
            )}
          </>
        } />
        <Route path="/admin-panel" element={
          <SettingsPage
            signatures={signatures}
            setSignatures={setSignatures}
            defaultSignatureId={defaultSignatureId}
            setDefaultSignatureId={setDefaultSignatureId}
          />
        } />
        <Route path="/my-settings" element={<MySettingsPage />} />
      </Routes>
    </div>
  );
}

export default App;
