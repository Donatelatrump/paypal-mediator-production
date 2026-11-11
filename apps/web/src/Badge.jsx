import React from 'react';

const tones = {
  done: 'success',
  'needs attention': 'warning',
  completed: 'success',
  ready: 'success',
  present: 'success',
  valid: 'success',
  connected: 'success',
  available: 'success',
  yes: 'success',
  incomplete: 'warning',
  missing: 'warning',
  'needs review': 'warning',
  'not checked': 'warning',
  conflict: 'danger',
  invalid: 'danger',
  'invalid credentials': 'danger',
  denied: 'danger',
  current: 'info',
  historical: 'neutral',
  no: 'neutral',
  'not configured': 'neutral',
  unavailable: 'neutral',
};
export default function Badge({ children }) {
  const tone = tones[String(children).trim().toLowerCase()] || 'neutral';
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
