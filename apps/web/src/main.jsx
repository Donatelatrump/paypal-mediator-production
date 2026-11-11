import Icon from './Icon';
import { liveEnabled } from './lib/runtime';
import EvidenceScreen from './EvidenceScreen';
import DisputeWorkspace from './DisputeWorkspace';
import Badge from './Badge';
import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import ProfileAvatar from './ProfileAvatar';
import ProductThumbnail from './ProductThumbnail';
import PurchaseSummary from './PurchaseSummary';
import TransactionFilters from './TransactionFilters';
import Settings from './Settings';
import TeamOptions from './TeamOptions';
import RenameTeamDialog from './RenameTeamDialog';
import Inbox from './Inbox';
import { changeMember } from './lib/team';
import SidebarIcon from './SidebarIcon';
import CreateMerchantDialog from './CreateMerchantDialog';
import {
  transactions as allTransactions,
  evidenceSnapshots,
  notifications,
  merchants,
  account as accountFixture,
  integration as defaultIntegration,
} from './data/fixtures';
import {
  date,
  disputeReference,
  label,
  money,
  transactionName,
  transactionSubtitle,
} from './lib/format';
import './styles.css';
const LiveRoot = lazy(() => import('./LiveRoot'));
const nav = [
  ['overview', 'Overview'],
  ['transactions', 'Transactions'],
  ['disputes', 'Disputes'],
  ['activity', 'Agent Activity'],
];
const Card = ({ children, className = '' }) => (
  <section className={`card ${className}`}>{children}</section>
);
const rootPage = (page) =>
  ['dispute-details', 'dispute-evidence'].includes(page)
    ? 'disputes'
    : ['details', 'evidence'].includes(page)
      ? 'transactions'
      : page;
