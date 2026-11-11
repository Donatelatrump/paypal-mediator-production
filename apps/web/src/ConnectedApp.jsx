import React, { useEffect, useRef, useState } from 'react';
import { useRemote } from './lib/useRemote';
import { routeFromLocation, routePath } from './lib/routes';
import { notificationFromActivity } from './lib/live';
import RemoteState from './RemoteState';
import LiveEvidence from './LiveEvidence';
import LiveActivity from './LiveActivity';
import LiveSettings from './LiveSettings';
import { LiveDisputeList, LiveDisputeDetail, Pagination } from './LiveDisputes';
import TransactionFilters from './TransactionFilters';
import PurchaseSummary from './PurchaseSummary';
import ProductThumbnail from './ProductThumbnail';
import SidebarIcon from './SidebarIcon';
import ProfileAvatar from './ProfileAvatar';
import Inbox from './Inbox';
import Icon from './Icon';
import Badge from './Badge';
import {
  date,
  label,
  money,
  transactionName,
  transactionSubtitle,
} from './lib/format';
const navigation = [
  ['overview', 'Overview'],
  ['transactions', 'Transactions'],
  ['disputes', 'Disputes'],
  ['activity', 'Agent Activity'],
];
const rootPage = (route) =>
  route.page === 'dispute-details' || route.disputeId
    ? 'disputes'
    : ['details', 'evidence'].includes(route.page)
      ? 'transactions'
      : route.page;
