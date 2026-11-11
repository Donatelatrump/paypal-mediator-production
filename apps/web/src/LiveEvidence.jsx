import React, { useState } from 'react';
import { useRemote } from './lib/useRemote';
import { evidenceUploadBody } from './lib/live';
import RemoteState from './RemoteState';
import EvidenceUpload from './EvidenceUpload';
import Badge from './Badge';
import Icon from './Icon';
import { date, label } from './lib/format';
export default function LiveEvidence({ api, transactionId, admin }) {
  const resource = useRemote(
    (signal) =>
      Promise.all([
        api.transaction(transactionId, signal),
        api.evidence(transactionId, signal),
      ]),
    [api, transactionId],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState(false);
  const [query, setQuery] = useState('');
  const refresh = async () => {
    setBusy(true);
    setError('');
    try {
      await api.refreshEvidence(transactionId);
      resource.reload();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  };
  const download = async (item) => {
    setError('');
    try {
      const blob = await api.downloadEvidence(transactionId, item.id);
      const url = URL.createObjectURL(blob),
        anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = item.content.fileName;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (failure) {
      setError(failure.message);
    }
  };
  return (
    <>
      <div className="evidence-toolbar">
        <div className="search-field">
          <Icon name="Search" />
          <input
            type="search"
            aria-label="Search evidence"
            placeholder="Search evidence"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <button
          className="button secondary"
          aria-pressed={history}
          onClick={() => setHistory((value) => !value)}
        >
          <Icon name="History" />
          {history ? 'Current records' : 'Version history'}
        </button>
        {admin && (
          <button
            className="button secondary"
            disabled={busy}
            onClick={refresh}
          >
            {busy ? 'Refreshing…' : 'Refresh evidence'}
          </button>
        )}
      </div>
      {error && <p role="alert">{error}</p>}
      <RemoteState resource={resource}>
        {([transaction, dossier]) => (
          <>
            <p className="muted">
              Revision {dossier.revision} ·{' '}
              {history ? 'All original record versions' : 'Current records'}
            </p>
            <div className="evidence-records">
              {dossier.items
                .filter(
                  (item) =>
                    (history || item.current) &&
                    `${label(item.type)} ${item.sourceSystem} ${item.content.fileName || ''}`
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                )
                .map((item) => (
                  <section className="card" key={item.id}>
                    <div className="card-heading">
                      <h2>{label(item.type)}</h2>
                      <Badge>{item.current ? 'Current' : 'Historical'}</Badge>
                    </div>
                    <dl>
                      <div>
                        <dt>Source</dt>
                        <dd>
                          {label(item.sourceKind)} · {item.sourceSystem}
                        </dd>
                      </div>
                      <div>
                        <dt>Version</dt>
                        <dd>{item.version}</dd>
                      </div>
                      <div>
                        <dt>Retrieved</dt>
                        <dd>{date(item.retrievedAt)}</dd>
                      </div>
                      <div>
                        <dt>Integrity</dt>
                        <dd>{label(item.integrity)}</dd>
                      </div>
                    </dl>
                    {item.type === 'DOCUMENT' ? (
                      <>
                        <p>{item.content.fileName}</p>
                        <button
                          className="button secondary"
                          onClick={() => download(item)}
                        >
                          Download original
                        </button>
                      </>
                    ) : (
                      <details className="live-original">
                        <summary>Original record</summary>
                        <pre>{JSON.stringify(item.content, null, 2)}</pre>
                      </details>
                    )}
                  </section>
                ))}
            </div>
            {!dossier.items.length && (
              <section className="card">
                <p>No evidence records yet.</p>
              </section>
            )}
            <section className="card live-upload-card">
              <h2>Additional evidence</h2>
              <p>PDF, PNG, or JPEG · up to 512 KB per file.</p>
              <EvidenceUpload
                key={transactionId}
                category="Supporting evidence"
                readOnly={!admin}
                accept="application/pdf,image/png,image/jpeg"
                onUpload={async (file) => {
                  const body = await evidenceUploadBody(file);
                  await api.uploadEvidence(transaction.id, body);
                  resource.reload();
                }}
              />
            </section>
          </>
        )}
      </RemoteState>
    </>
  );
}
