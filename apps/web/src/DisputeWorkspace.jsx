import Icon from './Icon';
import DisputeConversation from './DisputeConversation';
import EvidenceUpload from './EvidenceUpload';
import SegmentedFilters from './SegmentedFilters';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Badge from './Badge';
import { date, disputeReference, label, money } from './lib/format';

// Dispute UI fixtures only. M05–M09 are not implemented by the backend.
const activityEvents = [
  {
    id: 'ACT-204',
    target: 'evidence',
    category: 'Investigation',
    title: 'Payment record collected',
    detail: 'A payment record is available in the evidence dossier.',
    time: '2026-11-06T10:00:00Z',
    status: 'Completed',
  },
  {
    id: 'ACT-203',
    target: 'evidence',
    category: 'Verification',
    title: 'Delivery evidence needs review',
    detail:
      'The available delivery record has not been independently verified.',
    time: '2026-11-06T09:45:00Z',
    status: 'Needs review',
  },
  {
    id: 'ACT-202',
    target: 'dispute',
    category: 'Review',
    title: 'Merchant response awaiting review',
    detail: 'Review the merchant response before submission.',
    time: '2026-11-06T09:30:00Z',
    status: 'Not submitted',
  },
];
const Card = ({ children, className = '' }) => (
  <section className={`card ${className}`}>{children}</section>
);

function ActivityList({ events = activityEvents, onOpen }) {
  return (
    <div className="dispute-activity-list">
      {events.map((event) => (
        <button
          type="button"
          className="dispute-activity-item"
          key={event.id}
          onClick={() => onOpen(event)}
        >
          <Icon name="Circle" className="dispute-activity-mark" />
          <span className="dispute-activity-copy">
            <strong>{event.title}</strong>
            <span className="dispute-activity-detail">{event.detail}</span>
            <small>
              {event.id} · {date(event.time)}
            </small>
          </span>
          <Badge>{event.status}</Badge>
        </button>
      ))}
    </div>
  );
}

