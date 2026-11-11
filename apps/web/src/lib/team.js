export const teamRoles = ['Admin', 'Member', 'Viewer'];
export function inviteMember(members, email, role) {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized))
    throw new Error('Enter a valid email address.');
  if (!teamRoles.includes(role)) throw new Error('Choose a valid role.');
  if (members.some((member) => member.email.toLowerCase() === normalized))
    throw new Error('This email already has access or a pending invitation.');
  return [
    ...members,
    {
      id: crypto.randomUUID(),
      email: normalized,
      name: '',
      role,
      status: 'Pending',
      invitedAt: new Date().toISOString(),
    },
  ];
}
export function changeMember(members, id, role) {
  if (role !== null && !teamRoles.includes(role))
    throw new Error('Choose a valid role.');
  const member = members.find((item) => item.id === id);
  if (!member) throw new Error('This member could not be found.');
  if (
    member.status === 'Active' &&
    member.role === 'Admin' &&
    role !== 'Admin' &&
    members.filter((item) => item.status === 'Active' && item.role === 'Admin')
      .length <= 1
  )
    throw new Error('Keep at least one active admin on the team.');
  return role === null
    ? members.filter((item) => item.id !== id)
    : members.map((item) => (item.id === id ? { ...item, role } : item));
}
