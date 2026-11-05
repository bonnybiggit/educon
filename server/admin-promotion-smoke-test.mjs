import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

// Memory-only: never connect these checks to a configured database.
process.env.NODE_ENV = 'development';
process.env.MONGODB_URI = '';
process.env.JWT_SECRET = 'AdminPromotionSmokeTestJwtSecretValue1234567890';

const { ObjectId } = await import('mongodb');
const database = await import('./config/database.js');
const { inspectPromotion, promoteAdminToSuperAdmin } = await import('./services/adminPromotionService.js');
await database.connectDatabase();
assert.equal(database.isUsingMemoryStore(), true);
const store = database.getMemoryStore();

const target = {
  _id: new ObjectId(), name: 'Owner', email: 'target@example.invalid', passwordHash: 'HASH', role: 'admin',
  isActive: true, isBootstrapAdmin: false, passwordChangeRequired: false, createdAt: new Date(), updatedAt: new Date(),
  sessions: [{ jti: 'x', expiresAt: new Date(Date.now() + 1e6), lastSeenAt: new Date() }], sessionVersion: 2, extra: { keep: true },
};
store.admins.push(target);
const original = JSON.parse(JSON.stringify(target));

// Rejections leave the record untouched.
await assert.rejects(promoteAdminToSuperAdmin({ email: 'nobody@example.invalid' }), /No administrator/);
target.isActive = false;
await assert.rejects(promoteAdminToSuperAdmin({ email: 'target@example.invalid' }), /not active/);
target.isActive = true;
const existing = { ...target, _id: new ObjectId(), email: 'boss@example.invalid', role: 'super_admin' };
store.admins.push(existing);
await assert.rejects(promoteAdminToSuperAdmin({ email: 'target@example.invalid' }), /already exist/);
assert.equal(target.role, 'admin');
store.admins.pop();

// Dry-run inspection changes nothing.
await inspectPromotion({ email: 'TARGET@example.invalid' });
assert.equal(target.role, 'admin');

const result = await promoteAdminToSuperAdmin({ email: 'target@example.invalid' });
assert.equal(result.role, 'super_admin');
assert.equal(store.admins.length, 1, 'an account was created');
assert.equal(target._id.toString(), original._id);
assert.equal(target.role, 'super_admin');
assert.equal(target.email, original.email);
assert.equal(target.passwordHash, original.passwordHash);
assert.equal(target.isBootstrapAdmin, false);
assert.deepEqual(target.extra, original.extra);
assert.deepEqual(target.sessions, []);
assert.equal(target.sessionVersion, 3);
const log = store.activityLogs.find((entry) => entry.action === 'admin_promoted_to_super_admin_by_owner');
assert.ok(log, 'audit log missing');
assert.ok(!JSON.stringify(log).includes('HASH'));
await assert.rejects(promoteAdminToSuperAdmin({ email: 'target@example.invalid' }), /already a super admin/);

// The CLI refuses to run without a real MONGODB_URI, even with --apply.
const cli = spawnSync(process.execPath, ['server/scripts/admin-promote.mjs', '--email', 'target@example.invalid', '--apply'], {
  env: { ...process.env, MONGODB_URI: '', NODE_ENV: 'development' }, encoding: 'utf8',
});
assert.notEqual(cli.status, 0);
assert.match(cli.stderr, /refusing to run against the in-memory store/);

console.log('Admin promotion checks passed');
