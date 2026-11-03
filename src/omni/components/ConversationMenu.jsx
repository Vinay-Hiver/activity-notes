import React from 'react';
import { Dropdown } from '../../components/Dropdown';
import { Popover } from '../../components/Popover';
import { Icon } from '../../icons/Icon';
import './ConversationMenu.css';

/** The "View only notes" row every conversation menu has (a tick shows while it is on). */
export const VIEW_ONLY_NOTES = { value: 'only-notes', label: 'View only notes', icon: 'document' };

/**
 * The ⋮ menu at the top right of a conversation. `options` are Dropdown rows ({ value, label, icon });
 * `onSelect(value)` runs the one picked. `onlyNotes` ticks "View only notes".
 */
export default function ConversationMenu({ options, onSelect, onlyNotes, className = '' }) {
  const ref = React.useRef(null);
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        ref={ref}
        type="button"
        className={`conversation-menu__btn${open ? ' is-open' : ''} ${className}`}
        aria-label="More"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="vmore" size={16} />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={ref} placement="bottom-end">
        <Dropdown
          className="conversation-menu"
          variant="icon"
          options={options}
          value={onlyNotes ? VIEW_ONLY_NOTES.value : undefined}
          onChange={(value) => { setOpen(false); onSelect(value); }}
        />
      </Popover>
    </>
  );
}