function LiveTransactions({ api, onOpen }) {
  const [page, setPage] = useState(1),
    [query, setQuery] = useState(''),
    [search, setSearch] = useState(''),
    [filter, setFilter] = useState('All transactions');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);
  const resource = useRemote(
    (signal) =>
      api.transactions(
        { page, pageSize: 20, ...(search ? { paypalCaptureId: search } : {}) },
        signal,
      ),
    [api, page, search],
  );
  return (
    <>
      <div className="filters transaction-toolbar">
        <TransactionFilters value={filter} onChange={setFilter} />
        <div className="search-field">
          <Icon name="Search" />
          <input
            type="search"
            className="search"
            aria-label="Search by exact capture ID"
            placeholder="Search capture ID"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>
      <RemoteState resource={resource}>
        {(data) => {
          const items = data.items.filter(
            (item) =>
              filter === 'All transactions' ||
              item.readiness.status ===
                (filter === 'Incomplete' ? 'INCOMPLETE' : 'NEEDS_REVIEW'),
          );
          return (
            <>
              <section className="card">
                <div className="table-wrap table-pointer-mode">
                  <table
                    className="transactions-table"
                    aria-label="Transactions"
                  >
                    <colgroup>
                      <col className="col-purchase" />
                      <col className="col-date" />
                      <col className="col-amount" />
                      <col className="col-status" />
                      <col className="col-protection" />
                    </colgroup>
                    <thead>
                      <tr>
                        {[
                          'Order',
                          'Payment received',
                          'Amount',
                          'Payment status',
                          'Readiness',
                        ].map((title) => (
                          <th scope="col" key={title}>
                            {title}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr
                          key={item.id}
                          tabIndex={0}
                          onClick={() => onOpen(item.id, item.paypalCaptureId)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              onOpen(item.id, item.paypalCaptureId);
                            } else if (
                              event.key === 'ArrowDown' ||
                              event.key === 'ArrowUp'
                            ) {
                              event.preventDefault();
                              const rows = [
                                ...event.currentTarget.parentElement.children,
                              ];
                              rows[
                                (rows.indexOf(event.currentTarget) +
                                  (event.key === 'ArrowDown' ? 1 : -1) +
                                  rows.length) %
                                  rows.length
                              ]?.focus();
                            }
                          }}
                        >
                          <td>
                            <div className="product">
                              <ProductThumbnail />
                              <div>
                                <strong>
                                  {item.order?.externalId ||
                                    item.merchantOrderReference ||
                                    item.paypalCaptureId}
                                </strong>
                                <small>{transactionSubtitle(item)}</small>
                              </div>
                            </div>
                          </td>
                          <td>{date(item.capturedAt)}</td>
                          <td>{money(item.amount)}</td>
                          <td>
                            <Badge>{label(item.status)}</Badge>
                          </td>
                          <td>
                            <Badge>{label(item.readiness.status)}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!items.length && (
                    <div className="empty-state">
                      {filter === 'All transactions'
                        ? 'No transactions found.'
                        : 'No matching transactions on this page.'}
                    </div>
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
          );
        }}
      </RemoteState>
    </>
  );
}
function TransactionDetail({ api, id, admin, onEvidence, onTitle }) {
  const resource = useRemote(
    (signal) => api.transaction(id, signal),
    [api, id],
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    if (resource.data) onTitle(transactionName(resource.data));
  }, [resource.data?.paypalCaptureId]);
  const refresh = async () => {
    setBusy(true);
    setError('');
    try {
      await api.refreshOrderSources(id);
      resource.reload();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      {error && <p role="alert">{error}</p>}
      <RemoteState resource={resource}>
        {(transaction) => (
          <div className="two-column detail-grid">
            <PurchaseSummary order={transaction} />
            <section className="card">
              <div className="card-heading">
                <h2>Document coverage</h2>
              </div>
              {transaction.readiness.checks.map((check) => (
                <div className="settings-info-row" key={check.code}>
                  <span>{label(check.code)}</span>
                  <Badge>{label(check.status)}</Badge>
                </div>
              ))}
              <div className="card-bottom button-row">
                <button
                  className="button primary"
                  onClick={() => onEvidence(id)}
                >
                  View evidence
                </button>
                {admin && (
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={refresh}
                  >
                    {busy ? 'Refreshing…' : 'Refresh order sources'}
                  </button>
                )}
              </div>
            </section>
          </div>
        )}
      </RemoteState>
    </>
  );
}
function Overview({ api, merchant, onPage }) {
  const resource = useRemote(
    (signal) =>
      Promise.all([
        api.transactions({ pageSize: 1 }, signal),
        api.disputes({ pageSize: 1 }, signal),
        api.integrations(signal),
      ]),
    [api],
  );
  return (
    <RemoteState resource={resource}>
      {([transactions, disputes, integrations]) => (
        <>
          <div className="stats-grid">
            {[
              ['Transactions', transactions.total],
              ['Disputes', disputes.total],
            ].map(([title, value]) => (
              <section className="card" key={title}>
                <div className="stat-label">{title}</div>
                <div className="stat-value">{value}</div>
                <button
                  className="text-button"
                  onClick={() => onPage(title.toLowerCase())}
                >
                  View {title.toLowerCase()}
                  <Icon name="ArrowUpRight" />
                </button>
              </section>
            ))}
          </div>
          <section className="card">
            <div className="card-heading">
              <h2>{merchant.displayName}</h2>
            </div>
            <dl>
              <div>
                <dt>Your role</dt>
                <dd>{label(merchant.role)}</dd>
              </div>
              <div>
                <dt>PayPal connection</dt>
                <dd>{label(integrations.paypal.connectionStatus)}</dd>
              </div>
              <div>
                <dt>Dispute read access</dt>
                <dd>{label(integrations.paypal.disputesReadStatus)}</dd>
              </div>
            </dl>
          </section>
        </>
      )}
    </RemoteState>
  );
}
export default function ConnectedApp({ api, auth, session }) {
  const core = useRemote((signal) => api.merchant(signal), [api]);
  const activity = useRemote(
    (signal) => api.activity({ limit: 30 }, signal),
    [api],
  );
  const [merchantOverride, setMerchantOverride] = useState(null);
  const merchant = merchantOverride || core.data;
  const [route, setRoute] = useState(() => routeFromLocation(window.location)),
    [settings, setSettings] = useState(route.settings || null),
    [inboxOpen, setInboxOpen] = useState(false),
    [accountOpen, setAccountOpen] = useState(false),
    [expanded, setExpanded] = useState(true),
    [error, setError] = useState('');
  const prefKey = `account:${session.user.id}:sidebar-closed`;
  const [sidebarClosed, setSidebarClosed] = useState(() => {
    try {
      return localStorage.getItem(prefKey) === 'true';
    } catch {
      return false;
    }
  });
  const [scrolled, setScrolled] = useState(false),
    [keyboard, setKeyboard] = useState(false);
  const topbar = useRef(null),
    toggle = useRef(null),
    sidebar = useRef(null),
    dropdown = useRef(null);
  const account = {
    id: session.user.id,
    displayName:
      session.user.user_metadata?.display_name ||
      session.user.user_metadata?.full_name ||
      session.user.email,
    email: session.user.email,
  };
  const go = (next) => {
    const destination = typeof next === 'string' ? { page: next } : next;
    const path = routePath(destination);
    if (window.location.pathname !== path)
      window.history.pushState(null, '', path);
    setRoute(destination);
    setInboxOpen(false);
    setAccountOpen(false);
    window.scrollTo({ top: 0 });
  };
  const openSettings = (scope) => {
    setSettings(scope);
    setAccountOpen(false);
    setInboxOpen(false);
  };
  const signOut = async () => {
    try {
      const { error } = await auth.auth.signOut();
      if (error) throw error;
    } catch (failure) {
      setError(failure.message);
    }
  };
  useEffect(() => {
    if (!topbar.current) return;
    const observer = new IntersectionObserver(([entry]) =>
      setScrolled(
        !entry.isIntersecting && entry.boundingClientRect.bottom <= 0,
      ),
    );
    observer.observe(topbar.current);
    return () => observer.disconnect();
  }, [!!merchant]);
  useEffect(() => {
    const timer = setInterval(activity.reload, 30000);
    return () => clearInterval(timer);
  }, [activity.reload]);
  useEffect(() => {
    const pointer = (event) => {
      if (event.type === 'pointermove' && !event.movementX && !event.movementY)
        return;
      document.documentElement.dataset.inputMode = 'pointer';
      setKeyboard(false);
    };
    const click = (event) => {
      if (!dropdown.current?.contains(event.target)) setAccountOpen(false);
    };
    const keys = (event) => {
      if (
        ['Tab', 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(
          event.key,
        )
      )
        document.documentElement.dataset.inputMode = 'keyboard';
      if (event.defaultPrevented || settings) return;
      if (event.key === 'Escape') {
        if (inboxOpen) {
          setInboxOpen(false);
          return;
        }
        if (accountOpen) {
          setAccountOpen(false);
          return;
        }
        if (event.target.closest?.('input, textarea, select')) {
          event.target.blur();
          return;
        }
        if (route.page === 'evidence')
          go(
            route.disputeId
              ? {
                  page: 'dispute-details',
                  id: route.disputeId,
                  title: route.disputeTitle,
                }
              : { page: 'details', id: route.id, title: route.title },
          );
        else if (route.page === 'dispute-details') go('disputes');
        else if (route.page === 'details') go('transactions');
        else if (sidebarClosed) toggle.current?.focus();
        else {
          setKeyboard(true);
          sidebar.current?.querySelector('[aria-current="page"]')?.focus();
        }
        return;
      }
      if (
        inboxOpen ||
        accountOpen ||
        event.altKey ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        !event.target.closest?.('.team-sidebar')
      )
        return;
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        setKeyboard(true);
        const buttons = [
          ...sidebar.current.querySelectorAll(
            '.team-folder, [data-sidebar-tab]',
          ),
        ].filter((button) => !button.closest('[hidden]'));
        const index = buttons.indexOf(document.activeElement);
        const next =
          buttons[
            (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) %
              buttons.length
          ];
        next?.focus();
        if (next?.hasAttribute('data-sidebar-tab')) next.click();
      }
    };
    window.addEventListener('pointermove', pointer);
    window.addEventListener('pointerdown', pointer);
    document.addEventListener('click', click);
    window.addEventListener('keydown', keys);
    return () => {
      window.removeEventListener('pointermove', pointer);
      window.removeEventListener('pointerdown', pointer);
      document.removeEventListener('click', click);
      window.removeEventListener('keydown', keys);
    };
  }, [settings, inboxOpen, accountOpen, route, sidebarClosed]);
  useEffect(() => {
    window.history.replaceState(null, '', routePath(route));
    const restoreRoute = () => {
      const destination = routeFromLocation(window.location);
      setRoute(destination);
      setSettings(destination.settings || null);
      setInboxOpen(false);
      setAccountOpen(false);
    };
    window.addEventListener('popstate', restoreRoute);
    return () => window.removeEventListener('popstate', restoreRoute);
  }, []);
  const navigateActivity = (event) => {
    if (event.transactionId)
      go({
        page: event.resourceType === 'TRANSACTION' ? 'details' : 'evidence',
        id: event.transactionId,
      });
    else if (event.resourceType === 'TRANSACTION' && event.resourceId)
      go({ page: 'details', id: event.resourceId });
    else if (['MERCHANT', 'SUBSCRIPTION'].includes(event.resourceType))
      openSettings('merchant');
    else go('activity');
  };
  if (!merchant)
    return (
      <div className="signed-out">
        <section>
          <RemoteState resource={core}>{() => null}</RemoteState>
          <button className="button secondary" onClick={signOut}>
            Sign out
          </button>
        </section>
      </div>
    );
  const current = rootPage(route),
    admin = merchant.role === 'ADMIN';
  const crumbs = [
    { name: merchant.displayName },
    { name: navigation.find(([id]) => id === current)?.[1], target: current },
  ];
  if (route.page === 'details') crumbs.push({ name: route.title || route.id });
  if (route.page === 'dispute-details')
    crumbs.push({ name: route.title || route.id });
  if (route.page === 'evidence') {
    crumbs.push(
      route.disputeId
        ? {
            name: route.disputeTitle || route.disputeId,
            target: {
              page: 'dispute-details',
              id: route.disputeId,
              title: route.disputeTitle,
            },
          }
        : {
            name: route.title || route.id,
            target: { page: 'details', id: route.id, title: route.title },
          },
    );
    crumbs.push({ name: 'Evidence' });
  }
  return (
    <div className={`app-shell ${sidebarClosed ? 'sidebar-collapsed' : ''}`}>
      <button
        type="button"
        className={`sidebar-toggle ${sidebarClosed && scrolled ? 'is-floating' : ''}`}
        ref={toggle}
        aria-label={sidebarClosed ? 'Open sidebar' : 'Close sidebar'}
        aria-controls="connected-sidebar"
        aria-expanded={!sidebarClosed}
        onClick={() => {
          const closed = !sidebarClosed;
          setSidebarClosed(closed);
          setInboxOpen(false);
          try {
            localStorage.setItem(prefKey, String(closed));
          } catch {
            /* Local preferences are optional. */
          }
        }}
      >
        <Icon
          name={sidebarClosed ? 'PanelLeftOpen' : 'PanelLeftClose'}
          size={18}
        />
      </button>
      <aside
        id="connected-sidebar"
        className={`sidebar ${keyboard ? 'sidebar-keyboard-mode' : ''}`}
        hidden={sidebarClosed}
        ref={sidebar}
      >
        <nav className="team-sidebar" aria-label="Teams">
          <div className="sidebar-team">
            <div className="team-heading-row">
              <button
                type="button"
                className="team-folder current"
                title={merchant.displayName}
                aria-label={merchant.displayName}
                aria-controls="connected-team-pages"
                aria-expanded={expanded}
                onClick={() => setExpanded((value) => !value)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                    event.preventDefault();
                    setExpanded(event.key === 'ArrowRight');
                  }
                }}
              >
                <SidebarIcon name="folder" />
                <span>{merchant.displayName}</span>
                <Icon
                  name={expanded ? 'ChevronDown' : 'ChevronRight'}
                  className="team-toggle-chevron"
                />
              </button>
              <button
                type="button"
                className="team-options-trigger"
                aria-label={`Settings for ${merchant.displayName}`}
                title="Merchant settings"
                onClick={() => openSettings('merchant')}
              >
                <Icon name="MoreHorizontal" />
              </button>
            </div>
            <div
              className="team-folder-pages"
              id="connected-team-pages"
              hidden={!expanded}
            >
              {navigation.map(([id, title]) => (
                <button
                  type="button"
                  key={id}
                  className={`nav-item ${current === id ? 'active' : ''}`}
                  data-sidebar-tab
                  aria-current={current === id ? 'page' : undefined}
                  onClick={() => go(id)}
                >
                  <SidebarIcon name={id} />
                  {title}
                </button>
              ))}
            </div>
          </div>
        </nav>
      </aside>
      <Inbox
        account={account}
        teams={[merchant]}
        notifications={(activity.data?.items || []).map(
          notificationFromActivity,
        )}
        hidden={sidebarClosed}
        open={inboxOpen}
        onToggle={() => setInboxOpen((value) => !value)}
        onClose={() => setInboxOpen(false)}
        onNavigate={(item) => navigateActivity(item.event)}
      />
      <main>
        <header className="topbar" ref={topbar}>
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <ol>
              {crumbs.map((crumb, index) => (
                <li key={index}>
                  {index > 0 && <span className="breadcrumb-separator">/</span>}
                  {index === 0 ? (
                    <span className="breadcrumb-root">{crumb.name}</span>
                  ) : index === crumbs.length - 1 ? (
                    <span className="breadcrumb-current" aria-current="page">
                      {crumb.name}
                    </span>
                  ) : (
                    <a
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        go(crumb.target);
                      }}
                    >
                      {crumb.name}
                    </a>
                  )}
                </li>
              ))}
            </ol>
          </nav>
          <div className="topbar-right">
            <div className="account-dropdown" ref={dropdown}>
              <button
                className="account-profile"
                aria-label="Account menu"
                aria-expanded={accountOpen}
                onClick={() => setAccountOpen((value) => !value)}
              >
                <ProfileAvatar small />
              </button>
              {accountOpen && (
                <div className="account-menu">
                  <button onClick={() => openSettings('account')}>
                    <Icon name="Settings" />
                    Account settings
                  </button>
                  <button onClick={signOut}>
                    <Icon name="LogOut" />
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="workspace">
          {error && <p role="alert">{error}</p>}
          {activity.error && (
            <p className="live-error" role="alert">
              Notifications could not be loaded.{' '}
              <button className="text-button" onClick={activity.reload}>
                Retry
              </button>
            </p>
          )}
          {route.page === 'overview' && (
            <Overview api={api} merchant={merchant} onPage={go} />
          )}
          {route.page === 'transactions' && (
            <LiveTransactions
              api={api}
              onOpen={(id, title) => go({ page: 'details', id, title })}
            />
          )}
          {route.page === 'details' && (
            <TransactionDetail
              key={route.id}
              api={api}
              id={route.id}
              admin={admin}
              onEvidence={(id) =>
                go({ page: 'evidence', id, title: route.title })
              }
              onTitle={(title) => setRoute((value) => ({ ...value, title }))}
            />
          )}
          {route.page === 'evidence' && (
            <LiveEvidence
              key={route.id}
              api={api}
              transactionId={route.id}
              admin={admin}
            />
          )}
          {route.page === 'disputes' && (
            <LiveDisputeList
              api={api}
              onOpen={(id, title) => go({ page: 'dispute-details', id, title })}
            />
          )}
          {route.page === 'dispute-details' && (
            <LiveDisputeDetail
              key={route.id}
              api={api}
              disputeId={route.id}
              merchant={merchant}
              onTitle={(title) => setRoute((value) => ({ ...value, title }))}
              onTransaction={(id) => go({ page: 'details', id })}
              onEvidence={(id) =>
                go({
                  page: 'evidence',
                  id,
                  disputeId: route.id,
                  disputeTitle: route.title,
                })
              }
            />
          )}
          {route.page === 'activity' && (
            <LiveActivity api={api} onNavigate={navigateActivity} />
          )}
        </div>
      </main>
      {settings && (
        <LiveSettings
          key={settings}
          api={api}
          auth={auth}
          user={session.user}
          merchant={merchant}
          scope={settings}
          onSaved={setMerchantOverride}
          onClose={() => {
            setSettings(null);
            if (window.location.pathname === '/settings') go('overview');
          }}
        />
      )}
    </div>
  );
}
