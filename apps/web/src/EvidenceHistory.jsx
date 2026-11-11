import Icon from './Icon';
import React, { useEffect, useId, useRef, useState } from 'react';
import { date, label } from './lib/format';

export default function EvidenceHistory({ dossier }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const dismiss = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);
  const items = [...dossier.items].sort(
    (a, b) =>
      b.retrievedAt.localeCompare(a.retrievedAt) || b.version - a.version,
  );
  return (
    <div
      className="evidence-history"
      ref={rootRef}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          buttonRef.current?.focus();
        }
      }}
    >
      <button
        type="button"
        ref={buttonRef}
        className="history-button"
        aria-label="Evidence version history"
        title="Version history"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <Icon name="History" />
      </button>
      {open && (
        <section
          className="history-popover"
          id={id}
          aria-label="Version history"
        >
          <div className="history-heading">
            <h2>Version history</h2>
            <span>Evidence revision {dossier.revision}</span>
          </div>
          {items.length ? (
            <ol>
              {items.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{label(item.type)}</strong>
                    <span>
                      Version {item.version} ·{' '}
                      {item.current ? 'Current' : 'Historical'}
                    </span>
                  </div>
                  <small>{date(item.retrievedAt)}</small>
                  {!/(demo|fixture|sample|fake|example)/i.test(
                    item.sourceSystem,
                  ) && <small>{item.sourceSystem}</small>}
                </li>
              ))}
            </ol>
          ) : (
            <p>No evidence versions yet.</p>
          )}
        </section>
      )}
    </div>
  );
}
