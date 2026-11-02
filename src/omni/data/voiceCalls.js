// Dummy calls for the Voice Shared Inboxes, grouped by view like channelChats.js.
// The call UI is ported from omni-voice-channel (ActiveCallView): an ongoing call
// shows the connected bar; an ended call shows the recording, Summary and Transcript.

export const VOICE_INBOXES = ['Phone Support'];

// The transcript of the sample recording (src/omni/assets/voice/sample-audio.mp3),
// as in omni-voice-channel. Every ended call plays the same recording.
export const SAMPLE_TRANSCRIPT = [
  { time: '00:00', name: 'Chris Nash', text: 'Hey everybody, my name is Chris Nash.', isAgent: true },
  { time: '00:02', name: 'Chris Nash', text: "It's a new year, which means it's time for a new podcast.", isAgent: true },
  { time: '00:05', name: 'Chris Nash', text: 'Now unlike all of your other favorite podcasts, this one will only take one minute of your time, every time, all the time.', isAgent: true },
  { time: '00:13', name: 'Chris Nash', text: "Sometimes it'll be just me.", isAgent: true },
  { time: '00:15', name: 'Chris Nash', text: "Other times it'll be just you, seriously, submit stuff, your opinions, videos, I want to know what you have to say, I want to share what you have to say.", isAgent: true },
  { time: '00:25', name: 'Chris Nash', text: "Other times I'll be joined by excellent guests, like Cameron Hart of the Turnamental podcast.", isAgent: true },
  { time: '00:30', name: 'Cameron Hart', text: '"Hey Nash, that one minute podcast idea, don\'t do it. It\'s a terrible idea."', isAgent: false },
  { time: '00:34', name: 'Chris Nash', text: 'Swell.', isAgent: true },
  { time: '00:35', name: 'Chris Nash', text: 'Some episodes will be really funny. Other episodes will be really serious.', isAgent: true },
  { time: '00:40', name: 'Chris Nash', text: 'But I guarantee that every episode will be the best minute of your day.', isAgent: true },
  { time: '00:45', name: 'Chris Nash', text: 'Warning, depending on your preferences, one minute podcast may be the worst minute of your day.', isAgent: true },
];

export const VOICE_CALLS = [
  {
    id: 'voice-support-01-mine-0',
    direction: 'Inbound',
    inbox: 'Phone Support',
    view: 'Mine',
    name: null, // number only: the caller has no saved name
    phone: '+91 98765 43210',
    date: 'Mar 12',
    time: 'Mar 12, 11:22 AM',
    status: 'ongoing',
    connectedSeconds: 42,
    summary: "The customer called to inquire about the delay in their order #12345. I explained that the shipment was held up due to weather conditions at the hub. They were understanding and requested an email update once the status changes to 'Out for delivery'. I have set a follow-up task for tomorrow morning.",
  },
  {
    id: 'voice-support-01-mine-1',
    direction: 'Inbound',
    duration: '4m 32s',
    inbox: 'Phone Support',
    view: 'Mine',
    name: 'Dakota Wilder',
    phone: '+1 (555) 014-2290',
    date: 'Mar 12',
    time: 'Mar 12, 09:48 AM',
    status: 'ended',
    summary: 'Dakota called because their invoice for February was charged twice. I confirmed the duplicate charge and raised a refund for the second payment. They asked for a confirmation email with the refund reference, which I sent during the call.',
  },
  {
    id: 'voice-support-01-unassigned-0',
    direction: 'Inbound',
    duration: '2m 18s',
    inbox: 'Phone Support',
    view: 'Unassigned',
    name: 'Priya Nair',
    phone: '+1 (555) 018-7731',
    date: 'Mar 11',
    time: 'Mar 11, 04:15 PM',
    status: 'ended',
    summary: 'Priya wanted to upgrade her team from the Pro plan to Enterprise and asked about pricing for 40 seats. She would like a demo of the SLA and reporting features before deciding, and asked for someone from sales to call her back this week.',
  },
];

/** What to call a caller: their name, or their number when there is no name. */
export const callerLabel = (call) => call.name || call.phone;

export const voiceViewCount = (inbox, view) => VOICE_CALLS.filter((c) => c.inbox === inbox && c.view === view).length;
export const voiceInboxTotal = (inbox) => VOICE_CALLS.filter((c) => c.inbox === inbox).length;
