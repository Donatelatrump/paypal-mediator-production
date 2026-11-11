import React, { useState } from 'react';
import { useRemote } from './lib/useRemote';
import { activityCategory } from './lib/live';
import RemoteState from './RemoteState';
import SegmentedFilters from './SegmentedFilters';
import Badge from './Badge';
import Icon from './Icon';
import { date, label } from './lib/format';
export default function LiveActivity({ api, onNavigate, transactionId }) {
  const [filter, setFilter] = useState('All activity');
  const [cursor, setCursor] = useState(null);
  const resource = useRemote(
    (signal) =>
      api.activity(
        {
          limit: 30,
          ...cursor,
          ...(transactionId ? { transactionId } : {}),
          ...(filter === 'Investigation'
            ? { module: 'M05' }
            : filter === 'Verification'
              ? { module: 'M06' }
              : {}),
        },
        signal,
      ),
    [api, cursor, filter, transactionId],
  );
  return (
    <>
      <div className="filters transaction-toolbar activity-toolbar">
        <SegmentedFilters
          value={filter}
          onChange={(value) => {
            setCursor(null);
            setFilter(value);
          }}
          options={['All activity', 'Investigation', 'Verification', 'Review']}
          label="Activity filters"
        />
      </div>
      <RemoteState resource={resource}>
        {(data) => (
          <>
            <section className="card">
              <div className="dispute-activity-list">
                {data.items
                  .filter(
                    (event) =>
                      filter !== 'Review' ||
                      activityCategory(event) === 'Review',
                  )
                  .map((event) => (
                    <button
                      type="button"
                      className="dispute-activity-item"
                      key={event.id}
                      onClick={() => onNavigate(event)}
                    >
                      <Icon name="Circle" className="dispute-activity-mark" />
                      <span className="dispute-activity-copy">
                        <strong>{label(event.action)}</strong>
                        <span className="dispute-activity-detail">
                          {event.record?.details?.errorCode ||
                            label(event.resourceType)}
                        </span>
                        <small>{date(event.createdAt)}</small>
                      </span>
                      <Badge>{label(event.outcome)}</Badge>
                    </button>
                  ))}
              </div>
              {!data.items.length && <p>No activity yet.</p>}
            </section>
            <div className="live-pagination">
              <button
                className="button secondary"
                disabled={!cursor}
                onClick={() => setCursor(null)}
              >
                Latest
              </button>
              <button
                className="button secondary"
                disabled={!data.nextCursor}
                onClick={() => setCursor(data.nextCursor)}
              >
                Older activity
              </button>
            </div>
          </>
        )}
      </RemoteState>
    </>
  );
}
