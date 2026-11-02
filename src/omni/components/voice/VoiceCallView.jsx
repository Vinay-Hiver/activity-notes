import React from 'react';
import './VoiceCallView.css';
import SkeletonText from './SkeletonText';
import VoicePlayer from './VoicePlayer';
import ConversationRightPanel from '../ConversationRightPanel';
import { SAMPLE_TRANSCRIPT, VOICE_CALLS, callerLabel } from '../../data/voiceCalls';
import { ActivityGroup } from '../notes/EmailNotes';
import { groupActivity, seedActivity } from '../notes/threadTimeline';
import { useConversationFields } from '../../ConversationFields';

// Icons (from omni-voice-channel)
import sideBarIcon from '../../assets/voice/side-bar-icon.svg';
import incomingCallDg14 from '../../assets/voice/incoming-call-dg-14.svg';
import incomingCallDg10 from '../../assets/voice/incoming-call-dg-10.svg';
import genericAvatar from '../../assets/voice/generic-avatar.svg';
import incomingCall16 from '../../assets/voice/incoming-call-16.svg';
import microphoneIcon from '../../assets/voice/microphone.svg';
import pauseIcon from '../../assets/voice/pause.svg';
import endCallIcon from '../../assets/voice/end-call.svg';
import aiSummaryIcon from '../../assets/voice/ai-summary.svg';
import transcriptIcon from '../../assets/voice/transcript.svg';
import sChevronDown from '../../assets/voice/s-chevron-down.svg';
import sampleAudio from '../../assets/voice/sample-audio.mp3';

// How long "Generating transcript…" shows after a call ends (as in omni-voice-channel).
export const TRANSCRIPT_DELAY_MS = 6000;

