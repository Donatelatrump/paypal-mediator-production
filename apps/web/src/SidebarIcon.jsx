import React from 'react';
import Icon from './Icon';
const names = {
  General: 'Settings',
  folder: 'Folder',
  overview: 'LayoutDashboard',
  transactions: 'FileText',
  disputes: 'MessageSquareWarning',
  activity: 'Star',
  team: 'Users',
  Teams: 'Users',
  Information: 'UserRound',
  Security: 'ShieldCheck',
  Notifications: 'Bell',
  Policies: 'FileCheck',
  Integrations: 'Plug',
};
export default function SidebarIcon({ name }) {
  return <Icon name={names[name]} className="sidebar-icon" />;
}
