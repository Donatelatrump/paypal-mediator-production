import Icon from './Icon';
import React, { useEffect, useRef, useState } from 'react';
import Badge from './Badge';
import EvidenceUpload from './EvidenceUpload';
import { date, label } from './lib/format';

export default function EvidenceScreen({ transaction, snapshots }) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedRevision, setSelectedRevision] = useState(
    snapshots[0].revision,
  );
  const historyButton = useRef(null);
  const evidenceRoot = useRef(null);
  const searchRef = useRef(null);
  const historyButtons = useRef([]);
  const snapshot =
    snapshots.find((item) => item.revision === selectedRevision) ||
    snapshots[0];
  const historical = snapshot.revision !== snapshots[0].revision;
  const close = () => {
    setHistoryOpen(false);
    setSelectedRevision(snapshots[0].revision);
    historyButton.current?.focus();
  };
  useEffect(() => {
    if (!historyOpen) return;
    historyButtons.current[
      snapshots.findIndex((item) => item.revision === selectedRevision)
    ]?.focus({ preventScroll: true });
    const escape = (event) => {
      if (
        event.key === 'Escape' &&
        !event.defaultPrevented &&
        !document.querySelector('dialog[open]')
      ) {
        event.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', escape, true);
    return () => window.removeEventListener('keydown', escape, true);
  }, [historyOpen]);
  useEffect(() => {
    const navigate = (event) => {
      if (
        event.defaultPrevented ||
        document.querySelector('dialog[open]') ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      )
        return;
      if (
        event.target.closest?.(
          'input, textarea, select, .version-sidebar, .sidebar, .topbar',
        )
      )
        return;
      if (
        !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)
      )
        return;
      const cards = Array.from(
        evidenceRoot.current?.querySelectorAll('.evidence-split-card') || [],
      );
      if (!cards.length) return;
      const onHistory = document.activeElement === historyButton.current;
      if (onHistory && !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      if (onHistory) {
        if (event.key === 'ArrowDown')
          cards[0].querySelector('.evidence-current')?.focus();
        return;
      }
      const card = document.activeElement?.closest('.evidence-split-card');
      const index = cards.indexOf(card);
      const inFiles = Boolean(
        document.activeElement?.closest('.evidence-files'),
      );
      if (event.key === 'ArrowUp' && index <= 0) {
        historyButton.current?.focus();
        return;
      }
      if (event.key === 'ArrowDown' && index === cards.length - 1) return;
      let next = index < 0 ? 0 : index;
      if (event.key === 'ArrowDown')
        next = index < 0 ? 0 : Math.min(index + 1, cards.length - 1);
      if (event.key === 'ArrowUp')
        next = index < 0 ? 0 : Math.max(index - 1, 0);
      const files =
        event.key === 'ArrowRight'
          ? true
          : event.key === 'ArrowLeft'
            ? false
            : inFiles;
      const target = files
        ? cards[next].querySelector('.evidence-folder-picker:not(:disabled)')
        : null;
      (target || cards[next].querySelector('.evidence-current'))?.focus({
        preventScroll: true,
      });
      cards[next].scrollIntoView({ block: 'nearest' });
    };
    window.addEventListener('keydown', navigate);
    return () => window.removeEventListener('keydown', navigate);
  }, []);
  const select = (index) => {
    const next = (index + snapshots.length) % snapshots.length;
    setSelectedRevision(snapshots[next].revision);
    historyButtons.current[next]?.focus();
  };
  return (
    <>
      <div className="evidence-toolbar">
        <div
          className="search-field evidence-search"
          onClick={() => searchRef.current?.focus()}
        >
          <Icon name="Search" />
          <input
            ref={searchRef}
            className="search"
            type="text"
            aria-label="Search evidence"
            aria-keyshortcuts="Meta+k Control+k"
            placeholder="Search evidence"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                event.currentTarget.blur();
              }
            }}
          />
          <kbd className="search-shortcut" aria-hidden="true">
            ⌘K
          </kbd>
        </div>
        <div className={`history-control ${historyOpen ? 'is-open' : ''}`}>
          <button
            className={`history-button ${historyOpen ? 'history-button-expanded' : ''}`}
            ref={historyButton}
            aria-label="Version history"
            aria-expanded={historyOpen}
            onClick={() => {
              if (!historyOpen) setHistoryOpen(true);
            }}
          >
            <Icon name="History" />
            <span aria-hidden={!historyOpen}>Version History</span>
          </button>
          {historyOpen && (
            <button
              className="history-control-close"
              aria-label="Close version history"
              onClick={close}
            >
              <Icon name="X" />
            </button>
          )}
        </div>
      </div>
      <div
        className={`evidence-history-layout ${historyOpen ? 'history-open' : ''}`}
      >
        <div>
          <div className="evidence-records" ref={evidenceRoot}>
            {snapshot.checks
              .filter((check) =>
                `${label(check.code)} ${snapshot.items
                  .filter((item) => check.evidenceIds.includes(item.id))
                  .map((item) => `${item.sourceKind} ${item.sourceSystem}`)
                  .join(' ')}`
                  .toLowerCase()
                  .includes(query.trim().toLowerCase()),
              )
              .map((check) => {
                const records = snapshot.items.filter((item) =>
                  check.evidenceIds.includes(item.id),
                );
                const done =
                  check.status === 'PRESENT' &&
                  records.length > 0 &&
                  records.every((item) => item.integrity === 'VALID');
                return (
                  <section
                    className="card evidence-split-card"
                    key={check.code}
                  >
                    <div
                      className="evidence-current"
                      tabIndex={0}
                      aria-label={label(check.code)}
                    >
                      <div className="card-heading">
                        <h2>{label(check.code)}</h2>
                        <Badge>{done ? 'Done' : 'Needs attention'}</Badge>
                      </div>
                      {records.length ? (
                        records.map((item) => (
                          <dl key={item.id}>
                            {!/(demo|fixture|sample|fake|example)/i.test(
                              item.sourceKind,
                            ) && (
                              <div>
                                <dt>Source</dt>
                                <dd>{item.sourceKind}</dd>
                              </div>
                            )}
                            {!/(demo|fixture|sample|fake|example)/i.test(
                              item.sourceSystem,
                            ) && (
                              <div>
                                <dt>System</dt>
                                <dd>{item.sourceSystem}</dd>
                              </div>
                            )}
                            <div>
                              <dt>Retrieved</dt>
                              <dd>{date(item.retrievedAt)}</dd>
                            </div>
                            <div>
                              <dt>Integrity</dt>
                              <dd>{label(item.integrity)}</dd>
                            </div>
                          </dl>
                        ))
                      ) : (
                        <p className="evidence-missing">
                          Additional evidence needed.
                        </p>
                      )}
                    </div>
                    <div className="evidence-files">
                      <EvidenceUpload
                        key={`${transaction.id}-${check.code}-${historical ? snapshot.revision : 'current'}`}
                        category={label(check.code)}
                        readOnly={historical}
                      />
                    </div>
                  </section>
                );
              })}
          </div>
        </div>
        <div
          className="version-sidebar-track"
          inert={!historyOpen}
          aria-hidden={!historyOpen}
        >
          <aside
            className="version-sidebar"
            aria-label="Evidence version history"
          >
            <div
              className="version-list"
              role="listbox"
              aria-label="Evidence revisions"
            >
              {snapshots.map((item, index) => (
                <button
                  key={item.revision}
                  ref={(element) => {
                    historyButtons.current[index] = element;
                  }}
                  role="option"
                  aria-selected={selectedRevision === item.revision}
                  tabIndex={selectedRevision === item.revision ? 0 : -1}
                  className={`version-option ${selectedRevision === item.revision ? 'selected' : ''}`}
                  onClick={() => setSelectedRevision(item.revision)}
                  onKeyDown={(event) => {
                    if (
                      ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(
                        event.key,
                      )
                    ) {
                      event.preventDefault();
                      event.stopPropagation();
                      select(
                        event.key === 'Home'
                          ? 0
                          : event.key === 'End'
                            ? snapshots.length - 1
                            : index + (event.key === 'ArrowDown' ? 1 : -1),
                      );
                    }
                  }}
                >
                  <span className="version-dot" />
                  <span>
                    <strong>{date(item.createdAt)}</strong>
                    <small>
                      Revision {item.revision}
                      {index === 0 ? ' · Current version' : ''}
                    </small>
                    <small>{item.summary}</small>
                  </span>
                </button>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
