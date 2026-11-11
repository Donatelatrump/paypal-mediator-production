import test from 'node:test';
import assert from 'node:assert/strict';
import { inviteMember, changeMember } from '../src/lib/team.js';
const admin = {
  id: 'owner',
  email: 'owner@example.com',
  role: 'Admin',
  status: 'Active',
};
test('merchant invitations normalize addresses and reject duplicate access', () => {
  const members = inviteMember([admin], ' Person@Example.com ', 'Member');
  assert.equal(members[1].email, 'person@example.com');
  assert.equal(members[1].status, 'Pending');
  assert.throws(
    () => inviteMember(members, 'PERSON@example.com', 'Viewer'),
    /already/,
  );
  assert.throws(
    () => inviteMember(members, 'invalid', 'Viewer'),
    /valid email/,
  );
  assert.equal(
    changeMember(members, members[1].id, 'Viewer')[1].role,
    'Viewer',
  );
  assert.equal(changeMember(members, members[1].id, null).length, 1);
});
test('pending admins cannot replace the last active admin', () => {
  const members = inviteMember([admin], 'new@example.com', 'Admin');
  assert.throws(
    () => changeMember(members, admin.id, 'Member'),
    /active admin/,
  );
  assert.throws(() => changeMember(members, admin.id, null), /active admin/);
  const active = members.map((member) => ({ ...member, status: 'Active' }));
  assert.equal(changeMember(active, admin.id, 'Member')[0].role, 'Member');
});
