import React from 'react';
import { Dropdown } from '../../components/Dropdown';
import { Popover } from '../../components/Popover';
import { Icon } from '../../icons/Icon';
import { THREAD_VIEW_OPTIONS, useThreadView } from '../ThreadView';
import './ConversationMenu.css';

/**
 * The ⋮ menu at the top right of a conversation. `options` are the channel's own Dropdown rows
 * ({ value, label, icon }); `onSelect(value)` runs the one picked. Every menu ends with "Hide notes" and
 * "Hide activity", which tick while on and are handled here (see ThreadView).
 */
export default function ConversationMenu({ options = [], onSelect, className = '' }) {
  const view = useThreadView();
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
          options={[...options, ...THREAD_VIEW_OPTIONS]}
          value={view.selected}
          onChange={(value) => { setOpen(false); if (!view.toggle(value)) onSelect?.(value); }}
        />
      </Popover>
    </>
  );
}
