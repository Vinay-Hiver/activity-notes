import { useId, useRef, useState } from 'react'
import { Avatar } from '../../components/Avatar'
import { Dropdown } from '../../components/Dropdown'
import { Popover } from '../../components/Popover'
import { Tag } from '../../components/Tag'
import type { ChipColor } from '../../components/Tag'
import { Icon } from '../../icons/Icon'
import type { IconName } from '../../icons/iconData'
import { sampleAssignees, statusOptions } from './data/options'
import type { Assignee } from './data/options'

/**
 * A field value you can press to change it: the current value, and on hover a small white box with a down chevron.
 * Pressing it opens `children` (a Dropdown) under it in a Popover.
 */
function SelectValue({ icon, label, shown, children, open, onOpenChange, ariaLabel }: {
  icon: IconName
  label: string
  /** What sits before the text: an avatar or an icon. */
  shown: React.ReactNode
  children: React.ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
  ariaLabel: string
}) {
  const ref = useRef<HTMLButtonElement>(null)
  const id = useId()
  return (
    <div className="hot-rp-field">
      <div className="hot-rp-field__label"><Icon name={icon} size={14} /><span>{label}</span></div>
      <div className="hot-rp-field__value hot-rp-field__value--select">
        <button
          ref={ref} type="button" className="hot-rp-select" aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? id : undefined} aria-label={ariaLabel}
          onClick={() => onOpenChange(!open)}
        >
          {shown}
          <span className="hot-rp-select__text">{ariaLabel.split(': ')[1]}</span>
          <span className="hot-rp-select__chevron" aria-hidden="true"><Icon name="chevrondown" size={14} /></span>
        </button>
        <Popover open={open} onClose={() => onOpenChange(false)} anchorRef={ref} placement="bottom-end">
          <div id={id}>{children}</div>
        </Popover>
      </div>
    </div>
  )
}

export type AssigneeFieldProps = {
  /** The `value` of the person who owns the conversation, or `none`. */
  value?: string
  /** The starting value when the field manages itself (for example `none` for an unassigned conversation). */
  defaultValue?: string
  onChange?: (value: string) => void
  people?: Assignee[]
}

/** The Assignee field: pressing the name opens a searchable list of people (with a "None" row) in a Dropdown. */
export function AssigneeField({ value, defaultValue, onChange, people = sampleAssignees }: AssigneeFieldProps) {
  const [inner, setInner] = useState(value ?? defaultValue ?? people[0]?.value ?? 'none')
  const [open, setOpen] = useState(false)
  const current = value ?? inner
  const person = people.find((p) => p.value === current)
  const name = person ? person.label.replace(/ \(Me\)$/, '') : 'None'
  return (
    <SelectValue
      icon="assigned" label="Assignee" open={open} onOpenChange={setOpen} ariaLabel={`Assignee: ${name}`}
      shown={person ? <Avatar initial={name} size="small" color={person.color} /> : <Icon name="user" size={14} />}
    >
      <Dropdown
        variant="avatar" searchable searchPlaceholder="Search Assignee" value={current}
        options={[{ value: 'none', label: 'None', icon: 'user', iconBackground: true }, ...people.map((p) => ({ value: p.value, label: p.label, color: p.color, status: p.status }))]}
        onChange={(v) => { const next = String(v); setInner(next); onChange?.(next); setOpen(false) }}
      />
    </SelectValue>
  )
}

export type StatusFieldProps = {
  value?: 'open' | 'pending' | 'closed'
  onChange?: (value: 'open' | 'pending' | 'closed') => void
}

/** The Status field: pressing it opens Open, Pending and Closed, each with its status icon. */
export function StatusField({ value, onChange }: StatusFieldProps) {
  const [inner, setInner] = useState<'open' | 'pending' | 'closed'>(value ?? 'open')
  const [open, setOpen] = useState(false)
  const current = value ?? inner
  const option = statusOptions.find((o) => o.value === current) ?? statusOptions[0]
  return (
    <SelectValue
      icon="flag" label="Status" open={open} onOpenChange={setOpen} ariaLabel={`Status: ${option.label}`}
      shown={<Icon name={option.icon} size={14} style={{ width: 18, height: 18 }} />}
    >
      <Dropdown
        variant="icon" className="hot-rp-status-dropdown" value={current} options={statusOptions}
        onChange={(v) => { const next = v as 'open' | 'pending' | 'closed'; setInner(next); onChange?.(next); setOpen(false) }}
      />
    </SelectValue>
  )
}

export type TagOption = { value: string; label: string; color?: ChipColor }

export type TagsFieldProps = {
  /** Every tag that can be added. */
  options: TagOption[]
  /** The values of the tags on the conversation. */
  value: string[]
  onChange: (value: string[]) => void
}

/**
 * The Tags field: the conversation's tags (each removable) and an "Add" chip. "Add" opens a searchable
 * checkbox list of every tag; ticking and unticking only takes effect on Apply.
 */
export function TagsField({ options, value, onChange }: TagsFieldProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<string[]>(value)
  const openList = () => { setDraft(value); setOpen(true) }
  const tags = value.map((v) => options.find((o) => o.value === v)).filter((o): o is TagOption => !!o)
  return (
    <div className="hot-rp-field hot-rp-field--tags">
      <div className="hot-rp-field__label"><Icon name="tag" size={14} /><span>Tags</span></div>
      <div className="hot-rp-field__value hot-rp-tags">
        {tags.map((t) => (
          <Tag key={t.value} color={t.color} onRemove={() => onChange(value.filter((v) => v !== t.value))} removeLabel={`Remove ${t.label}`}>{t.label}</Tag>
        ))}
        {/* Temporary, as in the storybook: a clickable "Add" chip is not built, so a Tag sits inside a plain button. */}
        <button ref={ref} type="button" aria-label="Add tag" aria-expanded={open} className="hot-rp-tags__add" onClick={() => (open ? setOpen(false) : openList())}>
          <Tag iconLeft={<Icon name="add" size={14} />}>Add</Tag>
        </button>
        <Popover open={open} onClose={() => setOpen(false)} anchorRef={ref} placement="bottom-end">
          <Dropdown
            variant="checkbox" searchable searchPlaceholder="Search Tags" value={draft}
            options={options.map((o) => ({ value: o.value, label: o.label }))}
            onChange={(v) => setDraft(v as string[])}
            actions={{ onCancel: () => setOpen(false), onApply: () => { onChange(draft); setOpen(false) } }}
          />
        </Popover>
      </div>
    </div>
  )
}
