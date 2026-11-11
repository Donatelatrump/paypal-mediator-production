import Icon from './Icon';
import React, { useId, useRef, useState } from 'react';

export default function TeamOptions({
  name,
  pinned,
  canMoveUp,
  canMoveDown,
  onMove,
  onPin,
  onSettings,
  onRename,
  onInvite,
  canManage = true,
}) {
  const id = useId();
  const trigger = useRef(null);
  const popup = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const act = (callback) => {
    callback();
    popup.current?.hidePopover();
    trigger.current?.focus();
  };
  return (
    <>
      <button
        type="button"
        ref={trigger}
        className="team-options-trigger"
        aria-label={`Options for ${name}`}
        aria-haspopup="dialog"
        popoverTarget={id}
        onClick={() => {
          const rect = trigger.current.getBoundingClientRect();
          setPosition({
            top: Math.max(
              8,
              Math.min(rect.bottom + 5, window.innerHeight - 260),
            ),
            left: Math.max(8, Math.min(rect.left, window.innerWidth - 184)),
          });
        }}
      >
        <Icon name="MoreHorizontal" />
      </button>
      <div
        popover="auto"
        id={id}
        ref={popup}
        role="dialog"
        aria-label={`Arrange ${name}`}
        className="team-options-popup"
        style={position}
        onToggle={(event) => {
          if (event.newState === 'open')
            popup.current?.querySelector('button:not(:disabled)')?.focus();
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Escape') {
            event.preventDefault();
            popup.current?.hidePopover();
            trigger.current?.focus();
            return;
          }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            const buttons = [
              ...popup.current.querySelectorAll('button:not(:disabled)'),
            ];
            const index = buttons.indexOf(document.activeElement);
            buttons[
              (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) %
                buttons.length
            ]?.focus();
          }
        }}
      >
        <button type="button" onClick={() => act(onSettings)}>
          <Icon name="Settings" />
          Settings
        </button>
        {canManage && (
          <>
            <button type="button" onClick={() => act(onRename)}>
              <Icon name="Pencil" />
              Rename team
            </button>
            <button type="button" onClick={() => act(onInvite)}>
              <Icon name="UserPlus" />
              Invite members
            </button>
          </>
        )}
        <hr className="team-options-divider" />
        <button type="button" onClick={() => act(onPin)}>
          <Icon name={pinned ? 'PinOff' : 'Pin'} size={14} />
          {pinned ? 'Unpin' : 'Pin'}
        </button>
        <button
          type="button"
          disabled={!canMoveUp}
          onClick={() => act(() => onMove(-1))}
        >
          <Icon name="ArrowUp" size={14} />
          Move up
        </button>
        <button
          type="button"
          disabled={!canMoveDown}
          onClick={() => act(() => onMove(1))}
        >
          <Icon name="ArrowDown" size={14} />
          Move down
        </button>
      </div>
    </>
  );
}
