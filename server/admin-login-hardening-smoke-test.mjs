import assert from 'node:assert/strict';

// Memory-only: never connect these checks to a configured database.
process.env.NODE_ENV = 'development';
process.env.MONGODB_URI = '';
process.env.JWT_SECRET = 'LoginHardeningSmokeTestJwtSecretValue1234567890';
process.env.ADMIN_BOOTSTRAP_EMAIL = 'owner@example.invalid';
process.env.ADMIN_BOOTSTRAP_PASSWORD = 'OwnerPassword123';
process.env.ADMIN_BOOTSTRAP_NAME = 'Smoke Owner';

const { default: express } = await import('express');
const database = await import('./config/database.js');
const { bootstrapAdminFromEnv } = await import('./services/adminBootstrapService.js');
const { default: adminRoutes } = await import('./routes/adminRoutes.js');
const { errorHandler } = await import('./middleware/errorHandler.js');
const { resetRateLimits } = await import('./middleware/rateLimit.js');
const { resetSecurityCounters } = await import('./services/securityCounterService.js');
const { computeLoginDelayMs, setLoginSleepForTests, MAX_LOGIN_DELAY_MS } = await import('./services/adminLoginProtection.js');
const { setNotificationEmailSenderForTests } = await import('./services/emailService.js');
await database.connectDatabase();
assert.equal(database.isUsingMemoryStore(), true);
await bootstrapAdminFromEnv();
const store = database.getMemoryStore();

const sent = [];
setNotificationEmailSenderForTests(async (message) => { sent.push(message); });
const delays = [];
setLoginSleepForTests(async (ms) => { delays.push(ms); });

const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);
app.use(errorHandler);
const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;

const login = async (email, password) => {
  const started = performance.now();
  const response = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return { response, body: await response.json(), ms: performance.now() - started };
};
const failureLogs = () => store.activityLogs.filter((log) => log.action === 'admin_login_failure');

try {
  // Delay curve: none for the first two failures, then 1s, 2s, 4s, capped at 5s.
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 20].map(computeLoginDelayMs), [0, 0, 0, 1000, 2000, 4000, 5000, 5000]);
  assert.equal(MAX_LOGIN_DELAY_MS, 5000);

  // Generic, identical errors and comparable cost for unknown vs wrong-password.
  await login('warmup@example.invalid', 'WrongPassword123');
  resetRateLimits(); resetSecurityCounters(); store.activityLogs.length = 0; delays.length = 0;
  const unknown = await login('nobody@example.invalid', 'WrongPassword123');
  const wrong = await login('owner@example.invalid', 'WrongPassword123');
  assert.equal(unknown.response.status, 401);
  assert.equal(wrong.response.status, 401);
  assert.deepEqual(unknown.body, wrong.body, 'responses differ between unknown email and wrong password');
  assert.ok(unknown.ms > 80, `unknown email returned too fast (${unknown.ms}ms): bcrypt was skipped`);
  assert.ok(Math.abs(unknown.ms - wrong.ms) < Math.max(unknown.ms, wrong.ms) * 0.8, 'timing differs noticeably');

  // Inactive account is indistinguishable too.
  const owner = store.admins[0];
  owner.isActive = false;
  const inactive = await login('owner@example.invalid', 'OwnerPassword123');
  owner.isActive = true;
  assert.equal(inactive.response.status, 401);
  assert.deepEqual(inactive.body, wrong.body);

  // Repeated failures: progressive capped delay, throttled logs, unknown emails don't flood or get stored.
  resetRateLimits(); resetSecurityCounters(); store.activityLogs.length = 0; delays.length = 0;
  for (let i = 0; i < 4; i += 1) {
    await login(`probe${i}@example.invalid`, 'WrongPassword123');
  }
  assert.equal(failureLogs().length, 1, 'unknown-email failures flooded the activity log');
  assert.ok(!JSON.stringify(store.activityLogs).includes('probe0@example.invalid'), 'attacker-supplied email stored');
  resetRateLimits(); delays.length = 0;
  for (let i = 0; i < 4; i += 1) await login('owner@example.invalid', 'WrongPassword123');
  assert.ok(delays.length >= 1 && delays.every((ms) => ms <= 5000), 'delay missing or exceeds cap');
  assert.ok(failureLogs().filter((log) => log.adminId).length <= 1, 'known-account failures not throttled');
  assert.ok(!JSON.stringify(store.activityLogs).includes('WrongPassword123'), 'password written to logs');

  // No permanent lockout: after many failures the right password still works once the IP limiter window passes.
  resetRateLimits();
  const ok = await login('owner@example.invalid', 'OwnerPassword123');
  assert.equal(ok.response.status, 200, 'correct password blocked after failed attempts');
  assert.equal(store.admins[0].isActive, true);
  delays.length = 0;
  await login('owner@example.invalid', 'WrongPassword123');
  assert.equal(delays.length, 0, 'counter was not reset by successful login');

  // Input validation.
  assert.equal((await login('owner@example.invalid', 'x'.repeat(2000))).response.status, 400);
  assert.equal((await login('owner@example.invalid', { $ne: '' })).response.status, 400);

  console.log('Admin login hardening checks passed');
} finally {
  setLoginSleepForTests(null);
  setNotificationEmailSenderForTests(null);
  server.close();
}
