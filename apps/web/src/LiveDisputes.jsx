import React, { useEffect, useRef, useState } from 'react';
import { useRemote } from './lib/useRemote';
import { canUseRun, evidenceUploadBody } from './lib/live';
import RemoteState from './RemoteState';
import Badge from './Badge';
import Icon from './Icon';
import EvidenceUpload from './EvidenceUpload';
import { date, label, money } from './lib/format';

export function LiveDisputeList({ api, onOpen }) {
  const [page, setPage] = useState(1);
  const resource = useRemote(
    (signal) => api.disputes({ page, pageSize: 20 }, signal),
    [api, page],
  );
  return (
    <RemoteState resource={resource}>
      {(data) => (
        <>
          <section className="card dispute-cases-card">
            <div className="table-wrap">
              <table
                className="transactions-table disputes-table"
                aria-label="Dispute cases"
              >
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
                  {data.items.map((item) => (
                    <tr
                      key={item.id}
                      tabIndex={0}
                      onClick={() => onOpen(item.id, item.paypalDisputeId)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onOpen(item.id, item.paypalDisputeId);
                        }
                      }}
                    >
                      <td>
                        <div className="dispute-case-cell">
                          <span className="dispute-case-icon">
                            <Icon name="MessageSquareWarning" />
                          </span>
                          <div>
                            <strong>{item.paypalDisputeId}</strong>
                            <small>{label(item.reasonCategory)}</small>
                          </div>
                        </div>
                      </td>
                      <td>{money(item.amount)}</td>
                      <td>
                        <Badge>{label(item.paypalStatus)}</Badge>
                        <small className="live-status-detail">
                          {label(item.internalState)}
                        </small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.items.length && (
                <div className="empty-state">No disputes yet.</div>
              )}
            </div>
          </section>
          <Pagination
            page={page}
            pageSize={data.pageSize}
            total={data.total}
            onPage={setPage}
          />
        </>
      )}
    </RemoteState>
  );
}
export function Pagination({ page, pageSize, total, onPage }) {
  return (
    <div className="live-pagination">
      <small>
        {total} total · Page {page} of{' '}
        {Math.max(1, Math.ceil(total / pageSize))}
      </small>
      <button
        className="button secondary"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        Previous
      </button>
      <button
        className="button secondary"
        disabled={page * pageSize >= total}
        onClick={() => onPage(page + 1)}
      >
        Next
      </button>
    </div>
  );
}
export function LiveDisputeDetail({
  api,
  disputeId,
  merchant,
  onTransaction,
  onEvidence,
  onTitle,
}) {
  const resource = useRemote(
    async (signal) => {
      const dispute = await api.dispute(disputeId, signal);
      if (!dispute.link.transactionId)
        return {
          dispute,
          transaction: null,
          dossier: null,
          investigation: null,
          verification: null,
        };
      const transactionId = dispute.link.transactionId;
      const [transaction, dossier, investigations] = await Promise.all([
        api.transaction(transactionId, signal),
        api.evidence(transactionId, signal),
        api.investigations(transactionId, signal),
      ]);
      const investigation = investigations.items[0] || null;
      const verifications = investigation
        ? await api.verifications(transactionId, investigation.id, signal)
        : { items: [] };
      return {
        dispute,
        transaction,
        dossier,
        investigation,
        verification: verifications.items[0] || null,
      };
    },
    [api, disputeId],
  );
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(null),
    [error, setError] = useState(''),
    [submission, setSubmission] = useState(null),
    [confirming, setConfirming] = useState(false),
    [consent, setConsent] = useState(false);
  const keys = useRef({});
  const hydratedInvestigation = useRef(null);
  const admin = merchant.role === 'ADMIN';
  const investigation = resource.data?.investigation,
    verification = resource.data?.verification;
  useEffect(() => {
    if (resource.data?.dispute) onTitle(resource.data.dispute.paypalDisputeId);
  }, [resource.data?.dispute?.paypalDisputeId]);
  useEffect(() => {
    if (
      investigation?.result?.suggestedResponse &&
      hydratedInvestigation.current !== investigation.id
    ) {
      hydratedInvestigation.current = investigation.id;
      setDraft(investigation.result.suggestedResponse);
    }
  }, [investigation?.id, investigation?.result?.suggestedResponse]);
  useEffect(() => {
    if (
      ![investigation, verification].some(
        (run) => run?.status === 'RUNNING' && !run.expired,
      )
    )
      return;
    const timer = setInterval(resource.reload, 5000);
    return () => clearInterval(timer);
  }, [
    investigation?.id,
    investigation?.status,
    verification?.id,
    verification?.status,
    resource.data,
  ]);
  const run = async (type, callback) => {
    setBusy(type);
    setError('');
    if (type !== 'submit') {
      setConfirming(false);
      setConsent(false);
    }
    const key = (keys.current[type] ||= crypto.randomUUID());
    try {
      const result = await callback(key);
      if (type === 'submit') {
        setSubmission(result);
        setConfirming(false);
        setConsent(false);
        if (result.status !== 'SUBMITTED')
          setError(
            result.guardResult.reasons
              .map((item) => item.explanation)
              .join(' ') ||
              result.errorMessage ||
              'Submission was not completed.',
          );
      } else if (result.status === 'FAILED')
        setError(
          `${label(type)} failed: ${result.errorCode || 'Unknown error'}`,
        );
      if (result.status !== 'RUNNING') delete keys.current[type];
      resource.reload();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(null);
    }
  };
  return (
    <>
      {error && (
        <p className="live-error" role="alert">
          {error}
        </p>
      )}
      {submission && (
        <section className="card">
          <h2>Submission {label(submission.status)}</h2>
          <p>
            {submission.errorMessage ||
              (submission.status === 'SUBMITTED'
                ? `Submitted ${date(submission.submittedAt)}`
                : submission.guardResult.reasons
                    .map((item) => item.explanation)
                    .join(' '))}
          </p>
        </section>
      )}
      <RemoteState resource={resource}>
        {(data) => {
          const invValid = canUseRun(
              data.investigation,
              data.dossier?.revision,
            ),
            verificationValid =
              invValid &&
              canUseRun(data.verification, data.dossier?.revision) &&
              data.verification.investigationId === data.investigation.id;
          const submitReady =
            admin &&
            merchant.policy.allowSubmissions &&
            verificationValid &&
            data.verification.result.verdict === 'APPROVED' &&
            data.dispute.internalState === 'LINKED' &&
            data.dispute.link.status === 'LINKED' &&
            ['WAITING_FOR_SELLER_RESPONSE', 'UNDER_REVIEW'].includes(
              data.dispute.paypalStatus,
            ) &&
            ['INQUIRY', 'CHARGEBACK'].includes(data.dispute.paypalStage) &&
            submission?.status !== 'SUBMITTED';
          const running = [data.investigation, data.verification].some(
            (run) => run?.status === 'RUNNING' && !run.expired,
          );
          return (
            <div className="dispute-workspace-grid">
              <section className="card dispute-conversation">
                <div
                  className="dispute-chat-log"
                  role="log"
                  aria-label="Case events"
                >
                  {data.dispute.events.map((event) => (
                    <div
                      className="dispute-chat-message from-buyer"
                      key={event.id}
                    >
                      <div className="dispute-chat-message-content">
                        <div className="dispute-chat-author">PayPal</div>
                        <div className="dispute-chat-bubble">
                          <p>{label(event.eventType)}</p>
                          {event.reason && <p>{label(event.reason)}</p>}
                        </div>
                        <time
                          className="dispute-chat-time"
                          dateTime={event.occurredAt}
                        >
                          {date(event.occurredAt)}
                        </time>
                      </div>
                    </div>
                  ))}
                  {!data.dispute.events.length && (
                    <p className="muted">No case events yet.</p>
                  )}
                </div>
                <div className="dispute-chat-composer">
                  <div className="dispute-draft-label">
                    <label htmlFor="live-response-draft">Response draft</label>
                  </div>
                  <textarea
                    id="live-response-draft"
                    aria-label="Response draft"
                    rows={5}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={
                      running
                        ? 'The AI is reviewing the evidence…'
                        : 'Generate a draft from the current evidence.'
                    }
                  />
                  <div className="button-row live-draft-actions">
                    <button
                      className="button secondary"
                      disabled={
                        !data.transaction ||
                        !admin ||
                        !merchant.policy.allowInvestigations ||
                        busy ||
                        running
                      }
                      onClick={() =>
                        run('investigation', (key) =>
                          api.startInvestigation(data.transaction.id, key),
                        )
                      }
                    >
                      <Icon name="Sparkles" />
                      {busy === 'investigation' || running
                        ? 'Reviewing…'
                        : 'Generate draft'}
                    </button>
                    <button
                      className="button secondary"
                      disabled={
                        !invValid ||
                        !admin ||
                        !merchant.policy.allowInvestigations ||
                        busy ||
                        running
                      }
                      onClick={() =>
                        run('verification', (key) =>
                          api.startVerification(
                            data.transaction.id,
                            data.investigation.id,
                            key,
                          ),
                        )
                      }
                    >
                      Verify evidence
                    </button>
                    <button
                      className="button primary"
                      disabled={!submitReady || busy}
                      onClick={() => {
                        setConfirming(true);
                        setConsent(false);
                      }}
                    >
                      Review submission
                    </button>
                  </div>
                  {!merchant.policy.allowInvestigations && (
                    <small>
                      Investigations are disabled in merchant policies.
                    </small>
                  )}
                  <small className="live-draft-note">
                    Draft edits stay in this field. PayPal submissions use the
                    independently verified evidence, not this editable text.
                  </small>
                </div>
              </section>
              <div className="dispute-stack">
                <section className="card">
                  <div className="card-heading">
                    <h2>Defense checklist</h2>
                  </div>
                  {data.transaction ? (
                    <>
                      <div className="dispute-checklist">
                        {data.transaction.readiness.checks.map((check) => (
                          <div className="dispute-check-row" key={check.code}>
                            <span>{label(check.code)}</span>
                            <Badge>{label(check.status)}</Badge>
                          </div>
                        ))}
                      </div>
                      <div className="card-bottom dispute-review-actions">
                        <button
                          className="button secondary full"
                          onClick={() => onEvidence(data.transaction.id)}
                        >
                          Review evidence dossier
                          <Icon name="ArrowUpRight" />
                        </button>
                        <button
                          className="button secondary full"
                          onClick={() => onTransaction(data.transaction.id)}
                        >
                          Open transaction details
                          <Icon name="ArrowUpRight" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <p>
                      No transaction is linked to this dispute.{' '}
                      {label(data.dispute.link.reason)}
                    </p>
                  )}
                </section>
                <section className="card">
                  <h2>AI review</h2>
                  {[data.investigation, data.verification]
                    .filter(Boolean)
                    .map((item, index) => (
                      <div key={item.id}>
                        <h3>
                          {index === 0 ? 'Investigation' : 'Verification'}
                        </h3>
                        <p>
                          {label(item.status)}
                          {item.stale ? ' · Evidence has changed' : ''}
                          {item.expired ? ' · Expired' : ''}
                        </p>
                        {item.errorCode && <p role="alert">{item.errorCode}</p>}
                        {item.result?.summary && <p>{item.result.summary}</p>}
                        {item.result?.verdict && (
                          <Badge>{label(item.result.verdict)}</Badge>
                        )}
                        {item.result?.missingRequirements?.map((reason, i) => (
                          <p key={i}>{reason}</p>
                        ))}
                      </div>
                    ))}
                  {!data.investigation && <p>No investigation yet.</p>}
                </section>
                {data.transaction && (
                  <section className="card">
                    <h2>Additional evidence</h2>
                    <p>PDF, PNG, or JPEG · up to 512 KB.</p>
                    <EvidenceUpload
                      category="Dispute evidence"
                      readOnly={!admin}
                      accept="application/pdf,image/png,image/jpeg"
                      onUpload={async (file) => {
                        await api.uploadEvidence(
                          data.transaction.id,
                          await evidenceUploadBody(file),
                        );
                        resource.reload();
                      }}
                    />
                  </section>
                )}
                {confirming && submitReady && (
                  <section className="card live-confirm">
                    <h2>Submit verified evidence to PayPal?</h2>
                    <p>
                      Case {data.dispute.paypalDisputeId} ·{' '}
                      {data.verification.result.verifiedEvidenceIds.length}{' '}
                      verified records. This sends an external request to
                      PayPal.
                    </p>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(event) => setConsent(event.target.checked)}
                      />
                      I approve submitting this evidence.
                    </label>
                    <div className="button-row">
                      <button
                        className="button primary"
                        disabled={!consent || busy || !submitReady}
                        onClick={() =>
                          run('submit', (key) =>
                            api.submitDispute(data.dispute.id, key),
                          )
                        }
                      >
                        {busy === 'submit' ? 'Submitting…' : 'Submit to PayPal'}
                      </button>
                      <button
                        className="button secondary"
                        disabled={!!busy}
                        onClick={() => setConfirming(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </section>
                )}
              </div>
            </div>
          );
        }}
      </RemoteState>
    </>
  );
}
