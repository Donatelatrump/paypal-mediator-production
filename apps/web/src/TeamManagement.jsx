import React, { useState } from 'react';
import Icon from './Icon';
export default function TeamManagement({
  merchant,
  onExpandAll,
  onCollapseAll,
  onLeave,
  onArchive,
  canManage,
  archivedTeams,
  onRestore,
}) {
  const [confirm, setConfirm] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  return (
    <>
      <div className="settings-section-heading">
        <h2>General</h2>
        <p>Sidebar preferences and team access.</p>
      </div>
      <div className="settings-info-row">
        <span>
          <strong>Sidebar teams</strong>
          <small>Expand or collapse all team navigation.</small>
        </span>
        <div className="button-row">
          <button
            className="button secondary"
            onClick={() => {
              onExpandAll();
              setNotice('All teams expanded.');
            }}
          >
            Expand all
          </button>
          <button
            className="button secondary"
            onClick={() => {
              onCollapseAll();
              setNotice('All teams collapsed.');
            }}
          >
            Collapse all
          </button>
        </div>
      </div>
      <div className="settings-info-row">
        <span>
          <strong>Leave team</strong>
          <small>
            Remove your access to {merchant.displayName}. The last active admin
            must assign another admin first.
          </small>
        </span>
        <button
          className="button secondary"
          onClick={() => {
            setConfirm('leave');
            setError('');
          }}
        >
          Leave team
        </button>
      </div>
      {canManage && (
        <div className="settings-info-row">
          <span>
            <strong>Archive team</strong>
            <small>
              Hide this team from the sidebar while keeping its data. You can
              restore it later.
            </small>
          </span>
          <button
            className="button secondary"
            onClick={() => {
              setConfirm('archive');
              setError('');
            }}
          >
            <Icon name="Archive" />
            Archive team
          </button>
        </div>
      )}
      {confirm && (
        <div className="settings-action-panel">
          <h3>
            {confirm === 'leave' ? 'Leave this team?' : 'Archive this team?'}
          </h3>
          <p>
            {confirm === 'leave'
              ? 'You will need another invitation to rejoin.'
              : 'This team will be hidden from your workspace.'}
          </p>
          <div className="button-row">
            <button
              className="button primary"
              onClick={() => {
                try {
                  (confirm === 'leave' ? onLeave : onArchive)();
                } catch (failure) {
                  setError(failure.message);
                }
              }}
            >
              Confirm {confirm}
            </button>
            <button
              className="button secondary"
              onClick={() => {
                setConfirm(null);
                setError('');
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {archivedTeams.length > 0 && (
        <>
          <h3>Archived teams</h3>
          {archivedTeams.map((team) => (
            <div className="settings-info-row" key={team.id}>
              <strong>{team.displayName}</strong>
              <button
                className="button secondary"
                onClick={() => {
                  try {
                    onRestore(team.id);
                    setNotice(`${team.displayName} restored.`);
                  } catch (failure) {
                    setError(failure.message);
                  }
                }}
              >
                Restore
              </button>
            </div>
          ))}
        </>
      )}
      {error && <p role="alert">{error}</p>}
      <p role="status">{notice}</p>
    </>
  );
}