const formatTime = (totalSeconds) => {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Voice Shared Inbox: the call list and call detail from omni-voice-channel's
 * ActiveCallView, driven by data/voiceCalls.js, with the storybook right panel.
 */
export default function VoiceCallView({ inboxName, viewType = 'Mine' }) {
  const calls = VOICE_CALLS.filter((c) => c.inbox === inboxName && c.view === viewType);
  const [selectedId, setSelectedId] = React.useState(calls[0]?.id);
  const call = calls.find((c) => c.id === selectedId) || calls[0];

  // Per-call state: ended (after End Call) and whether the transcript is ready.
  const [ended, setEnded] = React.useState({});
  const [transcriptReady, setTranscriptReady] = React.useState({});

  return (
    <div className="active-call-page">
      {/* 1. Left Panel (Call List) */}
      <div className="call-list-panel">
        <div className="subject-bar">
          <div className="subject-left">
            <button className="icon-btn">
              <img src={sideBarIcon} alt="Sidebar" width="16" height="16" />
            </button>
            <div className="subject-title-wrapper">
              <div className="vertical-divider"></div>
              <h2 className="subject-title">{viewType}</h2>
            </div>
          </div>
        </div>
        <div className="call-cards-container">
          {calls.map((c) => {
            const isOngoing = c.status === 'ongoing' && !ended[c.id];
            return (
              <div
                key={c.id}
                className={`voice-call-card ${c.id === call?.id ? 'active' : ''}`}
                onClick={() => setSelectedId(c.id)}
              >
                <div className="card-top">
                  <div className="caller-basic">
                    <img src={isOngoing ? incomingCallDg14 : incomingCall16} alt="" width="16" height="16" />
                    <span className="caller-name">{callerLabel(c)}</span>
                  </div>
                  <span className="card-date">{c.date}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Middle Panel (Call Detail) */}
      {call ? (
        <CallDetail
          key={call.id}
          call={call}
          isEnded={call.status === 'ended' || !!ended[call.id]}
          isTranscriptReady={call.status === 'ended' || !!transcriptReady[call.id]}
          onEndCall={() => {
            setEnded((e) => ({ ...e, [call.id]: true }));
            setTimeout(() => setTranscriptReady((t) => ({ ...t, [call.id]: true })), TRANSCRIPT_DELAY_MS);
          }}
        />
      ) : (
        <div className="call-detail-panel" />
      )}

      {/* 3. Right Panel (storybook). The storybook has no Voice panel yet, so Voice uses the SMS one. */}
      <ConversationRightPanel channel="sms" inboxName={inboxName} unassigned={viewType === 'Unassigned'} conversationId={call?.id} />
    </div>
  );
}

/**
 * The call's activity under its card, as in the other channels: the assignment after the call came in,
 * then changes made in the right panel, grouped into one summary line when there is more than one.
 */
function CallActivity({ call }) {
  const { activityOf } = useConversationFields();
  const rows = [...seedActivity({ id: call.id, firstTime: call.time }).first, ...activityOf(call.id)];
  const groups = groupActivity(rows.map((row) => ({ kind: 'activity', row })));
  return (
    <div className="call-activity">
      {groups.map((g) => <ActivityGroup key={g.key} rows={g.rows} />)}
    </div>
  );
}

export function CallDetail({ call, isEnded, isTranscriptReady, onEndCall }) {
  const [isTranscriptOpen, setIsTranscriptOpen] = React.useState(false);
  const [isExiting, setIsExiting] = React.useState(false);
  const [seconds, setSeconds] = React.useState(call.connectedSeconds || 0);

  // The connected timer ticks while the call is ongoing.
  React.useEffect(() => {
    if (isEnded) return undefined;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [isEnded]);

  return (
    <div className="call-detail-panel">
      <div className="detail-status-bar">
        <div className="status-left">
          <span className="status-title">
            {`Voice call with ${callerLabel(call)}`}
          </span>
        </div>
        {!isEnded && (
          <div className="status-pill-green">
            <img src={incomingCallDg10} alt="" width="10" height="10" />
            <span>Ongoing</span>
          </div>
        )}
      </div>

      <div className="detail-content-area">
        <div className={`call-card-large ${isTranscriptOpen ? 'transcript-open' : ''}`}>
          <div className="card-header-info">
            <div className="header-contact">
              <div className="avatar-med">
                <img src={genericAvatar} alt="Avatar" />
              </div>
              <div className="header-text">
                <span className="contact-name">{callerLabel(call)}</span>
                {/* Number-only callers already show the number as their name */}
                {call.name && <span className="contact-number">{call.phone}</span>}
              </div>
            </div>
            <div className="header-time">{call.time}</div>
          </div>

          {!isEnded ? (
            <div className={`call-player-bar ${isExiting ? 'fade-out' : ''}`}>
              <div className="player-left">
                <img src={incomingCall16} alt="" width="16" height="16" />
                <span>Connected</span>
              </div>
              <span className="player-timer">{formatTime(seconds)}</span>
              <div className="player-actions">
                <div className="call-action-item">
                  <button className="player-action-btn">
                    <img src={microphoneIcon} alt="Mute" width="16" height="16" />
                  </button>
                  <span className="tooltip">Mute</span>
                </div>
                <div className="call-action-item">
                  <button className="player-action-btn">
                    <img src={pauseIcon} alt="Pause" width="16" height="16" />
                  </button>
                  <span className="tooltip">Pause</span>
                </div>
                <div className="call-action-item">
                  <button className="player-action-btn end-call-btn" onClick={() => {
                    setIsExiting(true);
                    setTimeout(() => {
                      setIsExiting(false);
                      onEndCall();
                    }, 150);
                  }}>
                    <img src={endCallIcon} alt="End Call" width="16" height="16" />
                  </button>
                  <span className="tooltip">End Call</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="ended-content-wrapper fade-in">
              <VoicePlayer src={sampleAudio} />

              <div className="ended-bottom-section">
                {!isTranscriptReady ? (
                  /* Generating Transcript View (Temp) */
                  <div className="ended-call-section">
                    <div className="ended-section-header align-start">
                      <div className="icon-generating-wrapper">
                        <img src={transcriptIcon} alt="" width="14" height="14" />
                      </div>
                      <div className="generating-text-wrapper">
                        <p className="generating-title">Generating transcript…</p>
                        <p className="generating-subtitle">AI summary will be available once it’s ready</p>
                      </div>
                    </div>
                    <div className="ended-section-content">
                      <SkeletonText lines={3} />
                    </div>
                  </div>
                ) : (
                  /* AI Summary & Transcript View */
                  <div className="fade-in final-reveal-wrapper">
                    <div className="ended-call-section">
                      <div className="ended-section-header">
                        <img src={aiSummaryIcon} alt="" width="14" height="14" />
                        <span className="ended-section-title">Summary</span>
                      </div>
                      <div className="ended-section-content">
                        <p className="summary-dummy-text">{call.summary}</p>
                      </div>
                    </div>

                    <div className="ended-divider"></div>

                    <div className="ended-call-section transcript-section">
                      <div className="ended-section-header clickable" onClick={() => setIsTranscriptOpen(!isTranscriptOpen)}>
                        <div className="header-left">
                          <img src={transcriptIcon} alt="" width="14" height="14" />
                          <span className="ended-section-title">Transcript</span>
                        </div>
                        <img
                          src={sChevronDown}
                          alt=""
                          className={`chevron-icon ${isTranscriptOpen ? 'up' : ''}`}
                          width="16"
                          height="16"
                        />
                      </div>
                      {isTranscriptOpen && (
                        <div className="ended-section-content transcript-cards-list">
                          {SAMPLE_TRANSCRIPT.map((item, index) => (
                            <div key={index} className={`transcript-card ${item.isAgent ? 'agent-card' : 'customer-card'}`}>
                              <div className="card-header">
                                <div className="card-header-left">
                                  <div className={`card-avatar ${item.isAgent ? 'agent-avatar' : 'customer-avatar'}`}>
                                    {item.isAgent ? 'C' : (
                                      <img src={genericAvatar} alt="" width="14" height="14" />
                                    )}
                                  </div>
                                  <span className="card-name">{item.name}</span>
                                </div>
                                <span className="card-time">{item.time}</span>
                              </div>
                              <div className="card-body">
                                <p>{item.text}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <CallActivity call={call} />
      </div>
    </div>
  );
}
