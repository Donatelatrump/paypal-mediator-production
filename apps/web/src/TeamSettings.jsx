import React, { useState } from 'react';
import Badge from './Badge';
import Combobox from './Combobox';
import { changeMember, inviteMember, teamRoles } from './lib/team';

export default function TeamSettings({
  merchant,
  account,
  inviteInitially = false,
}) {
  const key = `merchant:${merchant.id}:team`;
  const [members, setMembers] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      if (Array.isArray(saved) && saved.length) return saved;
    } catch {
      /* Start with the merchant administrator. */
    }
    return [
      {
        id: account.id,
        name: account.displayName,
        email: account.email,
        role: 'Admin',
        status: 'Active',
      },
    ];
  });
  const [inviting, setInviting] = useState(inviteInitially);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Member');
  const [editing, setEditing] = useState(null);
  const [nextRole, setNextRole] = useState('Member');
  const [removing, setRemoving] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const current = members.find((member) => member.id === account.id);
  const canManage = current?.status === 'Active' && current.role === 'Admin';
  const commit = (build, success) => {
    setError('');
    if (!canManage) {
      setError('Only admins can manage the team.');
      return false;
    }
    try {
      const next = build();
      localStorage.setItem(key, JSON.stringify(next));
      setMembers(next);
      setMessage(success);
      return true;
    } catch (failure) {
      setError(
        failure.message || 'Could not save your changes. Please try again.',
      );
      return false;
    }
  };
  return (
    <>
      <div className="settings-section-heading">
        <h2>Teams</h2>
        <p>
          Give people access to {merchant.displayName}. Each person signs in
          with their own account.
        </p>
      </div>
      <div className="team-toolbar">
        <span>
          {members.filter((member) => member.status === 'Active').length} active
          · {members.filter((member) => member.status === 'Pending').length}{' '}
          pending
        </span>
        {canManage && (
          <button
            className="button primary"
            onClick={() => {
              setInviting(true);
              setError('');
              setMessage('');
            }}
          >
            Invite member
          </button>
        )}
      </div>
      {inviting && (
        <form
          className="account-settings-form account-information-form settings-action-panel"
          onSubmit={(event) => {
            event.preventDefault();
            if (
              commit(
                () => inviteMember(members, email, role),
                `Invitation sent to ${email.trim().toLowerCase()}.`,
              )
            ) {
              setInviting(false);
              setEmail('');
              setRole('Member');
            }
          }}
        >
          <h3>Invite a team member</h3>
          <label>
            Email address
            <input
              autoFocus
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="off"
            />
          </label>
          <div className="team-role-field">
            <span>Role</span>
            <Combobox
              label="Invitation role"
              value={role}
              onChange={setRole}
              options={teamRoles}
            />
          </div>
          <div className="button-row">
            <button className="button primary">Send invitation</button>
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                setInviting(false);
                setError('');
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      <div className="team-members">
        {members.map((member) => {
          const self = member.id === account.id;
          const name = self ? account.displayName : member.name;
          const address = self ? account.email : member.email;
          return (
            <div className="team-member" key={member.id}>
              <div className="team-member-identity">
                <strong>
                  {name || address}
                  {self ? ' (you)' : ''}
                </strong>
                {name && <small>{address}</small>}
              </div>
              <div className="team-member-access">
                <Badge>{member.role}</Badge>
                <Badge>{member.status}</Badge>
              </div>
              {canManage && !self && (
                <div className="team-member-actions">
                  <button
                    className="text-button"
                    onClick={() => {
                      setEditing(member.id);
                      setNextRole(member.role);
                      setError('');
                    }}
                  >
                    Edit role
                  </button>
                  {member.status === 'Pending' && (
                    <button
                      className="text-button"
                      onClick={() =>
                        commit(
                          () =>
                            members.map((item) =>
                              item.id === member.id
                                ? {
                                    ...item,
                                    invitedAt: new Date().toISOString(),
                                  }
                                : item,
                            ),
                          `Invitation resent to ${address}.`,
                        )
                      }
                    >
                      Resend
                    </button>
                  )}
                  <button
                    className="text-button"
                    onClick={() => {
                      setRemoving(member);
                      setError('');
                    }}
                  >
                    {member.status === 'Pending' ? 'Revoke' : 'Remove'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {editing && (
        <form
          className="settings-action-panel account-settings-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (
              commit(
                () => changeMember(members, editing, nextRole),
                'Team role updated.',
              )
            )
              setEditing(null);
          }}
        >
          <h3>Edit role</h3>
          <p>{members.find((member) => member.id === editing)?.email}</p>
          <Combobox
            label="Member role"
            value={nextRole}
            onChange={setNextRole}
            options={teamRoles}
          />
          <div className="button-row">
            <button className="button primary">Save role</button>
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                setEditing(null);
                setError('');
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {removing && (
        <div className="settings-action-panel">
          <h3>
            {removing.status === 'Pending'
              ? 'Revoke invitation?'
              : 'Remove team member?'}
          </h3>
          <p>{removing.email} will no longer have access to this merchant.</p>
          <div className="button-row">
            <button
              className="button primary"
              onClick={() => {
                if (
                  commit(
                    () => changeMember(members, removing.id, null),
                    removing.status === 'Pending'
                      ? 'Invitation revoked.'
                      : 'Team member removed.',
                  )
                )
                  setRemoving(null);
              }}
            >
              Confirm {removing.status === 'Pending' ? 'revoke' : 'remove'}
            </button>
            <button
              className="button secondary"
              onClick={() => {
                setRemoving(null);
                setError('');
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <div className="team-role-guide">
        <h3>Roles and permissions</h3>
        <p>
          <strong>Admin</strong> — Manage merchant settings, team access, and
          disputes.
        </p>
        <p>
          <strong>Member</strong> — Work on disputes and manage evidence.
        </p>
        <p>
          <strong>Viewer</strong> — View merchant activity, disputes, and
          evidence.
        </p>
      </div>
      {error && <p role="alert">{error}</p>}
      <p role="status">{message}</p>
    </>
  );
}
