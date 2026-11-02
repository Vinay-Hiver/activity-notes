import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  UserIcon, TagIcon, BuildingIcon, GlobeIcon, PhoneIcon, MailIcon, ClockIcon,
  ChatBubbleIcon, CircleIcon, CheckCircleIcon, DocumentIcon, BoltIcon, WidgetsIcon,
  ChevronDownIcon, SearchIcon,
} from './icons/Icon';
import customFieldsIcon from '../icons/custom-fields-icon.svg';
import skillsIcon from '../icons/skills-icon.svg';
import activityNotesIcon from '../icons/activity-notes.svg';
import contactIcon from '../icons/contact-icon.svg';
import dragIcon from '../icons/drag-icon.svg';
import accountIcon from '../icons/account-icon.svg';
import assigneeIcon from '../icons/assignee-icon.svg';
import statusIcon from '../icons/status-icon.svg';
import tagsIcon from '../icons/tags-icon.svg';
import nameIcon from '../icons/name-icon.svg';
import emailIcon from '../icons/email-icon.svg';
import dropdownIcon from '../icons/dropdown-icon.svg';
import dateIcon from '../icons/date-icon.svg';
import numberIcon from '../icons/number-icon.svg';
import textIcon from '../icons/text-icon.svg';
import settingsIcon from '../icons/settings-icon.svg';
import clickupIcon from '../icons/clickup.svg';
import salesforceIcon from '../icons/salesforce.svg';
import asanaIcon from '../icons/asana.svg';
import moreIcon from '../icons/more.svg';
import sidebarIcon from '../icons/sidebar-icon.svg';
import mailboxRpIcon from '../icons/mailbox-rp-icon.svg';
import rpConversationsIcon from '../icons/rp-conversations.svg';
import accountSubtleIcon from '../icons/account-icon-subtle.svg';
import slackChannelIcon from '../assets/icons/channels/slack.svg';
import './RightPanel.css';

const Img = ({ src, size = 16 }) => <img src={src} width={size} height={size} alt="" />;

// Small inline icons for the Chat-details fields.
const LinkIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
  </svg>
);
const MonitorIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" />
  </svg>
);
const BrowserIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 8h18M7 6h.01M10 6h.01" />
  </svg>
);
const RP_EMPTY = <span className="rp-value-empty">Empty</span>;

function AccordionChevron({ open }) {
  return (
    <span className={`rp-chevron ${open ? 'rp-chevron--open' : 'rp-chevron--closed'}`}>
      <ChevronDownIcon size={16} />
    </span>
  );
}

// Blue checkbox matching the design (filled primary + white tick when checked).
function CheckBox({ checked, onChange }) {
  return (
    <button type="button" className={`rp-cb ${checked ? 'rp-cb--checked' : ''}`} onClick={onChange} role="checkbox" aria-checked={checked}>
      {checked && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12l5 5 9-11" />
        </svg>
      )}
    </button>
  );
}

const ASSIGNEES = [
  { id: 'praveen', name: 'Praveen Borawar (Me)', color: '#d96d71' },
  { id: 'akash', name: 'Akash M', color: '#e0b83a' },
  { id: 'ankita', name: 'Ankita T', color: '#9b7fd4' },
  { id: 'ashuthosh', name: 'Ashuthosh Dubey', color: '#7b8bd4' },
  { id: 'bharad', name: 'Bharad', color: '#7b8bd4' },
  { id: 'dikshit', name: 'Dikshit M', color: '#d96d71' },
  { id: 'dilip', name: 'Dilip Kumar', color: '#9b7fd4' },
  { id: 'gerald', name: 'Gerald the Manager', color: '#d96d71' },
  { id: 'himanshu', name: 'himanshu.g', color: '#4ca57d' },
  { id: 'hrithvick', name: 'Hrithvick Rao', color: '#7b8bd4' },
  { id: 'jagatdeep', name: 'Jagatdeep Singh', color: '#4ca57d' },
];

function Avatar({ name, color, size = 18 }) {
  return (
    <span className="rp-avatar" style={{ background: color, width: size, height: size }}>
      {name.trim().charAt(0).toUpperCase()}
      <span className="rp-avatar__online" />
    </span>
  );
}

const CheckMark = () => (
  <svg className="rp-assignee-opt__check" width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="var(--primarySurfaceDefault)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12l5 5 9-11" />
  </svg>
);

