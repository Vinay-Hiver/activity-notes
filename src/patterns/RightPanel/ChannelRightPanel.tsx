import { useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Avatar } from '../../components/Avatar'
import { Input } from '../../components/Input'
import { Tag } from '../../components/Tag'
import { Icon } from '../../icons/Icon'
import type { IconName } from '../../icons/iconData'
import { RightPanel, RightPanelSection, RightPanelTop } from './RightPanel'
import { ActivityNotes } from './ActivityNotes'
import { AssigneeField, StatusField, TagsField } from './FieldSelects'
import type { TagOption } from './FieldSelects'
import type { Assignee } from './data/options'
import { customFieldKinds, getChannel, samples } from './data'
import type { ChannelId, ChannelSample, FieldDef, FieldKind, ResolvedSection } from './data'

/** A row: [icon] [label] ...space... [value]. Same markup as the storybook right panel (see sampleData.tsx). */
function Row({ icon, label, children, link }: { icon: IconName; label: string; children?: React.ReactNode; link?: boolean }) {
  return (
    <div className="hot-rp-field">
      <div className="hot-rp-field__label"><Icon name={icon} size={14} /><span>{label}</span></div>
      <div className={`hot-rp-field__value${link ? ' hot-rp-field__value--link' : ''}`}>{children}</div>
    </div>
  )
}

const redAvatar = { '--avatar-bg': 'var(--pastelRedSurfaceDefault)' } as CSSProperties

const customFieldIcon = (kind: FieldKind): IconName => {
  if (kind === 'dropdown') return customFieldKinds.dropdown.icon
  if (kind === 'dateInput') return customFieldKinds.date.icon
  if (kind === 'number') return customFieldKinds.number.icon
  return customFieldKinds.text.icon
}

function FieldValue({ def, sample, empty }: { def: FieldDef; sample: ChannelSample; empty: string }) {
  const value = sample.values[def.id]
  if (def.kind === 'avatarText' && value !== undefined) return <><Avatar initial={String(value).charAt(0).toUpperCase()} size="small" style={redAvatar} /><span style={{ marginLeft: 4 }}>{value}</span></>
  if (value === undefined) return <>{def.placeholder ?? empty}</>
  return <>{value}</>
}

function SectionRows({ section, sample }: { section: ResolvedSection; sample: ChannelSample }) {
  if (section.type === 'customFields') {
    const rows = sample.customFields ?? []
    return <>{rows.map((r) => <Row key={r.label} icon={customFieldIcon(r.kind)} label={r.label}>{r.value ?? r.placeholder ?? section.emptyValue}</Row>)}</>
  }
  if (section.type === 'list') {
    const items = sample.previousConversations ?? []
    if (items.length === 0) return <div className="hot-rp-field"><div className="hot-rp-field__label" style={{ width: 'auto' }}>{section.emptyListText}</div></div>
    return <>{items.map((c, i) => <Row key={i} icon="conversation" label={c.from}>{c.preview} · {c.date}</Row>)}</>
  }
  if (section.type === 'notes') return <Row icon="note" label="Notes">Add a note</Row>
  if (section.type === 'activity') {
    const day = sample.activity?.[0]
    return <ActivityNotes days={day ? [{ day: day.day, events: day.items.map((a) => ({ icon: /ticket/i.test(a.text) ? 'ticket' : 'user', text: a.text, time: a.time })) }] : []} />
  }
  return <>{section.fields.map((f) => <Row key={f.id} icon={f.icon} label={f.label} link={f.kind === 'countLink'}><FieldValue def={f} sample={sample} empty={section.emptyValue} /></Row>)}</>
}

/** A custom field on the conversation, with its current value (leave `value` out when it is empty). */
export type CustomFieldValue = { id: string; label: string; kind: 'text' | 'number'; value?: string }

/**
 * A custom field's value. Hovering shows the grey hover fill; clicking turns it into a text box.
 * Enter or leaving the box saves, Escape drops the change. Number fields only take digits and one decimal point.
 */
function EditableFieldValue({ field, empty, onChange }: { field: CustomFieldValue; empty: string; onChange: (value: string | undefined) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const cancelled = useRef(false)

  const start = () => { cancelled.current = false; setDraft(field.value ?? ''); setEditing(true) }
  const commit = () => {
    setEditing(false)
    if (cancelled.current) return
    const next = draft.trim()
    if (next !== (field.value ?? '')) onChange(next || undefined)
  }
  const clean = (text: string) => (field.kind === 'number' ? text.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1') : text)

  if (editing) {
    return (
      <div className="hot-rp-cf-edit">
        <Input
          size="sm" fullWidth autoFocus value={draft} aria-label={field.label}
          inputMode={field.kind === 'number' ? 'decimal' : undefined}
          placeholder={field.kind === 'number' ? 'Enter a number' : 'Enter text'}
          onChange={(e) => setDraft(clean(e.target.value))}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') { cancelled.current = true; e.currentTarget.blur() }
          }}
        />
      </div>
    )
  }
  return (
    <button type="button" className="hot-rp-field__value hot-rp-cf-value" aria-label={`Edit ${field.label}`} onClick={start}>
      {field.value ? <span className="hot-rp-cf-value__text">{field.value}</span> : <span className="hot-rp-cf-value__empty">{empty}</span>}
    </button>
  )
}

