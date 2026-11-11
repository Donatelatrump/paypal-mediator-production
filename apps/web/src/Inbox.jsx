import React, { useEffect, useId, useRef, useState } from 'react';
import Icon from './Icon';
import { date } from './lib/format';

export default function Inbox({
  account,
  teams,
  notifications,
  open,
  onToggle,
  onClose,
  onNavigate,
  hidden,
}) {
  const trigger = useRef(null);
  const panel = useRef(null);
  const filterPopup = useRef(null);
  const filterTrigger = useRef(null);
  const filterId = useId();
  const [filterPosition, setFilterPosition] = useState({ top: 48, left: 0 });
  const key = `account:${account.id}:read-notifications`;
  const [readIds, setReadIds] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const [filter, setFilter] = useState('All');
  const [error, setError] = useState('');
  const items = notifications
    .filter((item) => teams.some((team) => team.id === item.merchantId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unread = items.filter((item) => !readIds.includes(item.id));
  const visible = filter === 'Unread' ? unread : items;
  const markRead = (ids) => {
    try {
      const next = [...new Set([...readIds, ...ids])];
      localStorage.setItem(key, JSON.stringify(next));
      setReadIds(next);
      setError('');
      return true;
    } catch {
      setError('Could not save notification changes. Please try again.');
      return false;
    }
  };
  const close = () => {
    filterPopup.current?.hidePopover();
    onClose();
    trigger.current?.focus();
  };
  useEffect(() => {
    if (!open) {
      filterPopup.current?.hidePopover();
      return;
    }
    panel.current?.querySelector('button')?.focus();
    const dismiss = (event) => {
      if (
        !panel.current?.contains(event.target) &&
        !trigger.current?.contains(event.target)
      )
        onClose();
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);
  return (
    <>
      <div
        className={`inbox-backdrop ${open ? 'is-open' : ''}`}
        aria-hidden="true"
        onClick={onClose}
      />
      <button
        type="button"
        ref={trigger}
        hidden={hidden}
        className={`sidebar-inbox ${open ? 'active' : ''}`}
        aria-label={`Inbox${unread.length ? `, ${unread.length} unread notifications` : ''}`}
        title="Inbox"
        aria-expanded={open}
        aria-controls="notification-inbox"
        onClick={onToggle}
      >
        <Icon name="Inbox" size={18} />
        {unread.length > 0 && (
          <span className="inbox-unread-dot" aria-hidden="true" />
        )}
      </button>
      <section
        id="notification-inbox"
        className={`notification-panel ${open ? 'is-open' : ''}`}
        ref={panel}
        role="dialog"
        aria-label="Notification inbox"
        inert={!open}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Escape') {
            event.preventDefault();
            close();
          }
        }}
      >
        <header className="inbox-heading">
          <div className="inbox-heading-title">
            <h2>Inbox</h2>
            <span aria-live="polite">{unread.length} unread</span>
          </div>
          <div className="inbox-heading-actions">
            <button
              type="button"
              className="inbox-icon-button"
              aria-label="Mark all read"
              title="Mark all read"
              disabled={!unread.length}
              onClick={() => markRead(items.map((item) => item.id))}
            >
              <Icon name="CheckCheck" size={17} />
            </button>
            <button
              type="button"
              ref={filterTrigger}
              className={`inbox-icon-button ${filter === 'Unread' ? 'filter-active' : ''}`}
              aria-label="Filter notifications"
              title="Filter notifications"
              aria-haspopup="dialog"
              popoverTarget={filterId}
              onClick={() => {
                const rect = filterTrigger.current.getBoundingClientRect();
                setFilterPosition({
                  top: rect.bottom + 6,
                  left: Math.max(
                    8,
                    Math.min(rect.right - 176, window.innerWidth - 184),
                  ),
                });
              }}
            >
              <Icon name="ListFilter" size={17} />
            </button>
            <button
              type="button"
              className="inbox-icon-button"
              aria-label="Close inbox"
              title="Close inbox"
              onClick={close}
            >
              <Icon name="ChevronLeft" size={18} />
            </button>
          </div>
        </header>
        <div
          popover="auto"
          ref={filterPopup}
          id={filterId}
          role="dialog"
          aria-label="Notification filters"
          className="inbox-filter-popup"
          style={filterPosition}
          onToggle={(event) => {
            if (event.newState === 'open')
              filterPopup.current
                ?.querySelector('[aria-pressed="true"]')
                ?.focus();
          }}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === 'Escape') {
              event.preventDefault();
              filterPopup.current?.hidePopover();
              filterTrigger.current?.focus();
            }
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              const buttons = [
                ...filterPopup.current.querySelectorAll('button'),
              ];
              const index = buttons.indexOf(document.activeElement);
              buttons[(index + 1) % buttons.length]?.focus();
            }
          }}
        >
          <span>Show notifications</span>
          {['All', 'Unread'].map((value) => (
            <button
              type="button"
              key={value}
              aria-pressed={filter === value}
              onClick={() => {
                setFilter(value);
                filterPopup.current?.hidePopover();
                filterTrigger.current?.focus();
              }}
            >
              <span>{value}</span>
              {filter === value && <Icon name="Check" size={14} />}
            </button>
          ))}
        </div>
        <div className="inbox-list">
          {visible.length ? (
            visible.map((item) => {
              const team = teams.find((team) => team.id === item.merchantId);
              const isUnread = !readIds.includes(item.id);
              return (
                <article
                  className={`inbox-item ${isUnread ? 'unread' : ''}`}
                  key={item.id}
                >
                  <Icon name={item.icon} size={18} />
                  <div className="inbox-item-content">
                    <button
                      type="button"
                      className="inbox-item-link"
                      onClick={() => {
                        if (markRead([item.id])) {
                          onNavigate(item);
                          onClose();
                        }
                      }}
                    >
                      <small>{team.displayName}</small>
                      <strong>{item.title}</strong>
                      <p>{item.detail}</p>
                      <time dateTime={item.createdAt}>
                        {date(item.createdAt)}
                      </time>
                    </button>
                    {isUnread && (
                      <button
                        type="button"
                        className="inbox-mark-read"
                        onClick={() => markRead([item.id])}
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                  {isUnread && (
                    <span className="inbox-item-dot" aria-label="Unread" />
                  )}
                </article>
              );
            })
          ) : (
            <div className="inbox-empty">
              <Icon name="Inbox" size={28} />
              <h3>
                {filter === 'Unread'
                  ? 'You’re all caught up'
                  : 'No notifications yet'}
              </h3>
              <p>
                {filter === 'Unread'
                  ? 'New updates from your teams will appear here.'
                  : 'Your team updates will appear here.'}
              </p>
            </div>
          )}
        </div>
        {error && (
          <p className="inbox-error" role="alert">
            {error}
          </p>
        )}
      </section>
    </>
  );
}
