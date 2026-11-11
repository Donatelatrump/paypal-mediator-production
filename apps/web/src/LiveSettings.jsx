import React, { useEffect, useRef, useState } from 'react';
import { useRemote } from './lib/useRemote';
import RemoteState from './RemoteState';
import SidebarIcon from './SidebarIcon';
import Icon from './Icon';
import Badge from './Badge';
import { date, label } from './lib/format';

function MerchantInformation({ api, merchant, onSaved }) {
  const [name, setName] = useState(merchant.displayName);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  return (
    <>
      <div className="settings-section-heading">
        <h2>Information</h2>
        <p>Your merchant profile.</p>
      </div>
      <form
        className="account-settings-form account-information-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setMessage('');
          try {
            const updated = await api.updateMerchant({
              displayName: name.trim(),
            });
            onSaved(updated);
            setMessage('Merchant information updated.');
          } catch (error) {
            setMessage(error.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Merchant name
          <input
            required
            maxLength={120}
            value={name}
            disabled={merchant.role !== 'ADMIN'}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        {merchant.role === 'ADMIN' && (
          <div className="button-row">
            <button className="button primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}
        <p role="status">{message}</p>
      </form>
    </>
  );
}
function Policies({ api, merchant, onSaved }) {
  const [policy, setPolicy] = useState(merchant.policy);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const admin = merchant.role === 'ADMIN';
  return (
    <>
      <div className="settings-section-heading">
        <h2>Policies</h2>
        <p>Control investigation and submission permissions.</p>
      </div>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setMessage('');
          try {
            const updated = await api.updateMerchant(policy);
            onSaved(updated);
            setMessage('Policies updated.');
          } catch (error) {
            setMessage(error.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {[
          [
            'allowInvestigations',
            'Allow investigations',
            'Permit the AI to review evidence when you start an investigation.',
          ],
          [
            'allowSubmissions',
            'Allow submissions',
            'Permit verified evidence to be sent to PayPal after explicit approval.',
          ],
        ].map(([key, title, description]) => (
          <label className="settings-toggle" key={key}>
            <span>
              <strong>{title}</strong>
              <small>{description}</small>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={policy[key]}
              disabled={!admin || busy}
              onChange={(event) =>
                setPolicy({ ...policy, [key]: event.target.checked })
              }
            />
          </label>
        ))}
        <label className="settings-toggle">
          <span>
            <strong>Merchant approval required</strong>
            <small>Every submission requires human approval.</small>
          </span>
          <input type="checkbox" checked disabled />
        </label>
        {admin && (
          <button className="button primary settings-save" disabled={busy}>
            {busy ? 'Saving…' : 'Save policies'}
          </button>
        )}
        <p role="status">{message}</p>
      </form>
    </>
  );
}
function Integrations({ api, admin }) {
  const resource = useRemote(
    async (signal) => {
      const paypal = await api.integrations(signal);
      const [catalog, connections] = await Promise.allSettled([
        api.erpCatalog(signal),
        api.erpConnections(signal),
      ]);
      return {
        paypal: paypal.paypal,
        catalog: catalog.status === 'fulfilled' ? catalog.value.items : [],
        connections:
          connections.status === 'fulfilled' ? connections.value.items : [],
        erpError:
          catalog.status === 'rejected'
            ? catalog.reason.message
            : connections.status === 'rejected'
              ? connections.reason.message
              : null,
      };
    },
    [api],
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const action = async (task) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await task();
      resource.reload();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="settings-section-heading">
        <h2>Integrations</h2>
        <p>PayPal and your connected business systems.</p>
      </div>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <RemoteState resource={resource}>
        {(data) => (
          <>
            <div className="card-heading">
              <h2>PayPal</h2>
              <Badge>{label(data.paypal.connectionStatus)}</Badge>
            </div>
            <dl>
              <div>
                <dt>Dispute read access</dt>
                <dd>{label(data.paypal.disputesReadStatus)}</dd>
              </div>
              <div>
                <dt>Credentials configured</dt>
                <dd>{data.paypal.credentialsConfigured ? 'Yes' : 'No'}</dd>
              </div>
              <div>
                <dt>Webhook configured</dt>
                <dd>{data.paypal.webhookConfigured ? 'Yes' : 'No'}</dd>
              </div>
              <div>
                <dt>Last checked</dt>
                <dd>{date(data.paypal.lastCheckedAt)}</dd>
              </div>
            </dl>
            {admin && (
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => action(() => api.checkPayPal())}
              >
                {busy ? 'Checking…' : 'Check PayPal connection'}
              </button>
            )}
            <h3>Business systems</h3>
            {data.erpError && <p role="alert">{data.erpError}</p>}
            {data.connections.map((connection) => (
              <div className="settings-info-row" key={connection.id}>
                <span>
                  <strong>{connection.provider}</strong>
                  <small>
                    {label(connection.status)} · Last sync{' '}
                    {date(connection.lastSyncAt)}
                  </small>
                  {connection.lastSyncError && (
                    <small>{connection.lastSyncError}</small>
                  )}
                </span>
                {admin && connection.status !== 'disconnected' && (
                  <div className="button-row">
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm('Disconnect this business system?'))
                          action(() => api.disconnectErp(connection.id));
                      }}
                    >
                      Disconnect
                    </button>
                  </div>
                )}
              </div>
            ))}
            <p className="muted">
              Business system credentials and connection verification are not
              available here yet.
            </p>
          </>
        )}
      </RemoteState>
    </>
  );
}
function Billing({ api, admin }) {
  const resource = useRemote(
    async (signal) => {
      const [plans, subscription] = await Promise.all([
        api.plans(signal),
        api.subscription(signal).catch((error) => {
          if (error.status === 404) return null;
          throw error;
        }),
      ]);
      return { plans, subscription };
    },
    [api],
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <>
      <div className="settings-section-heading">
        <h2>Billing</h2>
        <p>Your team subscription.</p>
      </div>
      {error && <p role="alert">{error}</p>}
      <RemoteState resource={resource}>
        {(data) => (
          <>
            <p>
              {data.subscription
                ? `${data.subscription.plan.name} · ${label(data.subscription.status)} · Period ends ${date(data.subscription.currentPeriodEnd)}`
                : 'No active subscription.'}
            </p>
            {data.subscription && (
              <p>Plan changes are not available for an active subscription.</p>
            )}
            <div className="subscription-plan-grid">
              {data.plans.map((plan) => (
                <div className="subscription-plan" key={plan.id}>
                  <strong>{plan.name}</strong>
                  <span className="subscription-plan-price">
                    {new Intl.NumberFormat(undefined, {
                      style: 'currency',
                      currency: plan.currency,
                    }).format(plan.priceCents / 100)}
                    <small>
                      /{plan.interval === 'MONTH' ? 'month' : 'year'}
                    </small>
                  </span>
                  <span className="subscription-plan-description">
                    {plan.maxTransactions ?? 'Unlimited'} transactions ·{' '}
                    {plan.maxDisputes ?? 'Unlimited'} disputes
                  </span>
                  {admin && (
                    <button
                      className="button secondary"
                      disabled={
                        busy || !!data.subscription || plan.interval !== 'MONTH'
                      }
                      onClick={async () => {
                        if (
                          !window.confirm(
                            `Create a subscription to ${plan.name} for this team?`,
                          )
                        )
                          return;
                        setBusy(true);
                        setError('');
                        try {
                          await api.subscribe(plan.id);
                          resource.reload();
                        } catch (failure) {
                          setError(failure.message);
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      {data.subscription?.planId === plan.id
                        ? 'Current plan'
                        : plan.interval !== 'MONTH'
                          ? 'Unavailable'
                          : 'Choose plan'}
                    </button>
                  )}
                </div>
              ))}
            </div>
            {!data.plans.length && <p>No subscription plans are available.</p>}
          </>
        )}
      </RemoteState>
    </>
  );
}
function Account({ auth, user, section }) {
  const [name, setName] = useState(
      user.user_metadata?.display_name || user.user_metadata?.full_name || '',
    ),
    [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState(''),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  return (
    <>
      <div className="settings-section-heading">
        <h2>{section}</h2>
      </div>
      <form
        className="account-settings-form account-information-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setMessage('');
          if (section === 'Security' && password !== confirm) {
            setMessage('Passwords do not match.');
            return;
          }
          setBusy(true);
          try {
            const { error } = await auth.auth.updateUser(
              section === 'Security'
                ? { password }
                : { data: { display_name: name.trim() } },
            );
            if (error) throw error;
            setPassword('');
            setConfirm('');
            setMessage(
              section === 'Security' ? 'Password updated.' : 'Profile updated.',
            );
          } catch (error) {
            setMessage(error.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {section === 'Information' ? (
          <>
            <label>
              Full name
              <input
                value={name}
                required
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
              />
            </label>
            <label>
              Email address
              <input value={user.email || ''} readOnly />
            </label>
          </>
        ) : (
          <>
            <label>
              New password
              <input
                type="password"
                value={password}
                required
                minLength={12}
                autoComplete="new-password"
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <label>
              Confirm password
              <input
                type="password"
                value={confirm}
                required
                minLength={12}
                autoComplete="new-password"
                onChange={(event) => setConfirm(event.target.value)}
              />
            </label>
          </>
        )}
        <div className="button-row">
          <button className="button primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
        <p role="status">{message}</p>
      </form>
    </>
  );
}
export default function LiveSettings({
  api,
  auth,
  user,
  merchant,
  scope,
  onSaved,
  onClose,
}) {
  const dialog = useRef(null);
  const [active, setActive] = useState('Information');
  const refs = useRef([]);
  const sections =
    scope === 'account'
      ? ['Information', 'Security']
      : ['Information', 'Policies', 'Integrations', 'Billing'];
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      className="settings-dialog"
      ref={dialog}
      aria-label={
        scope === 'account' ? 'Account settings' : 'Merchant settings'
      }
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <button
        className="settings-close"
        aria-label="Close settings"
        onClick={onClose}
      >
        <Icon name="X" />
      </button>
      <div className="settings-layout">
        <nav
          className="settings-nav"
          role="tablist"
          aria-label="Settings categories"
          aria-orientation="vertical"
        >
          <div className="settings-scope-heading">
            {scope === 'account' ? 'Account settings' : 'Merchant settings'}
          </div>
          {sections.map((section, index) => (
            <button
              role="tab"
              key={section}
              id={`live-setting-${index}`}
              aria-selected={active === section}
              aria-controls="live-settings-panel"
              tabIndex={active === section ? 0 : -1}
              ref={(node) => {
                refs.current[index] = node;
              }}
              className={`nav-item ${active === section ? 'active' : ''}`}
              onClick={() => setActive(section)}
              onKeyDown={(event) => {
                let next;
                if (event.key === 'ArrowDown')
                  next = (index + 1) % sections.length;
                else if (event.key === 'ArrowUp')
                  next = (index + sections.length - 1) % sections.length;
                else if (event.key === 'Home') next = 0;
                else if (event.key === 'End') next = sections.length - 1;
                else return;
                event.preventDefault();
                setActive(sections[next]);
                refs.current[next]?.focus();
              }}
            >
              <SidebarIcon
                name={section === 'Billing' ? 'transactions' : section}
              />
              {section}
            </button>
          ))}
        </nav>
        <section
          className="card settings-content"
          role="tabpanel"
          id="live-settings-panel"
          aria-labelledby={`live-setting-${sections.indexOf(active)}`}
        >
          <div className="settings-content-inner">
            {scope === 'account' ? (
              <Account key={active} auth={auth} user={user} section={active} />
            ) : active === 'Information' ? (
              <MerchantInformation
                api={api}
                merchant={merchant}
                onSaved={onSaved}
              />
            ) : active === 'Policies' ? (
              <Policies api={api} merchant={merchant} onSaved={onSaved} />
            ) : active === 'Integrations' ? (
              <Integrations api={api} admin={merchant.role === 'ADMIN'} />
            ) : (
              <Billing api={api} admin={merchant.role === 'ADMIN'} />
            )}
          </div>
        </section>
      </div>
    </dialog>
  );
}