/** The Custom fields section with editable values, laid out like every other section. */
function customFieldsSection(section: ResolvedSection, fields: CustomFieldValue[], conversationId: string | undefined, onChange: (fieldId: string, value: string | undefined) => void) {
  return (
    <RightPanelSection key={section.id} id={section.id} title={section.title} icon={section.icon} defaultExpanded>
      {fields.map((f) => (
        <div key={f.id} className="hot-rp-field">
          <div className="hot-rp-field__label"><Icon name={customFieldIcon(f.kind)} size={14} /><span className="hot-rp-cf-label">{f.label}</span></div>
          <EditableFieldValue key={`${conversationId}-${f.id}`} field={f} empty={section.emptyValue} onChange={(v) => onChange(f.id, v)} />
        </div>
      ))}
    </RightPanelSection>
  )
}

/** Sections this prototype leaves out of every channel's panel. */
const HIDDEN_SECTIONS = ['conversation', 'customFields']

/** Email shows notes and activity in the thread itself, so its panel has no Activity & Notes section. */
const EMAIL_HIDDEN_SECTIONS = ['activity']

/**
 * A ticket (an email conversation turned into a ticket) uses the Email panel with changes
 * (Figma: Delete › 6018:50493): the top section adds Ticket ID, and the only sub-section is
 * Custom fields. Plain emails do not show Ticket ID.
 */
const TICKET_SECTIONS = ['customFields']

/** The storybook right panel for one channel: its tab, top section, sub-sections in order and "Customize widgets". */
export function ChannelRightPanel({ channel, inboxName, unassigned, conversationId, ticketId, assignee, onAssigneeChange, status, onStatusChange, people, tagOptions, tags, onTagsChange, customFields, onCustomFieldChange }: {
  channel: ChannelId
  /** Email only: the conversation is a ticket with this ID, so the panel uses the ticket layout. */
  ticketId?: string
  /** The conversation's assignee (`none` when unassigned), when the caller keeps it. Leave out to let the field manage itself. */
  assignee?: string
  onAssigneeChange?: (value: string) => void
  /** The conversation's status, when the caller keeps it (one value per conversation). */
  status?: 'open' | 'pending' | 'closed'
  onStatusChange?: (value: 'open' | 'pending' | 'closed') => void
  /** The people in the Assignee list (the storybook sample people when left out). */
  people?: Assignee[]
  /** With `tags` and `onTagsChange`: the tags that can be added, so the Tags field can be edited. */
  tagOptions?: TagOption[]
  tags?: string[]
  onTagsChange?: (value: string[]) => void
  /** With `onCustomFieldChange`: the conversation's custom fields, shown as an editable Custom fields section. */
  customFields?: CustomFieldValue[]
  onCustomFieldChange?: (fieldId: string, value: string | undefined) => void
  inboxName?: string
  /** The conversation is in an Unassigned view, so the Assignee starts at None. */
  unassigned?: boolean
  /** The selected conversation, so the Assignee resets when another one is picked. */
  conversationId?: string
}) {
  const def = getChannel(channel)
  const sample = samples[channel]
  const isTicket = channel === 'email' && !!ticketId
  const editableCustomFields = !!customFields && !!onCustomFieldChange
  const hidden = channel === 'email' ? [...HIDDEN_SECTIONS, ...EMAIL_HIDDEN_SECTIONS] : HIDDEN_SECTIONS
  const sections = isTicket
    ? TICKET_SECTIONS.map((id) => def.sections.find((s) => s.id === id)).filter((s): s is ResolvedSection => !!s)
    : def.sections.filter((s) => !hidden.includes(s.id) || (s.id === 'customFields' && editableCustomFields))
  const topFields = def.top.fields.filter((f) => f.id !== 'ticketId' || isTicket)
  return (
    <RightPanel key={isTicket ? 'ticket' : channel} aria-label="Details" tabs={def.tabs} customizeWidgets={def.footer.some((f) => f.id === 'customizeWidgets')}>
      <RightPanelTop title={inboxName ?? sample.inboxName}>
        {topFields.map((f) => {
          if (f.kind === 'assignee') return <AssigneeField key={`${f.id}-${conversationId}-${unassigned}`} value={assignee} onChange={onAssigneeChange} defaultValue={unassigned ? 'none' : undefined} people={people} />
          if (f.kind === 'status') return <StatusField key={`${f.id}-${conversationId}`} value={status} onChange={onStatusChange} />
          if (f.id === 'ticketId') return <Row key={f.id} icon="ticket" label={f.label}><span className="hot-rp-ticket-id">{ticketId}</span></Row>
          if (f.kind === 'tags' && tagOptions && tags && onTagsChange) return <TagsField key={`${f.id}-${conversationId}`} options={tagOptions} value={tags} onChange={onTagsChange} />
          if (f.kind === 'tags') return (
            <Row key={f.id} icon={f.icon} label={f.label}>
              <Tag color="violet" onRemove={() => {}} removeLabel="Remove Finance">Finance</Tag>
              {/* Temporary, as in the storybook: a clickable "Add" chip is not built, so a Tag sits inside a plain button. */}
              <button type="button" aria-label="Add tag" style={{ padding: 0, border: 0, background: 'transparent', cursor: 'pointer' }}>
                <Tag iconLeft={<Icon name="add" size={14} />}>Add</Tag>
              </button>
            </Row>
          )
          return <Row key={f.id} icon={f.icon} label={f.label}>{sample.values[f.id] ?? '-'}</Row>
        })}
      </RightPanelTop>
      {sections.map((s) => s.id === 'customFields' && customFields && onCustomFieldChange ? customFieldsSection(s, customFields, conversationId, onCustomFieldChange) : (
        // Every section starts closed; only Custom fields starts open.
        <RightPanelSection key={s.id} id={s.id} title={s.title} icon={s.icon} defaultExpanded={false}>
          <SectionRows section={s} sample={sample} />
        </RightPanelSection>
      ))}
    </RightPanel>
  )
}
