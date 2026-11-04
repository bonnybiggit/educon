import assert from 'node:assert/strict';

// Memory-only: never connect these checks to a configured database.
process.env.NODE_ENV = 'development';
process.env.MONGODB_URI = '';
process.env.JWT_SECRET = 'PasswordResetSmokeTestJwtSecretValue1234567890';
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
const { resetSecurityCounters } = await import('./services/securityCounterService.js');
const { setLoginSleepForTests } = await import('./services/adminLoginProtection.js');
const { setNotificationEmailSenderForTests } = await import('./services/emailService.js');
const { hashAdminResetCode } = await import('./models/adminPasswordResetModel.js');
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

const post = async (path, body, cookie) => {
  const response = await fetch(`${baseUrl}/api/admin${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });
  return { response, body: await response.json() };
};
const waitFor = async (predicate) => {
  for (let i = 0; i < 100; i += 1) {
    if (predicate()) return;
    await new Promise((resolve) => { setTimeout(resolve, 10); });
  }
  throw new Error('condition not met');
};
const codeFrom = (message) => message.text.match(/code is (\d{6})/)[1];
const clearLimits = () => { resetRateLimits(); resetSecurityCounters(); };
const requestCode = async (email = 'owner@example.invalid') => {
  clearLimits();
  const before = sent.length;
  store.adminPasswordResets.forEach((item) => { item.resendAvailableAt = new Date(0); });
  const result = await post('/forgot-password', { email });
  await waitFor(() => sent.length > before);
  return { result, code: codeFrom(sent.at(-1)) };
};
const NEW_PASSWORD = 'BrandNewPassword456';

try {
  const owner = store.admins[0];
  const ownerId = owner._id.toString();
  const studentsBefore = JSON.stringify(store.students);
  const originalHash = owner.passwordHash;

  // Generic responses: identical for known, unknown, inactive and malformed emails.
  clearLimits();
  const known = await post('/forgot-password', { email: 'owner@example.invalid' });
  await waitFor(() => sent.length === 1);
  const unknown = await post('/forgot-password', { email: 'nobody@example.invalid' });
  const malformed = await post('/forgot-password', { email: 'not-an-email' });
  assert.equal(known.response.status, 202);
  assert.deepEqual(unknown.body, known.body);
  assert.deepEqual(malformed.body, known.body);
  assert.equal(unknown.response.status, 202);
  assert.equal(sent.length, 1, 'email sent for unknown address');

  // Recipient is the stored admin email, never the support inbox; code is stored only as a keyed hash.
  assert.deepEqual(sent[0].to, 'owner@example.invalid');
  assert.notEqual(sent[0].to, process.env.SUPPORT_NOTIFICATION_EMAIL);
  const code = codeFrom(sent[0]);
  assert.match(code, /^\d{6}$/);
  const challenge = store.adminPasswordResets[0];
  assert.ok(!JSON.stringify(challenge).includes(code), 'plaintext code stored');
  assert.equal(challenge.codeHash, hashAdminResetCode(ownerId, code));
  assert.ok(Math.abs(challenge.expiresAt - challenge.createdAt - 600000) < 1000, 'not a 10 minute expiry');

  // 60 second resend cooldown (generic response, no second email).
  const again = await post('/forgot-password', { email: 'owner@example.invalid' });
  assert.equal(again.response.status, 202);
  await new Promise((resolve) => { setTimeout(resolve, 100); });
  assert.equal(sent.length, 1, 'resend cooldown bypassed');

  // Wrong code, weak password, and unknown email all fail generically and leave the account intact.
  clearLimits();
  const wrongCode = await post('/reset-password', { email: 'owner@example.invalid', code: '000000', password: NEW_PASSWORD });
  assert.equal(wrongCode.response.status, 400);
  const unknownConfirm = await post('/reset-password', { email: 'nobody@example.invalid', code, password: NEW_PASSWORD });
  assert.equal(unknownConfirm.response.status, 400);
  assert.equal(unknownConfirm.body.message, wrongCode.body.message);
  assert.equal((await post('/reset-password', { email: 'owner@example.invalid', code, password: 'weak' })).response.status, 400);
  assert.equal(owner.passwordHash, originalHash);

  // Sessions exist before the reset so we can prove they are invalidated.
  clearLimits();
  const loginResponse = await post('/login', { email: 'owner@example.invalid', password: 'OwnerPassword123' });
  assert.equal(loginResponse.response.status, 200);
  const oldCookie = loginResponse.response.headers.get('set-cookie').split(';')[0];
  const meBefore = await fetch(`${baseUrl}/api/admin/me`, { headers: { Cookie: oldCookie } });
  assert.equal(meBefore.status, 200);

  // Success: password changes, _id/role/email preserved, code is single use, old sessions die.
  clearLimits();
  const preservedId = owner._id.toString();
  const success = await post('/reset-password', { email: 'owner@example.invalid', code, password: NEW_PASSWORD });
  assert.equal(success.response.status, 200);
  assert.notEqual(owner.passwordHash, originalHash);
  assert.equal(owner._id.toString(), preservedId);
  assert.equal(owner.email, 'owner@example.invalid');
  assert.equal(owner.role, 'super_admin');
  assert.equal(owner.sessions.length, 0);
  assert.equal(store.adminPasswordResets.length, 0, 'challenge not consumed');
  const meAfter = await fetch(`${baseUrl}/api/admin/me`, { headers: { Cookie: oldCookie } });
  assert.equal(meAfter.status, 401, 'old session survived password reset');
  clearLimits();
  const replay = await post('/reset-password', { email: 'owner@example.invalid', code, password: 'AnotherPassword789' });
  assert.equal(replay.response.status, 400, 'code replay accepted');
  assert.equal((await post('/login', { email: 'owner@example.invalid', password: NEW_PASSWORD })).response.status, 200);
  assert.equal((await post('/login', { email: 'owner@example.invalid', password: 'OwnerPassword123' })).response.status, 401);

  // Expiry.
  const expiring = await requestCode();
  store.adminPasswordResets[0].expiresAt = new Date(Date.now() - 1000);
  clearLimits();
  assert.equal((await post('/reset-password', { email: 'owner@example.invalid', code: expiring.code, password: NEW_PASSWORD })).response.status, 400, 'expired code accepted');
  assert.equal(store.adminPasswordResets.length, 0);

  // Maximum 5 incorrect attempts, then even the right code is dead.
  const limited = await requestCode();
  const wrong = limited.code === '111111' ? '222222' : '111111';
  for (let i = 0; i < 5; i += 1) {
    clearLimits();
    assert.equal((await post('/reset-password', { email: 'owner@example.invalid', code: wrong, password: NEW_PASSWORD })).response.status, 400);
  }
  clearLimits();
  assert.equal((await post('/reset-password', { email: 'owner@example.invalid', code: limited.code, password: NEW_PASSWORD })).response.status, 400, 'code usable after 5 wrong attempts');

  // Rate limits: IP/email request limit and confirm limit (real limiter, not bypassed).
  clearLimits();
  let limitedStatus = 0;
  for (let i = 0; i < 7 && limitedStatus !== 429; i += 1) {
    limitedStatus = (await post('/forgot-password', { email: 'owner@example.invalid' })).response.status;
  }
  assert.equal(limitedStatus, 429, 'recovery request not rate limited');
  clearLimits();
  limitedStatus = 0;
  for (let i = 0; i < 10 && limitedStatus !== 429; i += 1) {
    limitedStatus = (await post('/reset-password', { email: 'owner@example.invalid', code: '123456', password: NEW_PASSWORD })).response.status;
  }
  assert.equal(limitedStatus, 429, 'recovery confirm not rate limited');

  // Account-wide hourly cap holds across fresh IP limiter windows.
  store.adminPasswordResets.length = 0;
  resetSecurityCounters();
  const before = sent.length;
  for (let i = 0; i < 8; i += 1) {
    resetRateLimits();
    store.adminPasswordResets.forEach((item) => { item.resendAvailableAt = new Date(0); });
    await post('/forgot-password', { email: 'owner@example.invalid' });
    await new Promise((resolve) => { setTimeout(resolve, 20); });
  }
  assert.equal(sent.length - before, 5, 'hourly per-account cap not enforced');

  // Delivery failure: still generic response, and the unsendable code is discarded.
  clearLimits();
  store.adminPasswordResets.length = 0;
  failSending = true;
  const failed = await post('/forgot-password', { email: 'owner@example.invalid' });
  assert.equal(failed.response.status, 202);
  await waitFor(() => store.adminPasswordResets.length === 0);
  failSending = false;

  // Regression: a challenge replaced between validation and consumption must survive the stale consume.
  const { createOrReplaceAdminPasswordReset, consumeAdminPasswordReset, findAdminPasswordReset } = await import('./models/adminPasswordResetModel.js');
  store.adminPasswordResets.length = 0;
  const older = await createOrReplaceAdminPasswordReset(ownerId);
  const olderId = older.challenge._id;
  const newer = await createOrReplaceAdminPasswordReset(ownerId);
  assert.notEqual(String(newer.challenge._id), String(olderId));
  assert.equal(await consumeAdminPasswordReset(ownerId, olderId), false, 'stale consume removed a newer challenge');
  assert.equal(await consumeAdminPasswordReset(ownerId), false, 'consume without a challenge id must not delete');
  assert.equal(String((await findAdminPasswordReset(ownerId))._id), String(newer.challenge._id), 'newer challenge was lost');
  clearLimits();
  const useNewer = await post('/reset-password', { email: 'owner@example.invalid', code: newer.code, password: NEW_PASSWORD });
  assert.equal(useNewer.response.status, 200, 'newer challenge unusable after stale consume attempt');
  assert.equal(await consumeAdminPasswordReset(ownerId, newer.challenge._id), false, 'single-use violated');

  // Nothing leaked into logs, and student data is untouched.
  const logs = JSON.stringify(store.activityLogs);
  assert.ok(!logs.includes(code) && !logs.includes(NEW_PASSWORD), 'secret in activity log');
  assert.equal(JSON.stringify(store.students), studentsBefore);

  console.log('Admin password recovery checks passed');
} finally {
  setLoginSleepForTests(null);
  setNotificationEmailSenderForTests(null);
  server.close();
}
