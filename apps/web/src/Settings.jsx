import Badge from './Badge';
import TeamManagement from './TeamManagement';
import TeamSettings from './TeamSettings';
import SidebarIcon from './SidebarIcon';
import React, { useEffect, useRef, useState } from 'react';
import { InformationSettings, SecuritySettings } from './AccountSettings';
import { label, date } from './lib/format';
const categories = {
  account: ['Information', 'Security', 'Notifications'],
  merchant: ['Information', 'Teams', 'Policies', 'Integrations', 'General'],
};
const notificationOptions = [
  [
    'disputes',
    'Dispute updates',
    'New disputes and changes to existing cases.',
  ],
  [
    'deadlines',
    'Deadline reminders',
    'Upcoming response deadlines that need your attention.',
  ],
  [
    'evidence',
    'Evidence updates',
    'Updates when evidence is collected or needs review.',
  ],
];
function readPreferences(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '{}');
    return Object.fromEntries(
      notificationOptions.map(([id]) => [
        id,
        typeof saved?.[id] === 'boolean' ? saved[id] : true,
      ]),
    );
  } catch {
    return { disputes: true, deadlines: true, evidence: true };
  }
}
export default function Settings({
  merchant,
  account,
  integration,
  scope = 'account',
  onProfileSave,
  initialSection = 'Information',
  inviteInitially = false,
  management,
}) {
  const sections = categories[scope];
  const [active, setActive] = useState(initialSection);
  const preferenceKey = `account:${account.id}:notifications`;
  const [preferences, setPreferences] = useState(() =>
    readPreferences(preferenceKey),
  );
  const [notice, setNotice] = useState('');
  useEffect(() => {
    setPreferences(readPreferences(preferenceKey));
    setNotice('');
  }, [preferenceKey]);
  const savePreferences = (event) => {
    event.preventDefault();
    try {
      localStorage.setItem(preferenceKey, JSON.stringify(preferences));
      setNotice('Notification preferences updated.');
    } catch {
      setNotice(
        'Preferences could not be saved. Check your browser storage settings and try again.',
      );
    }
  };
  const refs = useRef([]);
  const navigate = (event, index) => {
    if (event.defaultPrevented) return;
    let next;
    if (event.key === 'ArrowDown') next = (index + 1) % sections.length;
    else if (event.key === 'ArrowUp')
      next = (index + sections.length - 1) % sections.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = sections.length - 1;
    else return;
    event.preventDefault();
    setActive(sections[next]);
    refs.current[next]?.focus();
  };
  return (
    <div className="settings-layout">
      <nav
        className="settings-nav"
        role="tablist"
        aria-label="Settings categories"
        aria-orientation="vertical"
      >
        <div className="settings-scope-heading">
          {scope === 'merchant' ? 'Merchant settings' : 'Account settings'}
        </div>
        {sections.map((section, index) => (
          <button
            type="button"
            role="tab"
            id={`setting-${index}`}
            aria-controls="settings-panel"
            aria-selected={section === active}
            tabIndex={section === active ? 0 : -1}
            key={section}
            ref={(element) => {
              refs.current[index] = element;
            }}
            className={`nav-item ${active === section ? 'active' : ''}`}
            onClick={() => setActive(section)}
            onKeyDown={(event) => navigate(event, index)}
          >
            <SidebarIcon name={section} />
            {section}
          </button>
        ))}
      </nav>
      <section
        className="card settings-content"
        role="tabpanel"
        id="settings-panel"
        tabIndex={0}
        aria-labelledby={`setting-${sections.indexOf(active)}`}
      >
        <div className="settings-content-inner">
          {active === 'Information' && (
            <InformationSettings
              key={`${scope}:${scope === 'merchant' ? merchant.id : account.id}`}
              profile={scope === 'merchant' ? merchant : account}
              scope={scope}
              onSave={onProfileSave}
            />
          )}
          {active === 'Security' && (
            <SecuritySettings key={account.id} account={account} />
          )}
          {active === 'Notifications' && (
            <>
              <div className="settings-section-heading">
                <h2>Notifications</h2>
                <p>Choose the updates you want to receive.</p>
              </div>
              <form onSubmit={savePreferences}>
                {notificationOptions.map(([id, title, description]) => (
                  <label className="settings-toggle" key={id}>
                    <span>
                      <strong>{title}</strong>
                      <small>{description}</small>
                    </span>
                    <input
                      type="checkbox"
                      role="switch"
                      checked={preferences[id]}
                      onChange={(event) => {
                        setPreferences((current) => ({
                          ...current,
                          [id]: event.target.checked,
                        }));
                        setNotice('Unsaved changes');
                      }}
                    />
                  </label>
                ))}
                <button type="submit" className="button primary settings-save">
                  Save preferences
                </button>
                <p role="status" aria-live="polite">
                  {notice}
                </p>
              </form>
            </>
          )}
          {active === 'Teams' && (
            <TeamSettings
              key={merchant.id}
              merchant={merchant}
              account={account}
              inviteInitially={inviteInitially}
            />
          )}
          {active === 'General' && (
            <TeamManagement merchant={merchant} {...management} />
          )}
          {active === 'Policies' && (
            <>
              {[
                ['Investigations allowed', merchant.policy.allowInvestigations],
                ['Submissions allowed', merchant.policy.allowSubmissions],
                [
                  'Merchant approval required',
                  merchant.policy.requireMerchantApproval,
                ],
              ].map(([name, enabled]) => (
                <div className="settings-info-row" key={name}>
                  <strong>{name}</strong>
                  <Badge>{enabled ? 'Yes' : 'No'}</Badge>
                </div>
              ))}
              <p>
                Policy changes require administrator access. Merchant approval
                is mandatory.
              </p>
            </>
          )}
          {active === 'Integrations' && (
            <>
              <div className="card-heading">
                <h2>PayPal</h2>
              </div>
              <dl>
                <div>
                  <dt>Connection</dt>
                  <dd>{label(integration.connectionStatus)}</dd>
                </div>
                <div>
                  <dt>Dispute read access</dt>
                  <dd>{label(integration.disputesReadStatus)}</dd>
                </div>
                <div>
                  <dt>Credentials configured</dt>
                  <dd>{integration.credentialsConfigured ? 'Yes' : 'No'}</dd>
                </div>
                <div>
                  <dt>Webhook configured</dt>
                  <dd>{integration.webhookConfigured ? 'Yes' : 'No'}</dd>
                </div>
                <div>
                  <dt>Last checked</dt>
                  <dd>{date(integration.lastCheckedAt)}</dd>
                </div>
              </dl>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
