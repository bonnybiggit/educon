import assert from 'node:assert/strict';

// Never connect these checks to the configured application database.
process.env.NODE_ENV = 'development';
process.env.MONGODB_URI = '';
delete process.env.SUPPORT_NOTIFICATION_EMAIL;

const { default: express } = await import('express');
const database = await import('./config/database.js');
const { env } = await import('./config/env.js');
const { default: studentRoutes } = await import('./routes/studentRoutes.js');
const { errorHandler } = await import('./middleware/errorHandler.js');
const { resetRateLimits } = await import('./middleware/rateLimit.js');
const email = await import('./services/emailService.js');
const { notifyStudentRegistered } = await import('./services/notificationService.js');
await database.connectDatabase();
assert.equal(database.isUsingMemoryStore(), true);
const store = database.getMemoryStore();

let verificationCode;
const notifications = [];
let failNotifications = false;
email.setVerificationEmailSenderForTests(async ({ code }) => { verificationCode = code; });
email.setPasswordResetEmailSenderForTests(async () => {});
email.setNotificationEmailSenderForTests(async (message) => {
  if (failNotifications) throw new Error('provider down');
  notifications.push(message);
});

const app = express();
app.use(express.json());
app.use('/api', studentRoutes);
app.use(errorHandler);
const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const post = (path, body) => fetch(`${baseUrl}/api${path}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const account = (overrides = {}) => ({
  fullName: 'Ada Lovelace',
  email: 'ada@example.invalid',
  password: 'SuperSecret123',
  mobileNumber: '8012345678',
  countryCode: '234',
  country: 'Nigeria',
  consent: true,
  ...overrides,
});

try {
  assert.equal(env.supportNotificationEmail, 'support@universeconsultsedu.com');

  // Successful registration: stored, verification issued, one notification.
  const ok = await post('/register', account());
  assert.equal(ok.status, 202);
  assert.equal(store.students.length, 1);
  assert.match(verificationCode, /^\d{6}$/);
  assert.equal(notifications.length, 1);
  const message = notifications[0];
  assert.equal(message.to, 'support@universeconsultsedu.com');
  assert.equal(message.subject, 'New Student Registration | Universe Consults');
  assert.match(message.html, /New Student Registration/);
  assert.match(message.html, /Pending Email Verification/);
  assert.match(message.html, /\/admin\/students/);
  for (const value of ['Ada Lovelace', 'ada@example.invalid', 'Nigeria', '8012345678', 'WAT']) {
    assert.ok(message.html.includes(value), `html missing ${value}`);
    assert.ok(message.text.includes(value), `text missing ${value}`);
  }

  // No secrets anywhere in the notification.
  const stored = store.students[0];
  const serialized = JSON.stringify(message);
  for (const secret of ['SuperSecret123', stored.password, verificationCode]) {
    assert.ok(!serialized.includes(secret), 'notification leaked a secret');
  }

  // Repeat/duplicate registration and idempotent re-notification send nothing.
  resetRateLimits();
  assert.equal((await post('/register', account())).status, 202);
  assert.equal(await notifyStudentRegistered(stored), false);
  assert.equal(notifications.length, 1);
  assert.equal(store.students.length, 1);
  assert.equal(store.notificationLog.length, 1);

  // Invalid registrations send nothing.
  assert.equal((await post('/register', account({ email: 'bad', fullName: 'X' }))).status, 400);
  assert.equal((await post('/register', account({ email: 'b@example.invalid', consent: false }))).status, 400);
  assert.equal(notifications.length, 1);

  // Verification failure rolls back and does not notify.
  email.setVerificationEmailSenderForTests(async () => { throw new Error('verification mail down'); });
  const failedVerification = await post('/register', account({ email: 'vfail@example.invalid' }));
  assert.ok(failedVerification.status >= 500);
  assert.equal(notifications.length, 1);
  assert.ok(!store.students.some((student) => student.email === 'vfail@example.invalid'));
  email.setVerificationEmailSenderForTests(async ({ code }) => { verificationCode = code; });

  // HTML injection is escaped.
  resetRateLimits();
  await post('/register', account({
    email: 'xss@example.invalid',
    fullName: '<script>alert(1)</script>',
    country: '"><img src=x onerror=alert(1)>',
  }));
  assert.equal(notifications.length, 2);
  assert.ok(!notifications[1].html.includes('<script>alert(1)</script>'));
  assert.ok(!notifications[1].html.includes('<img src=x'));
  assert.ok(notifications[1].html.includes('&lt;script&gt;'));

  // A failing support mailbox never blocks registration.
  failNotifications = true;
  resetRateLimits();
  const originalError = console.error;
  const logged = [];
  console.error = (...args) => { logged.push(JSON.stringify(args)); };
  const resilient = await post('/register', account({ email: 'resilient@example.invalid' }));
  console.error = originalError;
  assert.equal(resilient.status, 202);
  assert.ok(store.students.some((student) => student.email === 'resilient@example.invalid'));
  assert.ok(logged.length > 0);
  assert.ok(!logged.join('').includes('SuperSecret123'));
  assert.ok(!logged.join('').includes(verificationCode));
  failNotifications = false;

  // Verification still works for the student whose notification failed.
  const verify = await post('/student/verify-email', { email: 'resilient@example.invalid', code: verificationCode });
  assert.ok(verify.status < 300, `verify-email returned ${verify.status}`);

  console.log('Support notification smoke test passed.');
} finally {
  server.close();
}
