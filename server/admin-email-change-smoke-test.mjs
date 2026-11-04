import assert from 'node:assert/strict';

// Memory-only: never connect these checks to a configured database.
process.env.NODE_ENV = 'development';
process.env.MONGODB_URI = '';
process.env.JWT_SECRET = 'EmailChangeSmokeTestJwtSecretValue1234567890';
process.env.ADMIN_BOOTSTRAP_EMAIL = 'owner@example.invalid';
process.env.ADMIN_BOOTSTRAP_PASSWORD = 'OwnerPassword123';
process.env.ADMIN_BOOTSTRAP_NAME = 'Smoke Owner';

const { default: express } = await import('express');
const database = await import('./config/database.js');
const { bootstrapAdminFromEnv } = await import('./services/adminBootstrapService.js');
const { default: adminRoutes } = await import('./routes/adminRoutes.js');
const { errorHandler } = await import('./middleware/errorHandler.js');
const { resetRateLimits } = await import('./middleware/rateLimit.js');
const { env } = await import('./config/env.js');
await database.connectDatabase();
assert.equal(database.isUsingMemoryStore(), true);
await bootstrapAdminFromEnv();
const store = database.getMemoryStore();

const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);
app.use(errorHandler);
const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;

const request = (method, path, body, cookie) => fetch(`${baseUrl}/api/admin${path}`, {
  method,
  headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
  body: body ? JSON.stringify(body) : undefined,
});
const login = async (email, password) => {
  const response = await request('POST', '/login', { email, password });
  const setCookie = response.headers.get('set-cookie') || '';
  return { response, cookie: setCookie.split(';')[0] };
};
const snapshot = () => JSON.stringify(store.admins);

try {
  const owner = store.admins[0];
  const ownerId = owner._id.toString();
  const originalHash = owner.passwordHash;
  const originalRole = owner.role;

  const session = (await login('owner@example.invalid', 'OwnerPassword123')).cookie;
  const secondSession = (await login('owner@example.invalid', 'OwnerPassword123')).cookie;
  assert.ok(session && secondSession, 'login did not issue cookies');
  assert.equal((await request('GET', '/me', null, session)).status, 200);

  // A second admin whose email must not be reusable.
  const { default: bcrypt } = await import('bcryptjs');
  const { ObjectId } = await import('mongodb');
  store.admins.push({
    _id: new ObjectId(), name: 'Other', email: 'other@example.invalid', passwordHash: await bcrypt.hash('OtherPassword123', 4),
    role: 'admin', isActive: true, createdAt: new Date(), updatedAt: new Date(),
  });

  // Missing or wrong password: rejected, nothing changes, sessions stay valid.
  let before = snapshot();
  let result = await request('PATCH', '/profile', { name: 'Smoke Owner', email: 'new@example.invalid' }, session);
  assert.equal(result.status, 400);
  result = await request('PATCH', '/profile', { name: 'Smoke Owner', email: 'new@example.invalid', currentPassword: 'WrongPassword123' }, session);
  assert.equal(result.status, 401);
  assert.equal(snapshot(), before, 'account changed after a failed attempt');
  assert.equal((await request('GET', '/me', null, session)).status, 200);

  // Duplicate email and invalid email: rejected, nothing changes.
  result = await request('PATCH', '/profile', { name: 'Smoke Owner', email: 'other@example.invalid', currentPassword: 'OwnerPassword123' }, session);
  assert.equal(result.status, 409);
  result = await request('PATCH', '/profile', { name: 'Smoke Owner', email: 'not-an-email', currentPassword: 'OwnerPassword123' }, session);
  assert.equal(result.status, 400);
  assert.equal(snapshot(), before, 'account changed after a rejected email');
  assert.equal((await request('GET', '/me', null, session)).status, 200);

  // Name-only changes still work without a password and keep sessions.
  result = await request('PATCH', '/profile', { name: 'Renamed Owner', email: 'owner@example.invalid' }, session);
  assert.equal(result.status, 200);
  assert.equal((await request('GET', '/me', null, session)).status, 200);

  // Correct password: email changes, every previous session is revoked.
  const logsBefore = store.activityLogs.length;
  result = await request('PATCH', '/profile', { name: 'Renamed Owner', email: ' New@Example.Invalid ', currentPassword: 'OwnerPassword123' }, session);
  assert.equal(result.status, 200);
  const body = await result.json();
  assert.equal(body.data.admin.email, 'new@example.invalid');
  assert.equal(body.data.reauthenticate, true);
  assert.equal((await request('GET', '/me', null, session)).status, 401);
  assert.equal((await request('GET', '/me', null, secondSession)).status, 401);

  // Account identity and unrelated fields are preserved.
  const after = store.admins.find((admin) => admin._id.toString() === ownerId);
  assert.ok(after, 'admin record lost');
  assert.equal(after.passwordHash, originalHash);
  assert.equal(after.role, originalRole);
  assert.equal(after.isActive, true);
  assert.equal(after.isBootstrapAdmin, true);
  assert.equal(store.admins.length, 2);

  // Old email no longer signs in; new email does, with a working fresh session.
  resetRateLimits();
  assert.equal((await login('owner@example.invalid', 'OwnerPassword123')).response.status, 401);
  const fresh = await login('new@example.invalid', 'OwnerPassword123');
  assert.equal(fresh.response.status, 200);
  assert.equal((await request('GET', '/me', null, fresh.cookie)).status, 200);
  assert.equal((await request('GET', '/me', null, session)).status, 401);

  // Activity log: success recorded, no secrets in any new entry.
  const newLogs = store.activityLogs.slice(0, store.activityLogs.length - logsBefore);
  assert.ok(store.activityLogs.some((log) => log.action === 'admin_email_changed'));
  const serialized = JSON.stringify(store.activityLogs);
  for (const secret of ['OwnerPassword123', 'WrongPassword123', env.jwtSecret, session, fresh.cookie.split('=')[1]]) {
    assert.ok(!serialized.includes(secret), 'activity log leaked a secret');
  }
  assert.ok(newLogs.length > 0);

  console.log('Admin email change checks passed');
} finally {
  server.close();
}
