import assert from 'node:assert/strict';

// Memory-only: never connect these checks to a configured database.
process.env.NODE_ENV = 'development';
process.env.MONGODB_URI = '';
process.env.JWT_SECRET = 'SecurityAlertsSmokeTestJwtSecretValue1234567890';
process.env.ADMIN_BOOTSTRAP_EMAIL = 'owner@example.invalid';
process.env.ADMIN_BOOTSTRAP_PASSWORD = 'OwnerPassword123';
process.env.ADMIN_BOOTSTRAP_NAME = 'Smoke Owner';
process.env.SUPPORT_NOTIFICATION_EMAIL = 'support@example.invalid';

const { default: express } = await import('express');
const database = await import('./config/database.js');
const { bootstrapAdminFromEnv } = await import('./services/adminBootstrapService.js');
const { default: adminRoutes } = await import('./routes/adminRoutes.js');
const { errorHandler } = await import('./middleware/errorHandler.js');
const { resetRateLimits } = await import('./middleware/rateLimit.js');
const { resetSecurityCounters, claimCooldown } = await import('./services/securityCounterService.js');
const { setLoginSleepForTests } = await import('./services/adminLoginProtection.js');
const { setNotificationEmailSenderForTests } = await import('./services/emailService.js');
const { sendAdminSecurityAlert, maskEmail, maskIp } = await import('./services/adminSecurityAlertService.js');
const { env } = await import('./config/env.js');
await database.connectDatabase();
assert.equal(database.isUsingMemoryStore(), true);
await bootstrapAdminFromEnv();
const store = database.getMemoryStore();

const sent = [];
let failSending = false;
setNotificationEmailSenderForTests(async (message) => {
  if (failSending) throw new Error('simulated delivery failure');
  sent.push(message);
});
setLoginSleepForTests(async () => {});

const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);
app.use(errorHandler);
const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;

const call = async (method, path, body, cookie) => {
  resetRateLimits();
  const response = await fetch(`${baseUrl}/api/admin${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });
  return { response, body: await response.json() };
};
const settle = () => new Promise((resolve) => { setTimeout(resolve, 150); });
const loginCookie = async (email, password) => {
  const { response } = await call('POST', '/login', { email, password });
  assert.equal(response.status, 200);
  return response.headers.get('set-cookie').split(';')[0];
};
const subjects = () => sent.map((message) => message.subject);

try {
  const owner = store.admins[0];

  // Failed logins: nothing below the threshold, exactly one alert at it, none for the rest of the cooldown.
  assert.ok(env.adminAlertCooldownSeconds >= 3600, 'alert cooldown below one hour');
  for (let i = 0; i < env.adminLoginAlertThreshold - 1; i += 1) {
    await call('POST', '/login', { email: 'owner@example.invalid', password: 'WrongPassword123' });
  }
  await settle();
  assert.equal(sent.length, 0, 'alert sent before threshold');
  for (let i = 0; i < 6; i += 1) {
    await call('POST', '/login', { email: 'owner@example.invalid', password: 'WrongPassword123' });
  }
  await settle();
  assert.equal(sent.length, 1, 'failed-login alert not sent exactly once');
  assert.equal(sent[0].to, 'owner@example.invalid');
  assert.match(sent[0].subject, /failed admin sign-in/);
  assert.equal(owner.isActive, true, 'alerting must never lock the account');

  // Unknown emails never trigger alerts.
  for (let i = 0; i < 8; i += 1) await call('POST', '/login', { email: 'ghost@example.invalid', password: 'WrongPassword123' });
  await settle();
  assert.equal(sent.length, 1);

  // Cooldown is a real claim: the same key cannot be claimed again within the window.
  assert.equal(await claimCooldown('probe-key', 3600_000), true);
  assert.equal(await claimCooldown('probe-key', 3600_000), false);

  // Failing delivery never breaks login.
  resetSecurityCounters();
  failSending = true;
  for (let i = 0; i < 6; i += 1) await call('POST', '/login', { email: 'owner@example.invalid', password: 'WrongPassword123' });
  const cookie = await loginCookie('owner@example.invalid', 'OwnerPassword123');
  assert.ok(cookie);
  assert.equal(await sendAdminSecurityAlert('password_changed', { to: 'owner@example.invalid', accountId: 'x' }), false);
  failSending = false;
  await settle();

  // Password change (current session) -> notification to the account's email.
  resetSecurityCounters(); sent.length = 0;
  const changed = await call('PATCH', '/password', {
    currentPassword: 'OwnerPassword123', newPassword: 'BrandNewPassword456', confirmPassword: 'BrandNewPassword456',
  }, cookie);
  assert.equal(changed.response.status, 200);
  await settle();
  assert.deepEqual(subjects(), ['Security alert: your admin password was changed']);
  assert.equal(sent[0].to, 'owner@example.invalid');

  // Email change -> notifies both the previous and the new address.
  resetSecurityCounters(); sent.length = 0;
  const cookie2 = await loginCookie('owner@example.invalid', 'BrandNewPassword456');
  const emailChange = await call('PATCH', '/profile', {
    name: 'Smoke Owner', email: 'renamed@example.invalid', currentPassword: 'BrandNewPassword456',
  }, cookie2);
  assert.equal(emailChange.response.status, 200);
  await settle();
  assert.equal(sent.length, 2);
  assert.deepEqual(sent.map((message) => message.to).sort(), ['owner@example.invalid', 'renamed@example.invalid']);
  assert.ok(sent.every((message) => message.to !== process.env.SUPPORT_NOTIFICATION_EMAIL));
  assert.ok(sent.every((message) => !message.text.includes('owner@example.invalid') && !message.text.includes('renamed@example.invalid')), 'full email address exposed in alert body');

  // Password reset by a super admin target / recovery also alerts.
  resetSecurityCounters(); sent.length = 0;
  await sendAdminSecurityAlert('password_reset', { to: 'renamed@example.invalid', accountId: owner._id.toString(), name: 'Smoke Owner', ip: '203.0.113.77' });
  assert.deepEqual(subjects(), ['Security alert: your admin password was reset']);
  assert.match(sent[0].text, /203\.0\.113\.x/);
  assert.ok(!sent[0].text.includes('203.0.113.77'), 'full IP exposed');

  // Short per-type cooldown stops duplicate non-login alerts.
  assert.equal(await sendAdminSecurityAlert('password_reset', { to: 'renamed@example.invalid', accountId: owner._id.toString() }), false);

  // No secrets in any alert.
  const everything = JSON.stringify(sent);
  for (const secret of ['OwnerPassword123', 'BrandNewPassword456', 'WrongPassword123', env.jwtSecret]) {
    assert.ok(!everything.includes(secret), 'secret present in alert');
  }
  assert.equal(maskEmail('owner@example.invalid'), 'ow***@example.invalid');
  assert.equal(maskIp('::ffff:198.51.100.9'), '198.51.100.x');

  // Disabled switch sends nothing.
  env.adminSecurityAlertsEnabled = false;
  resetSecurityCounters(); sent.length = 0;
  assert.equal(await sendAdminSecurityAlert('password_changed', { to: 'x@example.invalid', accountId: 'y' }), false);
  assert.equal(sent.length, 0);
  env.adminSecurityAlertsEnabled = true;

  console.log('Admin security alert checks passed');
} finally {
  setLoginSleepForTests(null);
  setNotificationEmailSenderForTests(null);
  server.close();
}
