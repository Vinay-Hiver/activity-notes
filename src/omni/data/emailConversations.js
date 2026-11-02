// Dummy email conversations for the Email Shared Inboxes (moved out of App.jsx so
// the link-conversation search can index them).
export const conversationsData = [
  // --- Email: Mine (2) ---
  {
    id: 1,
    inbox: 'Customer Support',
    type: 'Mine',
    sender: 'John Smith',
    initial: 'J',
    avatarColor: 'var(--pastelRedBorderDefault)',
    time: 'Feb 4, 02:45 PM',
    subject: 'Issue with the app',
    preview: 'I am seeing a blank screen after login.',
    threadCount: 3,
    messages: [
      {
        id: 'm1',
        sender: 'John Smith',
        email: 'john.smith@gmail.com',
        time: 'Feb 4, 01:20 PM',
        initial: 'J',
        avatarColor: 'var(--pastelRedBorderDefault)',
        body: 'Hi Support,\n\nI am experiencing a blank screen after logging in to the mobile app. Can you please help?'
      },
      {
        id: 'm2',
        sender: 'Ruben Geidt',
        email: 'ruben@acme.com',
        time: 'Feb 4, 02:00 PM',
        initial: 'R',
        avatarColor: 'var(--pastelLightBlueBorderDefault)',
        body: 'Hello John,\n\nI am looking into this. Could you let me know which device you are using?'
      },
      {
        id: 'm3',
        sender: 'John Smith',
        email: 'john.smith@gmail.com',
        time: 'Feb 4, 02:45 PM',
        initial: 'J',
        avatarColor: 'var(--pastelRedBorderDefault)',
        body: 'I am using an iPhone 15 Pro with the latest iOS update.'
      }
    ]
  },
  {
    id: 2,
    ticketId: 'TKT#3', // a ticket: email conversation with the ticket right panel
    inbox: 'Customer Support',
    type: 'Mine',
    sender: 'Alice Johnson',
    initial: 'A',
    avatarColor: 'var(--pastelVioletBorderDefault)',
    time: 'Feb 4, 11:30 AM',
    subject: 'Refund status',
    preview: 'Has the refund been processed yet?',
    threadCount: 2,
    messages: [
      {
        id: 'm1',
        sender: 'Alice Johnson',
        email: 'alice.j@outlook.com',
        time: 'Feb 4, 10:00 AM',
        initial: 'A',
        avatarColor: 'var(--pastelVioletBorderDefault)',
        body: 'Hello,\n\nI requested a refund last week but haven\'t seen it in my account yet. Any updates?'
      },
      {
        id: 'm2',
        sender: 'Ruben Geidt',
        email: 'ruben@acme.com',
        time: 'Feb 4, 11:30 AM',
        initial: 'R',
        avatarColor: 'var(--pastelLightBlueBorderDefault)',
        body: 'Hi Alice,\n\nI\'ve checked the status and the refund was approved yesterday. It should appear in your account within 3-5 business days.'
      }
    ]
  },

  // --- Email: Unassigned (2) ---
  {
    id: 4,
    inbox: 'Customer Support',
    type: 'Unassigned',
    sender: 'Emily Watson',
    initial: 'E',
    avatarColor: 'var(--pastelOrangeSurfaceDefault)',
    time: 'Feb 4, 05:10 PM',
    subject: 'Billing inquiry',
    preview: 'Why was I charged twice this month?',
    threadCount: 2,
    messages: [
      {
        id: 'm1',
        sender: 'Emily Watson',
        email: 'emily.w@designcorp.com',
        time: 'Feb 4, 04:00 PM',
        initial: 'E',
        avatarColor: 'var(--pastelOrangeSurfaceDefault)',
        body: 'Hi,\n\nI noticed two separate charges from your service on my bank statement this morning. Can you please explain why?'
      },
      {
        id: 'm2',
        sender: 'System Bot',
        email: 'no-reply@acme.com',
        time: 'Feb 4, 04:05 PM',
        initial: 'S',
        avatarColor: '#94a3b8',
        body: 'Thank you for your inquiry. A support representative will be with you shortly to look into this billing discrepancy.'
      }
    ]
  },
  {
    id: 5,
    ticketId: 'TKT#7', // a ticket: email conversation with the ticket right panel
    inbox: 'Customer Support',
    type: 'Unassigned',
    sender: 'David Chen',
    initial: 'D',
    avatarColor: 'var(--pastelPurpleTextBody)',
    time: 'Feb 4, 01:20 PM',
    subject: 'API documentation question',
    preview: 'How do I authenticate with the latest version?',
    threadCount: 3,
    messages: [
      {
        id: 'm1',
        sender: 'David Chen',
        email: 'david.chen@tech.io',
        time: 'Feb 4, 10:00 AM',
        initial: 'D',
        avatarColor: 'var(--pastelPurpleTextBody)',
        body: 'Hello,\n\nI\'m migrating to version 2 of your API but I\'m getting an auth error. The docs seem to only cover version 1.'
      },
      {
        id: 'm2',
        sender: 'Support Bot',
        email: 'support-bot@acme.com',
        time: 'Feb 4, 10:05 AM',
        initial: 'S',
        avatarColor: '#94a3b8',
        body: 'We have received your message. A technical support specialist will review your inquiry about API v2 authentication.'
      },
      {
        id: 'm3',
        sender: 'David Chen',
        email: 'david.chen@tech.io',
        time: 'Feb 4, 01:20 PM',
        initial: 'D',
        avatarColor: 'var(--pastelPurpleTextBody)',
        body: 'Any update on this? I\'m currently blocked on my development task.'
      }
    ]
  },

  // --- More tickets: 3 per Email inbox ---
  {
    id: 31,
    ticketId: 'TKT#18', // a ticket: email conversation with the ticket right panel
    inbox: "Customer Support",
    type: "Mine",
    sender: "Nina Patel",
    initial: "N",
    avatarColor: "var(--pastelGreenBorderDefault)",
    time: "Feb 4, 03:05 PM",
    subject: "Export to CSV fails",
    preview: "The CSV export stops at 1,000 rows.",
    threadCount: 2,
    messages: [
      {
        id: 'm1',
        sender: "Nina Patel",
        email: "nina.patel@brightlane.io",
        time: "Feb 4, 03:05 PM",
        initial: "N",
        avatarColor: "var(--pastelGreenBorderDefault)",
        body: "Hi Support,\n\nWhen I export our contacts to CSV, the file stops at 1,000 rows. We have around 4,200 contacts. Is there a limit?"
      },
      {
        id: 'm2',
        sender: "Ruben Geidt",
        email: "ruben@acme.com",
        time: "Feb 4, 03:05 PM",
        initial: "R",
        avatarColor: "var(--pastelLightBlueBorderDefault)",
        body: "Hi Nina,\n\nThanks for flagging this. I have raised a ticket with engineering and will update you as soon as the fix is out."
      }
    ]
  },
  {
    id: 32,
    ticketId: 'TKT#21', // a ticket: email conversation with the ticket right panel
    inbox: "Customer Support",
    type: "Mine",
    sender: "Omar Haddad",
    initial: "O",
    avatarColor: "var(--pastelOrangeBorderDefault)",
    time: "Feb 3, 05:40 PM",
    subject: "Two-factor codes not arriving",
    preview: "I am not receiving the 2FA codes by SMS.",
    threadCount: 2,
    messages: [
      {
        id: 'm1',
        sender: "Omar Haddad",
        email: "omar@haddadlabs.com",
        time: "Feb 3, 05:40 PM",
        initial: "O",
        avatarColor: "var(--pastelOrangeBorderDefault)",
        body: "Hello,\n\nSince yesterday I am not receiving two-factor codes by SMS, so I cannot sign in. My number has not changed."
      },
      {
        id: 'm2',
        sender: "Ruben Geidt",
        email: "ruben@acme.com",
        time: "Feb 3, 05:40 PM",
        initial: "R",
        avatarColor: "var(--pastelLightBlueBorderDefault)",
        body: "Hi Omar,\n\nI have switched your account to email-based codes for now so you can sign in. We are checking the SMS provider."
      }
    ]
  },
  {
    id: 33,
    ticketId: 'TKT#24', // a ticket: email conversation with the ticket right panel
    inbox: "Customer Support",
    type: "Unassigned",
    sender: "Clara Jensen",
    initial: "C",
    avatarColor: "var(--pastelVioletBorderDefault)",
    time: "Feb 4, 09:12 AM",
    subject: "Dashboard loads very slowly",
    preview: "The analytics dashboard takes over a minute to load.",
    threadCount: 1,
    messages: [
      {
        id: 'm1',
        sender: "Clara Jensen",
        email: "clara.jensen@northpeak.co",
        time: "Feb 4, 09:12 AM",
        initial: "C",
        avatarColor: "var(--pastelVioletBorderDefault)",
        body: "Hi,\n\nOur analytics dashboard takes more than a minute to load every morning. It was fast last week. Can you take a look?"
      }
    ]
  }
];
