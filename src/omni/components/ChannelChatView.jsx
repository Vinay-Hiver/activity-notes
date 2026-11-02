import React, { useState } from 'react';
import ConversationList from './ChannelConversationList/ConversationList';
import SlackConversationList from './SlackConversationList/SlackConversationList';
import ChatPanel from './ChatPanel/ChatPanel';
import SlackChatPanel from './SlackChatPanel/SlackChatPanel';
import ConversationRightPanel from './ConversationRightPanel';
import { CHANNEL_BY_INBOX, CHANNEL_CHATS } from '../data/channelChats';

/**
 * Chat-style view for Chat / Slack / WhatsApp Shared Inboxes.
 * Slack uses its own conversation list + chat panel; each channel uses the
 * storybook Right Panel for its channel.
 */
export default function ChannelChatView({ inboxName, viewType = 'Mine' }) {
  const channel = CHANNEL_BY_INBOX[inboxName] || 'chat';
  const all = CHANNEL_CHATS[inboxName] || [];
  // Show only the conversations for the active view (e.g. Unassigned).
  const conversations = all.filter((c) => c.view === viewType);
  const [selectedId, setSelectedId] = useState(conversations[0]?.id);

  const conversation = conversations.find((c) => c.id === selectedId) || conversations[0];
  const isSlack = channel === 'slack';

  return (
    <>
      {isSlack ? (
        <SlackConversationList
          conversations={conversations}
          selectedId={selectedId}
          onSelect={setSelectedId}
          title={viewType}
        />
      ) : (
        <ConversationList
          channel={channel}
          conversations={conversations}
          selectedId={selectedId}
          onSelect={setSelectedId}
          title={viewType}
        />
      )}

      {isSlack ? (
        <SlackChatPanel key={selectedId} inboxName={inboxName} conversation={conversation} />
      ) : (
        <ChatPanel key={selectedId} channel={channel} conversation={conversation} />
      )}

      <ConversationRightPanel channel={channel} inboxName={inboxName} unassigned={viewType === 'Unassigned'} conversationId={conversation?.id} />
    </>
  );
}
