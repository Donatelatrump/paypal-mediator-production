import Icon from './Icon';
import React, { useEffect, useId, useRef, useState } from 'react';

export default function Combobox({ label, value, onChange, options }) {
  const id = useId();
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const typeahead = useRef({ text: '', time: 0 });
  const selected = Math.max(0, options.indexOf(value));
  useEffect(() => {
    if (!open) return;
    const dismiss = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
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
  const choose = (index) => {
    onChange(options[index]);
    setOpen(false);
    triggerRef.current?.focus();
  };
  const onKeyDown = (event) => {
    const key = event.key;
    if (key === 'Tab') {
      setOpen(false);
      return;
    }
    if (
      !open &&
      ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key) &&
      event.currentTarget.closest('.report-panels')
    )
      return;
    if (key === 'Escape') {
      if (open) {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
      }
      return;
    }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(key)) {
      event.preventDefault();
      event.stopPropagation();
      if (key === 'Enter' || key === ' ') {
        if (open) choose(active);
        else {
          setActive(selected);
          setOpen(true);
        }
      } else {
        setOpen(true);
        if (key === 'Home') setActive(0);
        else if (key === 'End') setActive(options.length - 1);
        else
          setActive(
            open
              ? (active + (key === 'ArrowDown' ? 1 : -1) + options.length) %
                  options.length
              : selected,
          );
      }
    } else if (
      key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault();
      event.stopPropagation();
      const now = Date.now();
      const previous = typeahead.current;
      const text =
        now - previous.time < 700
          ? previous.text + key.toLowerCase()
          : key.toLowerCase();
      typeahead.current = { text, time: now };
      const index = options.findIndex((option) =>
        option.toLowerCase().startsWith(text),
      );
      if (index >= 0) {
        setActive(index);
        setOpen(true);
      }
    }
  };
  return (
    <div
      className="combobox"
      ref={rootRef}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        ref={triggerRef}
        className="combobox-trigger"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-activedescendant={open ? `${id}-option-${active}` : undefined}
        onKeyDown={onKeyDown}
        onClick={() => {
          setActive(selected);
          setOpen(!open);
        }}
      >
        <span>{value}</span>
        <Icon name={open ? 'ChevronUp' : 'ChevronDown'} />
      </button>
      {open && (
        <div
          className="combobox-options"
          role="listbox"
          id={`${id}-listbox`}
          aria-label={label}
        >
          {options.map((option, index) => (
            <div
              key={option}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={value === option}
              className={`combobox-option ${active === index ? 'highlighted' : ''}`}
              onPointerMove={() => setActive(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={(event) => {
                event.preventDefault();
                choose(index);
              }}
            >
              <span>{option}</span>
              {value === option && <Icon name="Check" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