export default function DisputeWorkspace({
  page,
  transaction,
  onTransaction,
  onEvidence,
  onCaseOpen,
  account,
}) {
  const previousPage = useRef(page);
  const [tableKeyboard, setTableKeyboard] = useState(false);
  const caseRow = useRef(null);
  useEffect(() => {
    if (previousPage.current === 'dispute-details' && page === 'disputes')
      caseRow.current?.focus();
    previousPage.current = page;
  }, [page]);
  const [filter, setFilter] = useState('All activity');
  const [selectedEvidence, setSelectedEvidence] = useState(() =>
    transaction.readiness.checks
      .filter((item) => item.status === 'PRESENT')
      .map((item) => item.code),
  );

  const checks = transaction.readiness.checks;
  const presentCount = checks.filter(
    (item) => item.status === 'PRESENT',
  ).length;
  const needsReview = checks.some((item) => item.status === 'CONFLICT');
  const filteredEvents = useMemo(
    () =>
      activityEvents.filter(
        (event) => filter === 'All activity' || event.category === filter,
      ),
    [filter],
  );

  const openActivity = (event) =>
    event.target === 'evidence' ? onEvidence() : onCaseOpen();

  if (page === 'activity')
    return (
      <>
        <div className="filters transaction-toolbar activity-toolbar">
          <SegmentedFilters
            value={filter}
            onChange={setFilter}
            options={[
              'All activity',
              'Investigation',
              'Verification',
              'Review',
            ]}
            label="Activity filters"
            onArrowDown={() =>
              document.querySelector('.dispute-activity-item')?.focus()
            }
          />
        </div>
        <Card>
          <ActivityList events={filteredEvents} onOpen={openActivity} />
        </Card>
      </>
    );

  if (page !== 'dispute-details')
    return (
      <>
        <div className="stats-grid">
          {[
            ['Open cases', '1', 'Awaiting a response'],
            ['Needs review', needsReview ? '1' : '0', 'Evidence verification'],
            [
              'Evidence records',
              String(presentCount),
              'Available in the dossier',
            ],
            ['Submitted', '0', 'Responses submitted'],
          ].map(([name, value, note]) => (
            <Card key={name}>
              <div className="stat-label">{name}</div>
              <div className="stat-value">{value}</div>
              <small>{note}</small>
            </Card>
          ))}
        </div>
        <Card className="dispute-cases-card">
          <div
            className={`table-wrap ${tableKeyboard ? 'table-keyboard-mode' : 'table-pointer-mode'}`}
            onPointerMove={(event) => {
              if (event.movementX || event.movementY) setTableKeyboard(false);
            }}
            onPointerDown={() => setTableKeyboard(false)}
          >
            <table
              className="transactions-table disputes-table"
              aria-label="Dispute cases"
            >
              <colgroup>
                <col className="dispute-col-case" />
                <col className="dispute-col-amount" />
                <col className="dispute-col-status" />
              </colgroup>
              <thead>
                <tr>
                  {['Case', 'Amount', 'Status'].map((title) => (
                    <th scope="col" key={title}>
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr
                  ref={caseRow}
                  tabIndex={0}
                  aria-label={`Open dispute ${disputeReference(transaction)}`}
                  onClick={onCaseOpen}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      event.stopPropagation();
                      onCaseOpen();
                    } else if (
                      ['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(
                        event.key,
                      )
                    ) {
                      event.preventDefault();
                      event.stopPropagation();
                      setTableKeyboard(true);
                      event.currentTarget.focus();
                    }
                  }}
                  onFocus={() => setTableKeyboard(true)}
                >
                  <td>
                    <div className="dispute-case-cell">
                      <span className="dispute-case-icon">
                        <Icon name="MessageSquareWarning" size={18} />
                      </span>
                      <div>
                        <strong>{disputeReference(transaction)}</strong>
                        <small>{transaction.paypalCaptureId}</small>
                      </div>
                    </div>
                  </td>
                  <td>{money(transaction.amount)}</td>
                  <td>
                    <Badge>Needs review</Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </>
    );

  return (
    <>
      <div className="dispute-workspace-grid">
        <DisputeConversation
          key={transaction.id}
          transaction={transaction}
          account={account}
          selectedEvidence={selectedEvidence}
        />
        <div className="dispute-stack">
          <Card>
            <div className="card-heading">
              <h2>Defense checklist</h2>
            </div>
            <p className="muted">Based on the transaction evidence dossier.</p>
            <div className="dispute-checklist">
              {checks.map((check) => (
                <div className="dispute-check-row" key={check.code}>
                  <span>{label(check.code)}</span>
                  <Badge>{label(check.status)}</Badge>
                </div>
              ))}
            </div>
            <div className="card-bottom dispute-review-actions">
              <button
                type="button"
                className="button secondary full"
                onClick={onEvidence}
              >
                Review evidence dossier <Icon name="ArrowUpRight" />
              </button>
              <button
                type="button"
                className="button secondary full"
                onClick={onTransaction}
              >
                Open transaction details <Icon name="ArrowUpRight" />
              </button>
            </div>
          </Card>
          <Card>
            <div className="card-heading">
              <h2>Evidence picker</h2>
            </div>
            <p className="muted">
              Select the files the AI can use when drafting a response to this
              dispute.
            </p>
            <div className="dispute-evidence-options">
              {checks
                .filter((check) => check.status === 'PRESENT')
                .map((check) => (
                  <label className="dispute-evidence-option" key={check.code}>
                    <span className="dispute-evidence-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedEvidence.includes(check.code)}
                        onChange={(event) =>
                          setSelectedEvidence((items) =>
                            event.target.checked
                              ? [...items, check.code]
                              : items.filter((item) => item !== check.code),
                          )
                        }
                      />
                      <Icon name="Check" size={12} strokeWidth={2.5} />
                    </span>
                    <span>
                      <strong>{label(check.code)}</strong>
                    </span>
                  </label>
                ))}
            </div>
            <div className="dispute-evidence-upload">
              <h3>Additional files</h3>
              <EvidenceUpload
                key={transaction.id}
                category="Supporting evidence"
                accept="image/*,.pdf"
              />
            </div>
          </Card>
          <Card>
            <div className="card-heading">
              <h2>Case activity</h2>
            </div>
            <ActivityList
              events={activityEvents.slice(0, 2)}
              onOpen={openActivity}
            />
          </Card>
        </div>
      </div>
    </>
  );
}
