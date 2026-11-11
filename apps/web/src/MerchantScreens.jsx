import Icon from './Icon';
import React, { useState } from 'react';

const activity = [
  {
    id: 'A-204',
    title: 'Dispute evidence assembled',
    detail:
      'Order #1042 · Receipt, delivery record, and conversation collected.',
    category: 'Investigations',
    status: 'Ready for review',
    time: 'Today, 10:24 AM',
    order: '1042',
  },
  {
    id: 'A-203',
    title: 'Transaction protection check',
    detail: 'Order #1041 · Delivery tracking requires attention.',
    category: 'Protection',
    status: 'Needs attention',
    time: 'Today, 9:45 AM',
    order: '1041',
  },
  {
    id: 'A-202',
    title: 'Resolution proposal prepared',
    detail: 'Order #1042 · Partial refund proposed for merchant review.',
    category: 'Actions',
    status: 'Awaiting approval',
    time: 'Yesterday, 3:12 PM',
    order: '1042',
  },
  {
    id: 'A-201',
    title: 'Delivery verified',
    detail: 'Order #1038 · Delivery confirmation added to the transaction.',
    category: 'Protection',
    status: 'Complete',
    time: 'Nov 3, 9:00 AM',
    order: '1038',
  },
];
export default function MerchantScreens({ page, orders, go, open }) {
  const [filter, setFilter] = useState('All activity');
  const card = (children, key) => (
    <section className="card" key={key}>
      {children}
    </section>
  );
  const log = (items) => (
    <div className="agent-log">
      {items.map((item) => (
        <button
          className="agent-entry"
          key={item.id}
          onClick={() =>
            open(
              orders.find((order) => order.id === item.order),
              item.order === '1042' ? 'mediation' : 'details',
            )
          }
        >
          <span className="agent-symbol">
            <Icon name="Sparkles" />
          </span>
          <span className="agent-detail">
            <strong>{item.title}</strong>
            <small>{item.detail}</small>
            <small>
              {item.id} · {item.time}
            </small>
          </span>
          <span className="badge">{item.status}</span>
          <span aria-hidden="true">
            <Icon name="ArrowUpRight" />
          </span>
        </button>
      ))}
    </div>
  );
  if (page === 'activity')
    return card(
      <>
        <div className="filters">
          <div className="tabs">
            {['All activity', 'Investigations', 'Protection', 'Actions'].map(
              (label) => (
                <button
                  key={label}
                  className={filter === label ? 'selected' : ''}
                  onClick={() => setFilter(label)}
                >
                  {label}
                </button>
              ),
            )}
          </div>
          <span className="muted">4 events</span>
        </div>
        {log(
          activity.filter(
            (item) => filter === 'All activity' || item.category === filter,
          ),
        )}
      </>,
    );
  if (page === 'disputes')
    return (
      <>
        <div className="stats-grid">
          {[
            ['Active disputes', '1'],
            ['Awaiting your review', '1'],
            ['Evidence ready', '1'],
            ['Resolved', '1'],
          ].map(([label, value]) =>
            card(
              <>
                <div className="stat-label">{label}</div>
                <div className="stat-value">{value}</div>
              </>,
              label,
            ),
          )}
        </div>
        {card(
          <>
            <div className="card-heading">
              <h2>Active disputes</h2>
              <span className="muted">AI defense</span>
            </div>
            <div className="dispute-entry">
              <div>
                <span className="badge">Needs review</span>
                <h3>Studio headphones</h3>
                <p>Case #M-1042 · Item not as described</p>
                <small>$249.00 transaction · Evidence assembled</small>
              </div>
              <div className="button-row">
                <button
                  className="button secondary"
                  onClick={() => open(orders[0], 'details')}
                >
                  View transaction
                </button>
                <button
                  className="button primary"
                  onClick={() => open(orders[0], 'mediation')}
                >
                  Open dispute <Icon name="ArrowUpRight" />
                </button>
              </div>
            </div>
          </>,
        )}
        {card(
          <>
            <div className="card-heading">
              <h2>Resolved disputes</h2>
            </div>
            <button
              className="settings-purchase"
              onClick={() => open(orders[3], 'outcome')}
            >
              <span>
                <strong>Everyday backpack</strong>
                <small>Case #M-1034 · Replacement delivered</small>
              </span>
              <span className="badge">Resolved</span>
            </button>
          </>,
        )}
      </>
    );
  return (
    <>
      <div className="stats-grid">
        {[
          ['Merchant health', 'Good', '1 transaction needs attention'],
          [
            'Protection readiness',
            '3 of 4',
            'Transactions with supporting records',
          ],
          ['Active disputes', '1', 'Evidence ready for your review'],
          ['Agent activity', '4', 'Recent investigations and actions'],
        ].map(([label, value, detail]) =>
          card(
            <>
              <div className="stat-label">{label}</div>
              <div className="stat-value">{value}</div>
              <small>{detail}</small>
            </>,
            label,
          ),
        )}
      </div>
      <div className="two-column">
        {card(
          <>
            <div className="card-heading">
              <h2>Readiness checklist</h2>
              <span className="badge">Needs attention</span>
            </div>
            <div className="settings-info-row">
              <span>Payment records</span>
              <span className="badge">Available</span>
            </div>
            <div className="settings-info-row">
              <span>Order receipts</span>
              <span className="badge">Available</span>
            </div>
            <div className="settings-info-row">
              <span>Delivery tracking · #1041</span>
              <button className="text-button" onClick={() => open(orders[1])}>
                Review <Icon name="ArrowUpRight" />
              </button>
            </div>
          </>,
        )}
        {card(
          <>
            <div className="card-heading">
              <h2>Dispute defense</h2>
              <span className="badge">Action needed</span>
            </div>
            <h3>Evidence is ready for review.</h3>
            <p>
              Your agent assembled supporting records for the Studio headphones
              dispute.
            </p>
            <button
              className="button primary"
              onClick={() => open(orders[0], 'mediation')}
            >
              Review dispute <Icon name="ArrowUpRight" />
            </button>
          </>,
        )}
      </div>
      {card(
        <>
          <div className="card-heading">
            <h2>Recent agent activity</h2>
            <button className="text-button" onClick={() => go('activity')}>
              View all <Icon name="ArrowUpRight" />
            </button>
          </div>
          {log(activity.slice(0, 3))}
        </>,
      )}
    </>
  );
}