function loadProfile(scope, fallback) {
  try {
    return {
      ...fallback,
      ...JSON.parse(
        localStorage.getItem(`${scope}:${fallback.id}:profile`) || '{}',
      ),
      id: fallback.id,
    };
  } catch {
    return fallback;
  }
}
function loadMerchants() {
  let created = [];
  try {
    const saved = JSON.parse(
      localStorage.getItem(`account:${accountFixture.id}:created-teams`),
    );
    if (Array.isArray(saved))
      created = saved.filter(
        (item) =>
          item &&
          typeof item.id === 'string' &&
          typeof item.displayName === 'string',
      );
  } catch {
    /* Use fixture memberships. */
  }
  return [
    ...merchants,
    ...created.filter((item) => !merchants.some((team) => team.id === item.id)),
  ].map((item) => loadProfile('merchant', item));
}
function App() {
  const [page, setPage] = useState('overview');
  const [inboxOpen, setInboxOpen] = useState(false);
  const [sidebarClosed, setSidebarClosed] = useState(() => {
    try {
      return (
        localStorage.getItem(`account:${accountFixture.id}:sidebar-closed`) ===
        'true'
      );
    } catch {
      return false;
    }
  });
  const sidebarToggle = useRef(null);
  const topbarRef = useRef(null);
  const [topbarScrolledOut, setTopbarScrolledOut] = useState(false);
  const toggleSidebar = () => {
    const closed = !sidebarClosed;
    setInboxOpen(false);
    setSidebarClosed(closed);
    setSidebarKeyboard(false);
    sidebarEnabled.current = !closed;
    try {
      localStorage.setItem(
        `account:${accountFixture.id}:sidebar-closed`,
        String(closed),
      );
    } catch {
      /* Keep the control usable without storage. */
    }
    sidebarToggle.current?.focus();
  };
  const [selected, setSelected] = useState(allTransactions[0].id);
  const [filter, setFilter] = useState('All transactions');
  const [query, setQuery] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsScope, setSettingsScope] = useState('account');
  const [settingsLaunch, setSettingsLaunch] = useState({
    section: 'Information',
    invite: false,
  });
  const [renamingTeam, setRenamingTeam] = useState(null);
  const [teamStates, setTeamStates] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem(`account:${accountFixture.id}:team-states`) ||
          '{}',
      );
    } catch {
      return {};
    }
  });
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [merchantProfiles, setMerchantProfiles] = useState(loadMerchants);
  const [activeMerchantId, setActiveMerchantId] = useState(() => {
    try {
      const saved = localStorage.getItem(
        `account:${accountFixture.id}:active-merchant`,
      );
      const visible = merchantProfiles.filter((item) => !teamStates[item.id]);
      return visible.some((item) => item.id === saved)
        ? saved
        : visible[0]?.id || merchantProfiles[0].id;
    } catch {
      return merchants[0].id;
    }
  });
  const [expandedTeams, setExpandedTeams] = useState(() =>
    merchantProfiles.map((item) => item.id),
  );
  const arrangementKey = `account:${accountFixture.id}:team-arrangement`;
  const [teamArrangement, setTeamArrangement] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(arrangementKey));
      return {
        order: Array.isArray(saved?.order) ? saved.order : [],
        pinned: Array.isArray(saved?.pinned) ? saved.pinned : [],
      };
    } catch {
      return { order: [], pinned: [] };
    }
  });
  const [arrangementError, setArrangementError] = useState('');
  const orderedTeams = merchantProfiles
    .filter((team) => !teamStates[team.id])
    .sort((a, b) => {
      const pinDifference =
        Number(teamArrangement.pinned.includes(b.id)) -
        Number(teamArrangement.pinned.includes(a.id));
      const rank = (id) => {
        const index = teamArrangement.order.indexOf(id);
        return index < 0
          ? teamArrangement.order.length +
              merchantProfiles.findIndex((item) => item.id === id)
          : index;
      };
      return pinDifference || rank(a.id) - rank(b.id);
    });
  const arrangeTeams = (next) => {
    try {
      localStorage.setItem(arrangementKey, JSON.stringify(next));
      setTeamArrangement(next);
      setArrangementError('');
    } catch {
      setArrangementError('Could not save the team order. Please try again.');
    }
  };
  const moveTeam = (id, direction) => {
    const order = orderedTeams.map((team) => team.id);
    const index = order.indexOf(id),
      target = index + direction;
    if (
      target < 0 ||
      target >= order.length ||
      teamArrangement.pinned.includes(id) !==
        teamArrangement.pinned.includes(order[target])
    )
      return;
    [order[index], order[target]] = [order[target], order[index]];
    arrangeTeams({ ...teamArrangement, order });
  };
  const pinTeam = (id) =>
    arrangeTeams({
      order: orderedTeams.map((team) => team.id),
      pinned: teamArrangement.pinned.includes(id)
        ? teamArrangement.pinned.filter((item) => item !== id)
        : [...teamArrangement.pinned, id],
    });
  const merchant =
    merchantProfiles.find((item) => item.id === activeMerchantId) ||
    merchantProfiles[0];
  const integration = merchant.integration || defaultIntegration;
  const transactions = allTransactions.filter(
    (item) => item.merchantId === activeMerchantId,
  );
  const selectTeam = (id, destination = 'overview') => {
    setActiveMerchantId(id);
    setPage(destination);
    setQuery('');
    setFilter('All transactions');
    setSelected(
      allTransactions.find((item) => item.merchantId === id)?.id ?? null,
    );
    try {
      localStorage.setItem(`account:${accountFixture.id}:active-merchant`, id);
    } catch {
      /* Navigation remains available without storage. */
    }
    window.scrollTo({ top: 0 });
  };
  const [account, setAccount] = useState(() =>
    loadProfile('account', accountFixture),
  );
  const createTeam = (details) => {
    const name = details.displayName;
    if (
      merchantProfiles.some(
        (team) => team.displayName.toLowerCase() === name.toLowerCase(),
      )
    )
      throw new Error('You already have a merchant with this name.');
    const team = {
      ...details,
      id: crypto.randomUUID(),
      displayName: name,
      role: 'ADMIN',
      policy: {
        allowInvestigations: false,
        allowSubmissions: false,
        requireMerchantApproval: true,
      },
    };
    const next = [...merchantProfiles, team];
    // Commit the membership registry last so partially failed writes never expose a team.
    localStorage.setItem(
      `merchant:${team.id}:profile`,
      JSON.stringify(
        Object.fromEntries(
          ['displayName', 'contactName', 'email', 'phone', 'timezone'].map(
            (key) => [key, details[key]],
          ),
        ),
      ),
    );
    localStorage.setItem(
      `merchant:${team.id}:team`,
      JSON.stringify([
        {
          id: account.id,
          name: account.displayName,
          email: account.email,
          role: 'Admin',
          status: 'Active',
        },
      ]),
    );
    localStorage.setItem(
      `account:${account.id}:created-teams`,
      JSON.stringify(
        next.filter(
          (item) => !merchants.some((fixture) => fixture.id === item.id),
        ),
      ),
    );
    setMerchantProfiles(next);
    setExpandedTeams((items) => [...items, team.id]);
    setCreateTeamOpen(false);
    selectTeam(team.id);
  };
  const openSettings = (scope, section = 'Information', invite = false) => {
    setSettingsLaunch({ section, invite });
    setSettingsScope(scope);
    setAccountOpen(false);
    setSettingsOpen(true);
  };
  const membersFor = (id) => {
    const saved = JSON.parse(
      localStorage.getItem(`merchant:${id}:team`) || 'null',
    );
    return (
      saved || [
        {
          id: account.id,
          email: account.email,
          name: account.displayName,
          role: 'Admin',
          status: 'Active',
        },
      ]
    );
  };
  const canManageTeam = (id) => {
    try {
      return membersFor(id).some(
        (member) =>
          member.id === account.id &&
          member.role === 'Admin' &&
          member.status === 'Active',
      );
    } catch {
      return false;
    }
  };
  const renameTeam = (name) => {
    if (!canManageTeam(renamingTeam.id))
      throw new Error('Only admins can rename the team.');
    if (!name) throw new Error('Enter a team name.');
    if (
      merchantProfiles.some(
        (team) =>
          team.id !== renamingTeam.id &&
          team.displayName.toLowerCase() === name.toLowerCase(),
      )
    )
      throw new Error('A team with this name already exists.');
    const key = `merchant:${renamingTeam.id}:profile`;
    const profile = JSON.parse(localStorage.getItem(key) || '{}');
    localStorage.setItem(
      key,
      JSON.stringify({ ...profile, displayName: name }),
    );
    setMerchantProfiles((items) =>
      items.map((team) =>
        team.id === renamingTeam.id ? { ...team, displayName: name } : team,
      ),
    );
  };
  const hideTeam = (status) => {
    if (status === 'archived' && !canManageTeam(merchant.id))
      throw new Error('Only admins can archive the team.');
    const nextStates = { ...teamStates, [merchant.id]: status };
    const nextMembers =
      status === 'left'
        ? changeMember(membersFor(merchant.id), account.id, null)
        : null;
    if (nextMembers)
      localStorage.setItem(
        `merchant:${merchant.id}:team`,
        JSON.stringify(nextMembers),
      );
    localStorage.setItem(
      `account:${account.id}:team-states`,
      JSON.stringify(nextStates),
    );
    setTeamStates(nextStates);
    setSettingsOpen(false);
    const next = orderedTeams.find((team) => team.id !== merchant.id);
    selectTeam(next?.id || merchant.id);
  };
  const restoreTeam = (id) => {
    if (!canManageTeam(id))
      throw new Error('Only admins can restore the team.');
    const next = { ...teamStates };
    delete next[id];
    localStorage.setItem(
      `account:${account.id}:team-states`,
      JSON.stringify(next),
    );
    setTeamStates(next);
  };
  const [accountOpen, setAccountOpen] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  useEffect(() => {
    if (!topbarRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setTopbarScrolledOut(
          !entry.isIntersecting && entry.boundingClientRect.bottom <= 0,
        );
      },
      { threshold: 0 },
    );
    observer.observe(topbarRef.current);
    return () => observer.disconnect();
  }, [signedOut]);
  const [sidebarKeyboard, setSidebarKeyboard] = useState(false);
  const [tableKeyboard, setTableKeyboard] = useState(false);
  const sidebarEnabled = useRef(!sidebarClosed);
  const sidebarRefs = useRef([]);
  const searchRef = useRef(null);
  const profileRef = useRef(null);
  const accountRef = useRef(null);
  const dialogRef = useRef(null);
  const transaction = transactions.find((item) => item.id === selected);
  const go = (destination) => {
    setPage(destination);
    window.scrollTo({ top: 0 });
  };
  const open = (item) => {
    setSelected(item.id);
    go('details');
  };
  const filtered = transactions.filter(
    (item) =>
      (filter === 'All transactions' ||
        item.readiness.status ===
          (filter === 'Incomplete' ? 'INCOMPLETE' : 'NEEDS_REVIEW')) &&
      (!query.trim() || item.paypalCaptureId === query.trim()),
  );
  useEffect(() => {
    if (settingsOpen || createTeamOpen || renamingTeam) setInboxOpen(false);
  }, [settingsOpen, createTeamOpen, renamingTeam]);
  useEffect(() => {
    if (!settingsOpen) return;
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    dialog.showModal();
    dialog.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previous;
      previousFocus?.focus();
    };
  }, [settingsOpen]);
  useEffect(() => {
    const usePointer = (event) => {
      if (event.type === 'pointermove' && !event.movementX && !event.movementY)
        return;
      document.documentElement.dataset.inputMode = 'pointer';
      setSidebarKeyboard(false);
    };
    const useKeyboard = (event) => {
      if (
        ['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(
          event.key,
        )
      )
        document.documentElement.dataset.inputMode = 'keyboard';
    };
    window.addEventListener('keydown', useKeyboard, true);
    window.addEventListener('pointermove', usePointer);
    window.addEventListener('pointerdown', usePointer);
    return () => {
      window.removeEventListener('keydown', useKeyboard, true);
      window.removeEventListener('pointermove', usePointer);
      window.removeEventListener('pointerdown', usePointer);
    };
  }, []);
  useEffect(() => {
    const click = (event) => {
      sidebarEnabled.current = Boolean(
        event.target.closest?.('[data-sidebar-tab], .team-folder'),
      );
      if (!accountRef.current?.contains(event.target)) setAccountOpen(false);
    };
    document.addEventListener('click', click);
    return () => document.removeEventListener('click', click);
  }, []);
  useEffect(() => {
    const keys = (event) => {
      if (
        event.defaultPrevented ||
        signedOut ||
        settingsOpen ||
        createTeamOpen ||
        renamingTeam ||
        inboxOpen
      )
        return;
      const editing = event.target.closest?.(
        'input, textarea, select, [role="combobox"], [contenteditable="true"]',
      );
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setAccountOpen(false);
        sidebarEnabled.current = false;
        if (['evidence', 'dispute-evidence'].includes(page)) {
          const input = document.querySelector(
            'input[aria-label="Search evidence"]',
          );
          input?.focus();
          input?.select();
        } else {
          go('transactions');
          requestAnimationFrame(() => {
            searchRef.current?.focus();
            searchRef.current?.select();
          });
        }
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        if (accountOpen) {
          setAccountOpen(false);
          profileRef.current?.focus();
          return;
        }
        if (editing) {
          event.target.blur();
          return;
        }
        if (page === 'dispute-evidence') {
          go('dispute-details');
          return;
        }
        if (page === 'dispute-details') {
          go('disputes');
          return;
        }
        if (page === 'evidence') {
          go('details');
          return;
        }
        if (page === 'details') {
          go('transactions');
          return;
        }
        if (sidebarClosed) {
          sidebarToggle.current?.focus();
          sidebarEnabled.current = false;
          return;
        }
        sidebarEnabled.current = true;
        setSidebarKeyboard(true);
        setTableKeyboard(false);
        sidebarRefs.current[
          Math.max(
            0,
            nav.findIndex(([id]) => id === rootPage(page)),
          )
        ]?.focus();
        return;
      }
      if (
        editing ||
        accountOpen ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      )
        return;
      if (
        page === 'details' &&
        event.key === 'Enter' &&
        !event.target.closest?.('button, a')
      ) {
        event.preventDefault();
        go('evidence');
        return;
      }
      if (
        page === 'transactions' &&
        ['ArrowLeft', 'ArrowRight'].includes(event.key)
      ) {
        event.preventDefault();
        sidebarEnabled.current = false;
        const filters = ['All transactions', 'Incomplete', 'Needs review'];
        const next =
          (filters.indexOf(filter) +
            (event.key === 'ArrowRight' ? 1 : -1) +
            3) %
          3;
        setFilter(filters[next]);
        document.querySelectorAll('.transaction-filters button')[next]?.focus();
        return;
      }
      if (
        (sidebarEnabled.current || event.target.closest?.('.team-sidebar')) &&
        ['ArrowUp', 'ArrowDown'].includes(event.key)
      ) {
        event.preventDefault();
        setSidebarKeyboard(true);
        sidebarEnabled.current = true;
        const items = [
          ...document.querySelectorAll(
            '.team-sidebar .team-folder, .team-sidebar [data-sidebar-tab]',
          ),
        ].filter((item) => !item.closest('[hidden]'));
        if (!items.length) return;
        const focused = items.indexOf(document.activeElement);
        const index =
          focused >= 0
            ? focused
            : items.findIndex(
                (item) => item.getAttribute('aria-current') === 'page',
              );
        const next =
          items[
            (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) %
              items.length
          ];
        next.focus();
        if (next.hasAttribute('data-sidebar-tab')) next.click();
        next.scrollIntoView({ block: 'nearest' });
        return;
      }
      if (
        page === 'transactions' &&
        ['ArrowDown', 'ArrowUp'].includes(event.key)
      ) {
        event.preventDefault();
        setTableKeyboard(true);
        const rows = Array.from(
          document.querySelectorAll('.transactions-table tbody tr'),
        );
        const index = rows.indexOf(document.activeElement);
        const next =
          index < 0
            ? event.key === 'ArrowDown'
              ? 0
              : rows.length - 1
            : (index + (event.key === 'ArrowDown' ? 1 : -1) + rows.length) %
              rows.length;
        rows[next]?.focus();
      }
    };
    window.addEventListener('keydown', keys);
    return () => window.removeEventListener('keydown', keys);
  }, [
    page,
    filter,
    signedOut,
    settingsOpen,
    accountOpen,
    activeMerchantId,
    createTeamOpen,
    renamingTeam,
    sidebarClosed,
    inboxOpen,
  ]);
  const crumbs = [
    { name: merchant.displayName, target: 'overview' },
    {
      name: nav.find(([id]) => id === rootPage(page))?.[1],
      target: rootPage(page),
    },
    ...(['details', 'evidence'].includes(page)
      ? [{ name: transaction.paypalCaptureId, target: 'details' }]
      : []),
    ...(['dispute-details', 'dispute-evidence'].includes(page)
      ? [{ name: disputeReference(transaction), target: 'dispute-details' }]
      : []),
    ...(['evidence', 'dispute-evidence'].includes(page)
      ? [{ name: 'Evidence', target: page }]
      : []),
  ];
  function table() {
    return (
      <Card>
        <div
          className={`table-wrap ${tableKeyboard ? 'table-keyboard-mode' : 'table-pointer-mode'}`}
          onPointerMove={(event) => {
            if (event.movementX || event.movementY) setTableKeyboard(false);
          }}
          onPointerDown={() => setTableKeyboard(false)}
          onFocus={(event) => {
            if (event.target.tagName === 'TR') setTableKeyboard(true);
          }}
        >
          <table className="transactions-table">
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
                ].map((name) => (
                  <th key={name}>{name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  tabIndex={0}
                  onClick={() => open(item)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      open(item);
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
                            'Unlinked order'}
                        </strong>
                        <small>
                          {item.order
                            ? `${item.order.items.reduce((total, product) => total + product.quantity, 0)} ${item.order.items.reduce((total, product) => total + product.quantity, 0) === 1 ? 'item' : 'items'}`
                            : 'Items unavailable'}
                        </small>
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
          {!filtered.length && (
            <div className="empty-state">No matching transactions.</div>
          )}
        </div>
      </Card>
    );
  }
  function readiness() {
    return (
      <Card>
        <div className="card-heading">
          <h2>Document coverage</h2>
        </div>
        <div className="readiness-checks">
          {transaction.readiness.checks.map((check) => (
            <div className="settings-info-row" key={check.code}>
              <span>{label(check.code)}</span>
              <Badge>{label(check.status)}</Badge>
            </div>
          ))}
        </div>
        <div className="card-bottom">
          <button className="button primary" onClick={() => go('evidence')}>
            View evidence
          </button>
        </div>
      </Card>
    );
  }
  if (signedOut)
    return (
      <div className="signed-out">
        <Card>
          <h1>You’re signed out.</h1>
          <button
            className="button primary"
            onClick={() => {
              setSignedOut(false);
              go('overview');
            }}
          >
            Return
          </button>
        </Card>
      </div>
    );
  return (
    <div className={`app-shell ${sidebarClosed ? 'sidebar-collapsed' : ''}`}>
      <button
        type="button"
        className={`sidebar-toggle ${sidebarClosed && topbarScrolledOut ? 'is-floating' : ''}`}
        ref={sidebarToggle}
        aria-label={sidebarClosed ? 'Open sidebar' : 'Close sidebar'}
        aria-expanded={!sidebarClosed}
        aria-controls="workspace-sidebar"
        onClick={toggleSidebar}
      >
        <Icon
          name={sidebarClosed ? 'PanelLeftOpen' : 'PanelLeftClose'}
          size={18}
        />
      </button>
      <aside
        id="workspace-sidebar"
        hidden={sidebarClosed}
        className={`sidebar ${sidebarKeyboard ? 'sidebar-keyboard-mode' : ''}`}
        onPointerMove={(event) => {
          if (event.movementX || event.movementY) setSidebarKeyboard(false);
        }}
        onPointerDown={() => setSidebarKeyboard(false)}
      >
        <nav aria-label="Teams" className="team-sidebar">
          {orderedTeams.map((team, teamIndex) => {
            const expanded = expandedTeams.includes(team.id);
            const current = activeMerchantId === team.id;
            const pinned = teamArrangement.pinned.includes(team.id);
            const sameGroup = (index) =>
              orderedTeams[index] &&
              teamArrangement.pinned.includes(orderedTeams[index].id) ===
                pinned;
            return (
              <div className="sidebar-team" key={team.id}>
                <div className="team-heading-row">
                  <button
                    className={`team-folder ${current ? 'current' : ''}`}
                    aria-label={team.displayName}
                    aria-expanded={expanded}
                    aria-controls={`team-nav-${team.id}`}
                    onKeyDown={(event) => {
                      if (['ArrowLeft', 'ArrowRight'].includes(event.key)) {
                        event.preventDefault();
                        event.stopPropagation();
                      }
                      if (event.key === 'ArrowRight')
                        setExpandedTeams((items) => [
                          ...new Set([...items, team.id]),
                        ]);
                      if (event.key === 'ArrowLeft')
                        setExpandedTeams((items) =>
                          items.filter((id) => id !== team.id),
                        );
                    }}
                    onClick={() =>
                      setExpandedTeams((items) =>
                        expanded
                          ? items.filter((id) => id !== team.id)
                          : [...items, team.id],
                      )
                    }
                  >
                    <SidebarIcon name="folder" />
                    <span title={team.displayName}>{team.displayName}</span>
                    <Icon
                      name={expanded ? 'ChevronDown' : 'ChevronRight'}
                      className="team-toggle-chevron"
                    />
                    {pinned && (
                      <Icon
                        name="Pin"
                        className="team-pinned-icon"
                        aria-label="Pinned"
                      />
                    )}
                  </button>
                  <TeamOptions
                    name={team.displayName}
                    pinned={pinned}
                    canMoveUp={Boolean(sameGroup(teamIndex - 1))}
                    canMoveDown={Boolean(sameGroup(teamIndex + 1))}
                    onMove={(direction) => moveTeam(team.id, direction)}
                    onPin={() => pinTeam(team.id)}
                    canManage={canManageTeam(team.id)}
                    onRename={() => setRenamingTeam(team)}
                    onInvite={() => {
                      if (team.id !== activeMerchantId) selectTeam(team.id);
                      openSettings('merchant', 'Teams', true);
                    }}
                    onSettings={() => {
                      if (team.id !== activeMerchantId) selectTeam(team.id);
                      openSettings('merchant');
                    }}
                  />
                </div>
                <div
                  className="team-folder-pages"
                  id={`team-nav-${team.id}`}
                  hidden={!expanded}
                >
                  {nav.map(([id, name], index) => (
                    <button
                      data-sidebar-tab
                      key={id}
                      ref={(element) => {
                        if (current) sidebarRefs.current[index] = element;
                      }}
                      className={`nav-item ${current && rootPage(page) === id ? 'active' : ''}`}
                      aria-current={
                        current && rootPage(page) === id ? 'page' : undefined
                      }
                      onClick={() => selectTeam(team.id, id)}
                    >
                      <SidebarIcon name={id} />
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          <div className="team-heading-row">
            <button
              type="button"
              className="team-folder new-team-option"
              onClick={() => setCreateTeamOpen(true)}
            >
              <Icon name="Plus" className="sidebar-icon" />
              <span>New team</span>
            </button>
          </div>
          {arrangementError && (
            <p className="team-arrangement-error" role="alert">
              {arrangementError}
            </p>
          )}
        </nav>
      </aside>
      <Inbox
        account={account}
        teams={orderedTeams}
        notifications={notifications}
        open={inboxOpen}
        hidden={sidebarClosed}
        onToggle={() => {
          setInboxOpen((value) => !value);
          setAccountOpen(false);
        }}
        onClose={() => setInboxOpen(false)}
        onNavigate={(item) => {
          setExpandedTeams((ids) => [...new Set([...ids, item.merchantId])]);
          selectTeam(item.merchantId, item.page);
          if (item.transactionId) setSelected(item.transactionId);
        }}
      />
      <main>
        <header className="topbar" ref={topbarRef}>
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
                      href={`#${crumb.target}`}
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
            <div className="account-dropdown" ref={accountRef}>
              <button
                className="account-profile"
                ref={profileRef}
                aria-label="Account menu"
                aria-expanded={accountOpen}
                onClick={() => setAccountOpen(!accountOpen)}
              >
                <ProfileAvatar small />
              </button>
              {accountOpen && (
                <div className="account-menu">
                  <button onClick={() => openSettings('account')}>
                    <span aria-hidden="true">
                      <Icon name="Settings" />
                    </span>
                    Account settings
                  </button>
                  <button
                    onClick={() => {
                      setAccountOpen(false);
                      setSignedOut(true);
                    }}
                  >
                    <span aria-hidden="true">
                      <Icon name="LogOut" />
                    </span>
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="workspace">
          {!orderedTeams.length ? (
            <Card>
              <h2>No active teams</h2>
              <p>Create a team to start a new workspace.</p>
              <button
                className="button primary"
                onClick={() => setCreateTeamOpen(true)}
              >
                Create a team
              </button>
              {merchantProfiles
                .filter((team) => teamStates[team.id] === 'archived')
                .map((team) => (
                  <div className="settings-info-row" key={team.id}>
                    <span>{team.displayName}</span>
                    <button
                      className="button secondary"
                      onClick={() => {
                        restoreTeam(team.id);
                        selectTeam(team.id);
                      }}
                    >
                      Restore team
                    </button>
                  </div>
                ))}
            </Card>
          ) : (
            <>
              {page === 'overview' && (
                <>
                  <div className="stats-grid">
                    {[
                      ['Transactions', transactions.length],
                      [
                        'Ready',
                        transactions.filter(
                          (item) => item.readiness.status === 'READY',
                        ).length,
                      ],
                      [
                        'Incomplete',
                        transactions.filter(
                          (item) => item.readiness.status === 'INCOMPLETE',
                        ).length,
                      ],
                      [
                        'Needs review',
                        transactions.filter(
                          (item) => item.readiness.status === 'NEEDS_REVIEW',
                        ).length,
                      ],
                    ].map(([name, value]) => (
                      <Card key={name}>
                        <div className="stat-label">{name}</div>
                        <div className="stat-value">{value}</div>
                      </Card>
                    ))}
                  </div>
                  <div className="two-column">
                    <Card>
                      <div className="card-heading">
                        <h2>Transactions needing attention</h2>
                      </div>
                      {!transactions.length && (
                        <p>No transactions yet for this team.</p>
                      )}
                      {transactions
                        .filter((item) => item.readiness.status !== 'READY')
                        .map((item) => (
                          <button
                            className="settings-purchase"
                            key={item.id}
                            onClick={() => open(item)}
                          >
                            <span>
                              <strong>{transactionName(item)}</strong>
                              <small>{transactionSubtitle(item)}</small>
                            </span>
                            <Badge>{label(item.readiness.status)}</Badge>
                          </button>
                        ))}
                    </Card>
                    <Card>
                      <div className="card-heading">
                        <h2>Merchant</h2>
                      </div>
                      <dl>
                        <div>
                          <dt>Name</dt>
                          <dd>{merchant.displayName}</dd>
                        </div>
                        <div>
                          <dt>Role</dt>
                          <dd>{merchant.role}</dd>
                        </div>
                        <div>
                          <dt>PayPal connection</dt>
                          <dd>{label(integration.connectionStatus)}</dd>
                        </div>
                        <div>
                          <dt>Approval required</dt>
                          <dd>Yes</dd>
                        </div>
                      </dl>
                    </Card>
                  </div>
                </>
              )}
              {page === 'transactions' && (
                <>
                  <div className="filters transaction-toolbar">
                    <TransactionFilters value={filter} onChange={setFilter} />
                    <div
                      className="search-field"
                      onClick={() => searchRef.current?.focus()}
                    >
                      <Icon name="Search" />
                      <input
                        type="text"
                        className="search"
                        ref={searchRef}
                        aria-label="Search by exact capture ID"
                        aria-keyshortcuts="Meta+k Control+k"
                        placeholder="Search capture ID"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                      />
                      <kbd className="search-shortcut">⌘K</kbd>
                    </div>
                  </div>
                  {table()}
                </>
              )}
              {page === 'details' && (
                <div className="two-column detail-grid">
                  <PurchaseSummary order={transaction} />
                  {readiness()}
                </div>
              )}
              {['evidence', 'dispute-evidence'].includes(page) && (
                <EvidenceScreen
                  key={transaction.id}
                  transaction={transaction}
                  snapshots={evidenceSnapshots[transaction.id]}
                />
              )}
              {['disputes', 'dispute-details'].includes(page) &&
                (transactions.length ? (
                  <DisputeWorkspace
                    key={merchant.id}
                    page={page}
                    account={account}
                    transaction={transactions[0]}
                    onCaseOpen={() => {
                      setSelected(transactions[0].id);
                      go('dispute-details');
                    }}
                    onTransaction={() => open(transactions[0])}
                    onEvidence={() => {
                      setSelected(transactions[0].id);
                      go('dispute-evidence');
                    }}
                  />
                ) : (
                  <Card>
                    <h2>No disputes yet</h2>
                    <p>Disputes for {merchant.displayName} will appear here.</p>
                  </Card>
                ))}
              {page === 'activity' &&
                (transactions.length ? (
                  <DisputeWorkspace
                    key={merchant.id}
                    page={page}
                    account={account}
                    transaction={transactions[0]}
                    onCaseOpen={() => {
                      setSelected(transactions[0].id);
                      go('dispute-details');
                    }}
                    onTransaction={() => open(transactions[0])}
                    onEvidence={() => {
                      setSelected(transactions[0].id);
                      go('dispute-evidence');
                    }}
                  />
                ) : (
                  <Card>
                    <h2>No activity yet</h2>
                    <p>
                      Team activity for {merchant.displayName} will appear here.
                    </p>
                  </Card>
                ))}
            </>
          )}{' '}
        </div>
      </main>
      <dialog
        className="settings-dialog"
        ref={dialogRef}
        tabIndex={-1}
        aria-label={
          settingsScope === 'merchant'
            ? 'Merchant settings'
            : 'Account settings'
        }
        onCancel={() => setSettingsOpen(false)}
        onClose={(event) => {
          if (!event.currentTarget.open) setSettingsOpen(false);
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            const rect = event.currentTarget.getBoundingClientRect();
            if (
              event.clientX < rect.left ||
              event.clientX > rect.right ||
              event.clientY < rect.top ||
              event.clientY > rect.bottom
            )
              setSettingsOpen(false);
          }
        }}
      >
        <button
          className="settings-close"
          aria-label="Close settings"
          onClick={() => setSettingsOpen(false)}
        >
          <Icon name="X" />
        </button>
        <Settings
          key={`${settingsScope}:${merchant.id}:${settingsLaunch.section}:${settingsLaunch.invite}`}
          initialSection={settingsLaunch.section}
          inviteInitially={settingsLaunch.invite}
          management={{
            onExpandAll: () =>
              setExpandedTeams(orderedTeams.map((team) => team.id)),
            onCollapseAll: () => setExpandedTeams([]),
            onLeave: () => hideTeam('left'),
            onArchive: () => hideTeam('archived'),
            canManage: canManageTeam(merchant.id),
            archivedTeams: merchantProfiles.filter(
              (team) => teamStates[team.id] === 'archived',
            ),
            onRestore: restoreTeam,
          }}
          merchant={merchant}
          account={account}
          integration={integration}
          scope={settingsScope}
          onProfileSave={(profile) => {
            if (settingsScope === 'merchant')
              setMerchantProfiles((items) =>
                items.map((item) =>
                  item.id === activeMerchantId ? { ...item, ...profile } : item,
                ),
              );
            else setAccount((current) => ({ ...current, ...profile }));
          }}
        />
      </dialog>
      {renamingTeam && (
        <RenameTeamDialog
          team={renamingTeam}
          onSave={renameTeam}
          onClose={() => setRenamingTeam(null)}
        />
      )}
      {createTeamOpen && (
        <CreateMerchantDialog
          account={account}
          onCreate={createTeam}
          onClose={() => setCreateTeamOpen(false)}
        />
      )}
    </div>
  );
}
createRoot(document.getElementById('root')).render(
  liveEnabled ? (
    <Suspense
      fallback={
        <div className="signed-out" role="status">
          Loading workspace…
        </div>
      }
    >
      <LiveRoot />
    </Suspense>
  ) : (
    <App />
  ),
);
