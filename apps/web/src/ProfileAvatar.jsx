import Icon from './Icon';
import React from 'react';

// Lucide User Round. See THIRD_PARTY_NOTICES.md.
export default function ProfileAvatar({ small = false }) {
  return (
    <span
      className={`avatar profile-avatar${small ? ' small' : ''}`}
      aria-hidden="true"
    >
      <Icon name="UserRound" className="profile-person-icon" />
    </span>
  );
}
