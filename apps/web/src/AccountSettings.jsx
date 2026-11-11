import React, { useState } from 'react';
import Badge from './Badge';
import ProfileAvatar from './ProfileAvatar';
import TimeZoneCombobox from './TimeZoneCombobox';

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
export function InformationSettings({
  profile: identity,
  scope = 'account',
  onSave,
}) {
  const isMerchant = scope === 'merchant';
  const key = `${scope}:${identity.id}:profile`;
  const initial = {
    displayName: identity.displayName,
    contactName: '',
    email: identity.email || '',
    phone: identity.phone || '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
  const [saved, setSaved] = useState(() => ({ ...initial, ...read(key, {}) }));
  const [profile, setProfile] = useState(saved);
  const [status, setStatus] = useState('');
  const save = (event) => {
    event.preventDefault();
    const next = Object.fromEntries(
      Object.entries(profile).map(([name, value]) => [name, value.trim()]),
    );
    if (!next.displayName)
      return setStatus(
        isMerchant ? 'Enter a merchant name.' : 'Enter your name.',
      );
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setProfile(next);
      setSaved(next);
      onSave?.(next);
      setStatus(
        isMerchant
          ? 'Merchant information updated.'
          : 'Account information updated.',
      );
    } catch {
      setStatus('Could not save your changes. Please try again.');
    }
  };
  return (
    <>
      <div className="settings-section-heading">
        <h2>Information</h2>
        <p>
          {isMerchant
            ? 'Your business profile and contact details.'
            : 'Your personal profile and contact details.'}
        </p>
      </div>
      <div className="settings-identity">
        <ProfileAvatar />
        <div>
          <strong>{saved.displayName}</strong>
          <small>{isMerchant ? 'Business profile' : 'Personal profile'}</small>
        </div>
      </div>
      <form
        className="account-settings-form account-information-form"
        onSubmit={save}
      >
        {[
          ['displayName', isMerchant ? 'Merchant name' : 'Full name', 'text'],
          ...(isMerchant ? [['contactName', 'Contact name', 'text']] : []),
          ['email', isMerchant ? 'Business email' : 'Email address', 'email'],
          ['phone', isMerchant ? 'Business phone' : 'Phone number', 'tel'],
        ].map(([name, title, type]) => (
          <label key={name}>
            {title}
            <input
              type={type}
              required={['displayName', 'email'].includes(name)}
              autoComplete={
                {
                  displayName: isMerchant ? 'organization' : 'name',
                  contactName: 'name',
                  email: 'email',
                  phone: 'tel',
                }[name]
              }
              value={profile[name]}
              onChange={(event) => {
                setProfile({ ...profile, [name]: event.target.value });
                setStatus('');
              }}
            />
          </label>
        ))}
        <TimeZoneCombobox
          value={profile.timezone}
          onChange={(timezone) => {
            setProfile({ ...profile, timezone });
            setStatus('');
          }}
        />
        <div className="button-row">
          <button className="button primary">Save changes</button>
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              setProfile(saved);
              setStatus('');
            }}
          >
            Cancel
          </button>
        </div>
        <p role="status">{status}</p>
      </form>
    </>
  );
}
export function SecuritySettings({ account }) {
  const key = `account:${account.id}:security`;
  const [security, setSecurity] = useState(() =>
    read(key, { twoFactor: false, passwordChanged: null, otherSessions: true }),
  );
  const [action, setAction] = useState(null);
  const [passwords, setPasswords] = useState({
    current: '',
    next: '',
    confirm: '',
  });
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const open = (value) => {
    setAction(value);
    setError('');
    setStatus('');
    setCode('');
    setPasswords({ current: '', next: '', confirm: '' });
  };
  const update = (patch, message) => {
    try {
      const next = { ...security, ...patch };
      localStorage.setItem(key, JSON.stringify(next));
      setSecurity(next);
      setAction(null);
      setCode('');
      setPasswords({ current: '', next: '', confirm: '' });
      setStatus(message);
      setError('');
    } catch {
      setError('Could not save your changes. Please try again.');
    }
  };
  const changePassword = (event) => {
    event.preventDefault();
    if (passwords.next.length < 12)
      return setError('Use at least 12 characters for your new password.');
    if (passwords.next === passwords.current)
      return setError(
        'Choose a password different from your current password.',
      );
    if (passwords.next !== passwords.confirm)
      return setError('Your new passwords do not match.');
    // Passwords stay in component memory. This demo records the change, never credentials.
    update({ passwordChanged: new Date().toISOString() }, 'Password updated.');
  };
  const verify = (event) => {
    event.preventDefault();
    if (code !== '123456')
      return setError('That code is incorrect. Check your code and try again.');
    update(
      { twoFactor: action === 'enable' },
      action === 'enable'
        ? 'Two-factor authentication enabled.'
        : 'Two-factor authentication disabled.',
    );
  };
  return (
    <>
      <div className="settings-section-heading">
        <h2>Security</h2>
        <p>Manage access and protect your account.</p>
      </div>
      <div className="settings-info-row">
        <span>
          <strong>Password</strong>
          <small>
            {security.passwordChanged
              ? `Last changed ${new Date(security.passwordChanged).toLocaleDateString()}`
              : 'Choose a strong password to keep your account secure.'}
          </small>
        </span>
        <button className="button secondary" onClick={() => open('password')}>
          Change password
        </button>
      </div>
      {action === 'password' && (
        <form
          className="account-settings-form settings-action-panel"
          onSubmit={changePassword}
        >
          <h3>Change password</h3>
          {[
            ['current', 'Current password', 'current-password'],
            ['next', 'New password', 'new-password'],
            ['confirm', 'Confirm new password', 'new-password'],
          ].map(([id, title, autocomplete]) => (
            <label key={id}>
              {title}
              <input
                autoFocus={id === 'current'}
                required
                type="password"
                autoComplete={autocomplete}
                minLength={id === 'current' ? 1 : 12}
                value={passwords[id]}
                onChange={(event) =>
                  setPasswords({ ...passwords, [id]: event.target.value })
                }
              />
            </label>
          ))}
          <small>Use at least 12 characters.</small>
          <div className="button-row">
            <button className="button primary">Update password</button>
            <button
              type="button"
              className="button secondary"
              onClick={() => open(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      <div className="settings-info-row">
        <span>
          <strong>Two-factor authentication</strong>
          <small>Verify your identity with a code when signing in.</small>
        </span>
        <div className="settings-row-actions">
          <Badge>{security.twoFactor ? 'Enabled' : 'Off'}</Badge>
          <button
            className="button secondary"
            onClick={() => open(security.twoFactor ? 'disable' : 'enable')}
          >
            {security.twoFactor ? 'Disable' : 'Set up'}
          </button>
        </div>
      </div>
      {['enable', 'disable'].includes(action) && (
        <form
          className="account-settings-form settings-action-panel"
          onSubmit={verify}
        >
          <h3>
            {action === 'enable'
              ? 'Set up two-factor authentication'
              : 'Disable two-factor authentication'}
          </h3>
          <p>
            {action === 'enable'
              ? 'Enter a verification code to finish setup.'
              : 'Enter a verification code to confirm this change.'}
          </p>
          <label>
            Verification code
            <input
              autoFocus
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </label>
          <div className="button-row">
            <button className="button primary">
              {action === 'enable' ? 'Verify and enable' : 'Confirm disable'}
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={() => open(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      <div className="settings-info-row">
        <span>
          <strong>Active sessions</strong>
          <small>Devices currently signed in to your account.</small>
        </span>
        {security.otherSessions && (
          <button className="button secondary" onClick={() => open('sessions')}>
            Sign out other sessions
          </button>
        )}
      </div>
      <div className="settings-info-row">
        <span>
          <strong>This browser</strong>
          <small>Active now</small>
        </span>
        <Badge>Current session</Badge>
      </div>
      {security.otherSessions && (
        <div className="settings-info-row">
          <span>
            <strong>Safari · iPhone</strong>
            <small>Last active 2 hours ago</small>
          </span>
          <button className="text-button" onClick={() => open('sessions')}>
            Sign out
          </button>
        </div>
      )}
      {action === 'sessions' && (
        <div className="settings-action-panel">
          <h3>Sign out other sessions?</h3>
          <p>
            Other devices will need to sign in again. Your current session will
            stay active.
          </p>
          <div className="button-row">
            <button
              className="button primary"
              onClick={() =>
                update({ otherSessions: false }, 'Other sessions signed out.')
              }
            >
              Confirm sign out
            </button>
            <button className="button secondary" onClick={() => open(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      <p role="status">{status}</p>
    </>
  );
}
