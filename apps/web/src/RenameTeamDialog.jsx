import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
export default function RenameTeamDialog({ team, onSave, onClose }) {
  const dialog = useRef(null);
  const [name, setName] = useState(team.displayName);
  const [error, setError] = useState('');
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current.showModal();
    dialog.current.querySelector('input')?.select();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      className="rename-team-dialog"
      ref={dialog}
      aria-labelledby="rename-team-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <button
        className="settings-close"
        aria-label="Close rename team"
        onClick={onClose}
      >
        <Icon name="X" />
      </button>
      <h2 id="rename-team-title">Rename team</h2>
      <form
        className="account-settings-form account-information-form"
        onSubmit={(event) => {
          event.preventDefault();
          try {
            onSave(name.trim());
            onClose();
          } catch (failure) {
            setError(failure.message);
          }
        }}
      >
        <label>
          Team name
          <input
            required
            maxLength={80}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError('');
            }}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <div className="button-row">
          <button className="button primary">Save name</button>
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </dialog>
  );
}
