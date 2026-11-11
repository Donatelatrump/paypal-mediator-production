import Icon from './Icon';
import React, { useEffect, useId, useRef, useState } from 'react';

export default function TimeZoneCombobox({ value, onChange }) {
  const id = useId();
  const root = useRef(null);
  const input = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const zones = [
    ...new Set([
      value,
      'UTC',
      ...(Intl.supportedValuesOf?.('timeZone') || [
        'America/Los_Angeles',
        'America/Denver',
        'America/Chicago',
        'America/New_York',
        'Europe/London',
        'Europe/Paris',
        'Asia/Tokyo',
        'Australia/Sydney',
      ]),
    ]),
  ].sort();
  const options = zones.filter((zone) =>
    zone
      .replaceAll('_', ' ')
      .toLowerCase()
      .includes(query.replaceAll('_', ' ').trim().toLowerCase()),
  );
  const close = () => {
    setOpen(false);
    setQuery('');
  };
  const choose = (zone) => {
    onChange(zone);
    close();
    input.current?.focus();
  };
  useEffect(() => {
    if (!open) return;
    const dismiss = (event) => {
      if (!root.current?.contains(event.target)) close();
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);
  useEffect(() => {
    if (open)
      document
        .getElementById(`${id}-option-${active}`)
        ?.scrollIntoView({ block: 'nearest' });
  }, [open, active, id]);
  return (
    <div className="timezone-field">
      <label htmlFor={id}>Time zone</label>
      <div
        className="combobox timezone-combobox"
        ref={root}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) close();
        }}
      >
        <div className="combobox-trigger timezone-trigger">
          <input
            id={id}
            ref={input}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={`${id}-listbox`}
            aria-activedescendant={
              open && options[active] ? `${id}-option-${active}` : undefined
            }
            autoComplete="off"
            value={open ? query : value.replaceAll('_', ' ')}
            placeholder={value.replaceAll('_', ' ')}
            onClick={() => {
              if (!open) {
                setOpen(true);
                setActive(0);
              }
            }}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
              setOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && open) {
                event.preventDefault();
                event.stopPropagation();
                close();
              } else if (event.key === 'Tab') close();
              else if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
                event.preventDefault();
                event.stopPropagation();
                setOpen(true);
                setActive((current) =>
                  options.length
                    ? open
                      ? (current +
                          (event.key === 'ArrowDown' ? 1 : -1) +
                          options.length) %
                        options.length
                      : Math.max(0, options.indexOf(value))
                    : 0,
                );
              } else if (event.key === 'Enter' && open) {
                event.preventDefault();
                event.stopPropagation();
                if (options[active]) choose(options[active]);
              }
            }}
          />
          <button
            type="button"
            aria-label={open ? 'Close time zones' : 'Show time zones'}
            onClick={() => {
              setOpen(!open);
              setQuery('');
              setActive(0);
              input.current?.focus();
            }}
          >
            <Icon name={open ? 'ChevronUp' : 'ChevronDown'} />
          </button>
        </div>
        {open && (
          <div className="combobox-options">
            <div role="listbox" id={`${id}-listbox`} aria-label="Time zones">
              {options.map((zone, index) => (
                <div
                  key={zone}
                  id={`${id}-option-${index}`}
                  role="option"
                  aria-selected={zone === value}
                  className={`combobox-option ${active === index ? 'highlighted' : ''}`}
                  onPointerMove={() => setActive(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(zone)}
                >
                  <span>{zone.replaceAll('_', ' ')}</span>
                  {zone === value && <Icon name="Check" />}
                </div>
              ))}
            </div>
            {!options.length && (
              <div className="combobox-empty" role="status">
                No time zones found.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