function AssigneeField() {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null); // null => None
  const [query, setQuery] = useState('');
  const ctrlRef = useRef(null);
  const ddRef = useRef(null);
  const [ddStyle, setDdStyle] = useState({});

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => {
      if (
        ddRef.current && !ddRef.current.contains(e.target) &&
        ctrlRef.current && !ctrlRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  function toggle() {
    setOpen((o) => {
      const next = !o;
      if (next && ctrlRef.current) {
        const r = ctrlRef.current.getBoundingClientRect();
        const width = Math.max(r.width, 288);
        const left = Math.min(r.left, window.innerWidth - width - 8);
        setDdStyle({
          position: 'fixed',
          left: Math.max(8, left),
          top: r.bottom + 4,
          width,
          maxHeight: window.innerHeight - r.bottom - 16,
        });
        setQuery('');
      }
      return next;
    });
  }

  const current = selectedId ? ASSIGNEES.find((a) => a.id === selectedId) : null;
  const list = ASSIGNEES.filter((a) => a.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="rp-field rp-assignee-row">
      <div className="rp-field__label">
        <span className="rp-field__icon"><Img src={assigneeIcon} size={14} /></span>
        <span>Assignee</span>
      </div>
      <div className="rp-field__value rp-assignee-value">
        <button
          ref={ctrlRef}
          type="button"
          className={`rp-assignee-select ${open ? 'is-open' : ''}`}
          onClick={toggle}
        >
          {current ? (
            <span className="rp-assignee"><Avatar name={current.name} color={current.color} /><span className="rp-value-strong">{current.name}</span></span>
          ) : (
            <span className="rp-value-strong">None</span>
          )}
          <span className="rp-assignee-chev"><ChevronDownIcon size={14} /></span>
        </button>

        {open && (
          <div className="rp-assignee-dd" style={ddStyle} ref={ddRef}>
            <div className="rp-assignee-dd__search">
              <div className="rp-assignee-search-box">
                <SearchIcon size={16} />
                <input
                  autoFocus
                  placeholder="Search Assignee"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="rp-assignee-dd__list">
              <button
                type="button"
                className={`rp-assignee-opt ${selectedId === null ? 'is-selected' : ''}`}
                onClick={() => { setSelectedId(null); setOpen(false); }}
              >
                <span className="rp-assignee-opt__icon"><UserIcon size={16} /></span>
                <span className="rp-assignee-opt__name">None</span>
                {selectedId === null && <CheckMark />}
              </button>
              {list.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={`rp-assignee-opt ${selectedId === a.id ? 'is-selected' : ''}`}
                  onClick={() => { setSelectedId(a.id); setOpen(false); }}
                >
                  <Avatar name={a.name} color={a.color} size={24} />
                  <span className="rp-assignee-opt__name">{a.name}</span>
                  {selectedId === a.id && <CheckMark />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FieldRow({ icon, label, value, valueClass = '' }) {
  return (
    <div className="rp-field">
      <div className="rp-field__label">
        <span className="rp-field__icon">{icon}</span>
        <span>{label}</span>
      </div>
      <div className={`rp-field__value ${valueClass}`}>{value}</div>
    </div>
  );
}

// A drag-sortable accordion section. The drag handle (6-dot grip) sits in the
// left gutter and appears on hover; the header bg also changes on hover.
function SortableSection({ id, icon, title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  
  // Synchronize internal state when defaultOpen changes (e.g. switching between channel types or sections)
  useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen]);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  // A section being dragged is always shown collapsed; its real open state is
  // restored on drop.
  const effectiveOpen = open && !isDragging;

  // Measure the body so height can be animated (150ms ease-in-out).
  const bodyRef = useRef(null);
  const [bodyHeight, setBodyHeight] = useState(0);
  useLayoutEffect(() => {
    if (bodyRef.current) setBodyHeight(bodyRef.current.scrollHeight);
  });

  const style = {
    // Translate only — never scale — so the collapsed drag card keeps a fixed
    // size instead of being stretched to match sibling heights.
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 2 : undefined,
    position: 'relative',
  };

  return (
    <div ref={setNodeRef} style={style} className={`rp-section ${isDragging ? 'rp-section--dragging' : ''}`}>
      <div className="rp-section__header">
        <button
          type="button"
          className="rp-drag-handle"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <img src={dragIcon} width="16" height="16" alt="" />
        </button>
        <button type="button" className="rp-section__toggle" onClick={() => setOpen((o) => !o)}>
          <span className="rp-section__icon">{icon}</span>
          <span className="rp-section__title">{title}</span>
          <AccordionChevron open={effectiveOpen} />
        </button>
      </div>
      <div className="rp-section__body-wrap" style={{ maxHeight: effectiveOpen ? bodyHeight : 0 }}>
        <div className="rp-section__body" ref={bodyRef}>{children}</div>
      </div>
    </div>
  );
}

export default function RightPanel({ inboxName = 'Email Inbox Name', channel = 'email', contact = {} }) {
  const contactName = contact.name;
  const contactEmail = contact.email;
  const contactPhone = contact.phone;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const initialSections = [
    {
      id: 'account',
      icon: <Img src={accountIcon} size={16} />,
      title: 'Account',
      content: (
        <>
          <FieldRow icon={<Img src={nameIcon} size={14} />} label="Name" value={<span className="rp-value-strong">Acme Corporation</span>} />
          <FieldRow icon={<GlobeIcon size={14} />} label="Domain" value={<span className="rp-value-strong">acme.com</span>} />
          <FieldRow icon={<PhoneIcon size={14} />} label="Contacts" value={<span className="rp-value-strong">+1 800-555-0199</span>} />
          <FieldRow icon={<Img src={rpConversationsIcon} size={14} />} label="Conversations" value="12" valueClass="rp-value-link" />
        </>
      ),
    },
    {
      id: 'contact',
      icon: <Img src={contactIcon} size={16} />,
      title: 'Contact',
      defaultOpen: true,
      content: (
        <>
          <FieldRow icon={<Img src={nameIcon} size={14} />} label="Name" value={contactName ? <span className="rp-value-strong">{contactName}</span> : RP_EMPTY} />
          <FieldRow icon={<Img src={emailIcon} size={14} />} label="Email" value={contactEmail ? <span className="rp-value-strong">{contactEmail}</span> : RP_EMPTY} />
          <FieldRow icon={<Img src={accountSubtleIcon} size={14} />} label="Account" value={<span className="rp-value-strong">Acme Corporation</span>} />
          <FieldRow icon={<Img src={rpConversationsIcon} size={14} />} label="Conversations" value="12" valueClass="rp-value-link" />
        </>
      ),
    },
    {
      id: 'custom-fields',
      icon: <Img src={customFieldsIcon} size={16} />,
      title: 'Custom fields',
      content: (
        <>
          <FieldRow icon={<Img src={dropdownIcon} size={14} />} label="Dropdown field" value={<span className="rp-value-strong">Options</span>} />
          <FieldRow icon={<Img src={dateIcon} size={14} />} label="Date field" value={<span className="rp-value-strong">Date</span>} />
          <FieldRow icon={<Img src={numberIcon} size={14} />} label="Number field" value={<span className="rp-value-strong">12345</span>} />
          <FieldRow icon={<Img src={textIcon} size={14} />} label="Text field" value={<span className="rp-value-strong">Text</span>} />
        </>
      ),
    },
    {
      id: 'skills',
      icon: <Img src={skillsIcon} size={16} />,
      title: 'Skills',
      content: <p className="rp-empty-note">No Skills matched yet</p>,
    },
    {
      id: 'activity',
      icon: <Img src={activityNotesIcon} size={16} />,
      title: 'Activity & Notes',
      content: (
        <>
          <div className="rp-note-input">
            <DocumentIcon size={16} />
            <span className="rp-note-input__placeholder">Add a note</span>
          </div>
          <label className="rp-note-toggle">
            <input type="checkbox" />
            <span>Show only notes</span>
          </label>
          <div className="rp-timeline-divider"><span>Today</span></div>
          <div className="rp-note-card">
            <p className="rp-note-card__author">Mark Scout</p>
            <p className="rp-note-card__body">This is a note</p>
            <p className="rp-note-card__time">12:24 PM</p>
          </div>
          <div className="rp-timeline-divider"><span>Today</span></div>
          <div className="rp-activity">
            <span className="rp-activity__icon"><CircleIcon size={14} /></span>
            <div className="rp-activity__text">
              <p>New conversation received in Email Support Inbox</p>
              <p className="rp-activity__time">01:31 PM</p>
            </div>
          </div>
        </>
      ),
    },
  ];

  // Display order (Contact above Account).
  const ORDER = ['contact', 'account', 'custom-fields', 'skills', 'activity'];
  initialSections.sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));

  // Slack channel sections
  const slackSections = [
    {
      id: 'contact', title: 'Customer details', defaultOpen: true,
      icon: <Img src={contactIcon} size={16} />,
      content: (
        <>
          <FieldRow icon={<Img src={nameIcon} size={14} />} label="Name" value={contactName ? <span className="rp-value-strong">{contactName}</span> : RP_EMPTY} />
          <FieldRow icon={<Img src={emailIcon} size={14} />} label="Email" value={contactEmail ? <span className="rp-value-strong">{contactEmail}</span> : RP_EMPTY} />
          <FieldRow icon={<PhoneIcon size={14} />} label="Phone" value={contactPhone ? <span className="rp-value-strong">{contactPhone}</span> : RP_EMPTY} />
        </>
      ),
    },
    {
      id: 'conversation-details', title: 'Conversation details', defaultOpen: false,
      icon: <ChatBubbleIcon size={16} />,
      content: (
        <>
          <FieldRow icon={<span style={{ fontSize: 13, fontWeight: 600, color: 'var(--slateTextSubtle)' }}>#</span>} label="Channel" value={<span className="rp-value-strong">#support</span>} />
          <FieldRow icon={<Img src={slackChannelIcon} size={14} />} label="Slack thread" value={<a href="https://hiverhq.slack.com/archives" className="rp-value-link rp-value-url" onClick={(e) => e.preventDefault()}>https://hiverhq.slack.com/a…</a>} />
          <FieldRow icon={<ClockIcon size={14} />} label="Initiated at" value={<span className="rp-value-strong">Nov 20 2025, 11:20am</span>} />
        </>
      ),
    },
    {
      id: 'related-conversations', title: 'Related conversations', defaultOpen: false,
      icon: <Img src={rpConversationsIcon} size={16} />,
      content: (
        <div className="rp-prev-list">
          {[1, 2].map((i) => (
            <div className="rp-prev" key={i}>
              <div className="rp-prev__head">
                <span className="rp-avatar" style={{ background: '#8b7fd4' }}>F<span className="rp-avatar__online" /></span>
                <span className="rp-prev__name">frosty-wildflower-332</span>
                <span className="rp-prev__time">May 19, {i === 1 ? '05:29' : '05:21'} PM</span>
              </div>
              <p className="rp-prev__preview">Please rate the chat</p>
            </div>
          ))}
        </div>
      ),
    },
  ];

  // Chat inboxes use a trimmed panel: Contact + Account details, plus Chat
  // details and Previous Conversations.
  const chatSections = [
    {
      id: 'contact', title: 'Contact details', defaultOpen: true,
      icon: <Img src={contactIcon} size={16} />,
      content: (
        <>
          <FieldRow icon={<Img src={nameIcon} size={14} />} label="Name" value={contactName ? <span className="rp-value-strong">{contactName}</span> : RP_EMPTY} />
          <FieldRow icon={<Img src={emailIcon} size={14} />} label="Email" value={contactEmail ? <span className="rp-value-strong">{contactEmail}</span> : RP_EMPTY} />
          <FieldRow icon={<PhoneIcon size={14} />} label="Phone" value={contactPhone ? <span className="rp-value-strong">{contactPhone}</span> : RP_EMPTY} />
        </>
      ),
    },
    {
      id: 'account', title: 'Account details', defaultOpen: false,
      icon: <Img src={accountIcon} size={16} />,
      content: (
        <>
          <FieldRow icon={<Img src={accountSubtleIcon} size={14} />} label="Account" value={RP_EMPTY} />
          <FieldRow icon={<GlobeIcon size={14} />} label="Domain" value={RP_EMPTY} />
          <FieldRow icon={<UserIcon size={14} />} label="Contact" value={RP_EMPTY} />
        </>
      ),
    },
    {
      id: 'chat-details', title: 'Chat details', defaultOpen: false,
      icon: <ChatBubbleIcon size={16} />,
      content: (
        <>
          <FieldRow icon={<LinkIcon size={14} />} label="Initiated from" value={<a href="https://www.w3schools.com" className="rp-value-link rp-value-url" onClick={(e) => e.preventDefault()}>https://www.w3schoo…</a>} />
          <FieldRow icon={<ClockIcon size={14} />} label="Initiated at" value={<span className="rp-value-strong">May 19, 2026 05:34 PM</span>} />
          <FieldRow icon={<MonitorIcon size={14} />} label="OS / Device" value={<span className="rp-value-strong">macOS 10.15</span>} />
          <FieldRow icon={<BrowserIcon size={14} />} label="Browser" value={<span className="rp-value-strong">Chrome 148.0</span>} />
        </>
      ),
    },
    {
      id: 'previous', title: 'Previous Conversations', defaultOpen: false,
      icon: <Img src={rpConversationsIcon} size={16} />,
      content: (
        <div className="rp-prev-list">
          {[1, 2].map((i) => (
            <div className="rp-prev" key={i}>
              <div className="rp-prev__head">
                <span className="rp-avatar" style={{ background: '#8b7fd4' }}>F<span className="rp-avatar__online" /></span>
                <span className="rp-prev__name">frosty-wildflower-332</span>
                <span className="rp-prev__time">May 19, {i === 1 ? '05:29' : '05:21'} PM</span>
              </div>
              <p className="rp-prev__preview">Please rate the chat</p>
            </div>
          ))}
        </div>
      ),
    },
  ];

  const baseSections = channel === 'slack'
    ? slackSections
    : channel === 'chat'
    ? chatSections
    : initialSections;

  const [sections, setSections] = useState(baseSections);

  useEffect(() => {
    setSections(baseSections);
  }, [channel, contactName, contactEmail, contactPhone]);

  // Which widgets/sections are visible in the panel. All on by default.
  const [visible, setVisible] = useState(() =>
    Object.fromEntries(baseSections.map((s) => [s.id, true]))
  );

  const [customizeOpen, setCustomizeOpen] = useState(false);
  const customizeRef = useRef(null);
  const widgetsBtnRef = useRef(null);
  const [popStyle, setPopStyle] = useState({});

  function toggleCustomize() {
    setCustomizeOpen((o) => {
      const next = !o;
      if (next && widgetsBtnRef.current) {
        const r = widgetsBtnRef.current.getBoundingClientRect();
        setPopStyle({
          position: 'fixed',
          left: r.left,
          width: r.width,
          right: 'auto',
          bottom: window.innerHeight - r.top + 8, // sit just above the button
          maxHeight: r.top - 16,                  // never exceed the top edge
        });
      }
      return next;
    });
  }

  useEffect(() => {
    if (!customizeOpen) return undefined;
    const onClick = (e) => {
      if (customizeRef.current && !customizeRef.current.contains(e.target)) setCustomizeOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [customizeOpen]);

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSections((items) => {
      const oldIndex = items.findIndex((s) => s.id === active.id);
      const newIndex = items.findIndex((s) => s.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  }

  // Only sections toggled on are shown in the panel.
  const visibleSections = sections.filter((s) => visible[s.id]);

  return (
    <div className="rp-root">
      {/* Connector / tabs bar */}
      <div className="rp-connectors">
        <div className="rp-connectors__tabs">
          <button type="button" className="rp-conn-btn rp-conn-btn--active"><Img src={mailboxRpIcon} size={16} /></button>
          {channel === 'email' && (
            <>
              <button type="button" className="rp-conn-btn"><Img src={clickupIcon} size={16} /></button>
              <button type="button" className="rp-conn-btn"><Img src={salesforceIcon} size={16} /></button>
              <button type="button" className="rp-conn-btn"><Img src={asanaIcon} size={16} /></button>
              <button type="button" className="rp-conn-btn"><Img src={moreIcon} size={16} /></button>
            </>
          )}
          <span className="rp-conn-divider" />
        </div>
        <button type="button" className="rp-conn-collapse" title="Collapse panel">
          <Img src={sidebarIcon} size={16} />
        </button>
      </div>

      {/* Fixed header: inbox name + assignee / status / tags */}
      <div className="rp-header">
        <p className="rp-header__title">{inboxName}</p>
        <div className="rp-header__fields">
          <AssigneeField />
          <FieldRow
            icon={<Img src={statusIcon} size={14} />}
            label="Status"
            value={<span className="rp-value-strong">Open</span>}
          />
          <FieldRow
            icon={<Img src={tagsIcon} size={14} />}
            label="Tags"
            value={
              <span className="rp-tags">
                <span className="rp-chip rp-chip--violet">Finance <span className="rp-chip__x">×</span></span>
                <span className="rp-chip rp-chip--add">＋ Add</span>
              </span>
            }
          />
        </div>
      </div>

      {/* Draggable accordion sections */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={visibleSections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          {visibleSections.map((s) => (
            <SortableSection key={s.id} id={s.id} icon={s.icon} title={s.title} defaultOpen={!!s.defaultOpen}>
              {s.content}
            </SortableSection>
          ))}
        </SortableContext>
      </DndContext>

      {/* Footer */}
      <div className="rp-footer" ref={customizeRef}>
        {customizeOpen && (
          <div className="rp-customize-popover" style={popStyle}>
            <div className="rp-customize-popover__header">Customize widgets</div>
            <div className="rp-customize-popover__list">
              {sections.map((s) => (
                <label key={s.id} className="rp-customize-popover__item">
                  <CheckBox
                    checked={!!visible[s.id]}
                    onChange={() => setVisible((v) => ({ ...v, [s.id]: !v[s.id] }))}
                  />
                  <span>{s.title}</span>
                </label>
              ))}
            </div>
          </div>
        )}
        <button
          type="button"
          className="rp-widgets-btn"
          ref={widgetsBtnRef}
          onClick={toggleCustomize}
        >
          <Img src={settingsIcon} size={14} /> Customize widgets
        </button>
      </div>
    </div>
  );
}
