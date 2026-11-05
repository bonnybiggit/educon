import assert from 'node:assert/strict';

// Memory-only: never connect these checks to a configured database.
process.env.NODE_ENV = 'development';
process.env.MONGODB_URI = '';
process.env.JWT_SECRET = 'AdminRecoverySmokeTestJwtSecretValue1234567890';
process.env.ADMIN_BOOTSTRAP_EMAIL = 'stored@example.invalid';
process.env.ADMIN_BOOTSTRAP_PASSWORD = 'OwnerPassword123';
process.env.ADMIN_BOOTSTRAP_NAME = 'Smoke Owner';

const { default: express } = await import('express');
const database = await import('./config/database.js');
const { bootstrapAdminFromEnv } = await import('./services/adminBootstrapService.js');
const { default: adminRoutes } = await import('./routes/adminRoutes.js');
const { errorHandler } = await import('./middleware/errorHandler.js');
const { resetRateLimits } = await import('./middleware/rateLimit.js');
const { resetSecurityCounters } = await import('./services/securityCounterService.js');
const { setLoginSleepForTests } = await import('./services/adminLoginProtection.js');
const { setNotificationEmailSenderForTests } = await import('./services/emailService.js');
const { listAdminsForRecovery, recoverAdminAccount } = await import('./services/adminRecoveryService.js');
await database.connectDatabase();
assert.equal(database.isUsingMemoryStore(), true);
await bootstrapAdminFromEnv();
const store = database.getMemoryStore();
setLoginSleepForTests(async () => {});
setNotificationEmailSenderForTests(async () => { throw new Error('simulated delivery failure'); });

const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);
app.use(errorHandler);
const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const post = async (path, body) => {
  resetRateLimits(); resetSecurityCounters();
  const response = await fetch(`${baseUrl}/api/admin${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  return { response, body: await response.json() };
};

try {
  const owner = store.admins[0];
  const original = { ...owner };
  const ownerId = owner._id.toString();
  const NEW_PASSWORD = 'RecoveredPassword456';

  // Listing is read-only and masked.
  const listed = await listAdminsForRecovery();
  assert.equal(listed.length, 1);
  assert.equal(listed[0].email, 'st***@example.invalid');
  assert.ok(!JSON.stringify(listed).includes('stored@example.invalid'));

  // Login with the wrong stored identity and wrong password is a generic 401, never a 500.
  assert.equal((await post('/login', { email: 'adminn@example.invalid', password: NEW_PASSWORD })).response.status, 401);
  assert.equal((await post('/login', { email: 'stored@example.invalid', password: 'WrongPassword123' })).response.status, 401);

  // Delivery failure: forgot-password stays generic (202), for unknown and existing accounts alike.
  const unknown = await post('/forgot-password', { email: 'adminn@example.invalid' });
  const existing = await post('/forgot-password', { email: 'stored@example.invalid' });
  assert.equal(existing.response.status, 202);
  assert.deepEqual(existing.body, unknown.body);

  // An internal failure on the existing-account path is logged but still generic (no 500 oracle).
  const savedResets = store.adminPasswordResets;
  store.adminPasswordResets = null;
  const internal = await post('/forgot-password', { email: 'stored@example.invalid' });
  store.adminPasswordResets = savedResets;
  assert.equal(internal.response.status, 202, 'internal failure leaked as an error response');
  assert.deepEqual(internal.body, unknown.body);

  // Rejections leave the account untouched.
  await assert.rejects(recoverAdminAccount({ currentEmail: 'nobody@example.invalid', newPassword: NEW_PASSWORD }));
  await assert.rejects(recoverAdminAccount({ currentEmail: 'stored@example.invalid', newPassword: 'weak' }));
  assert.equal(owner.passwordHash, original.passwordHash);
  assert.equal(owner.email, 'stored@example.invalid');

  // Duplicate email is refused.
  store.admins.push({ ...original, _id: new (await import('mongodb')).ObjectId(), email: 'other@example.invalid', sessions: [] });
  await assert.rejects(recoverAdminAccount({ currentEmail: 'stored@example.invalid', newEmail: 'other@example.invalid', newPassword: NEW_PASSWORD }), /already used/);
  store.admins.pop();
  assert.equal(owner.email, 'stored@example.invalid');

  // Existing session before recovery.
  const before = await post('/login', { email: 'stored@example.invalid', password: 'OwnerPassword123' });
  assert.equal(before.response.status, 200);
  const oldCookie = before.response.headers.get('set-cookie').split(';')[0];
  assert.equal((await fetch(`${baseUrl}/api/admin/me`, { headers: { Cookie: oldCookie } })).status, 200);

  // Successful owner recovery: same account, new email and password, old sessions revoked.
  const result = await recoverAdminAccount({ currentEmail: 'Stored@Example.invalid', newEmail: 'preferred@example.invalid', newPassword: NEW_PASSWORD });
  assert.equal(result.emailChanged, true);
  assert.equal(store.admins.length, 1, 'an account was created or removed');
  assert.equal(owner._id.toString(), ownerId);
  assert.equal(owner.role, original.role);
  assert.equal(owner.name, original.name);
  assert.equal(owner.isBootstrapAdmin, original.isBootstrapAdmin);
  assert.equal(owner.email, 'preferred@example.invalid');
  assert.equal(owner.passwordChangeRequired, false);
  assert.equal((await fetch(`${baseUrl}/api/admin/me`, { headers: { Cookie: oldCookie } })).status, 401, 'old session survived recovery');
  assert.equal((await post('/login', { email: 'preferred@example.invalid', password: NEW_PASSWORD })).response.status, 200);
  assert.equal((await post('/login', { email: 'stored@example.invalid', password: NEW_PASSWORD })).response.status, 401);
  assert.equal((await post('/login', { email: 'preferred@example.invalid', password: 'OwnerPassword123' })).response.status, 401);
  assert.ok(!JSON.stringify(store.activityLogs).includes(NEW_PASSWORD), 'password in activity log');
  assert.ok(store.activityLogs.some((log) => log.action === 'admin_account_recovered_by_owner'));

  console.log('Admin recovery checks passed');
} finally {
  setLoginSleepForTests(null);
  setNotificationEmailSenderForTests(null);
  server.close();
}
