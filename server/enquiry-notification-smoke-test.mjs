import assert from 'node:assert/strict';

// Never connect these checks to the configured application database.
process.env.NODE_ENV = 'development';
process.env.MONGODB_URI = '';
delete process.env.SUPPORT_NOTIFICATION_EMAIL;

const { default: express } = await import('express');
const database = await import('./config/database.js');
const { default: enquiryRoutes } = await import('./routes/enquiryRoutes.js');
const { errorHandler } = await import('./middleware/errorHandler.js');
const { resetRateLimits } = await import('./middleware/rateLimit.js');
const email = await import('./services/emailService.js');
await database.connectDatabase();
assert.equal(database.isUsingMemoryStore(), true);
const store = database.getMemoryStore();

const sent = [];
let failDelivery = false;
email.setNotificationEmailSenderForTests(async (message) => {
  if (failDelivery) throw new Error('provider down');
  sent.push(message);
});

// Default Express settings: X-Forwarded-For is untrusted, as with no TRUST_PROXY configured.
const app = express();
app.use(express.json());
app.use('/api', enquiryRoutes);
app.use(errorHandler);
const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const post = (body, headers = {}) => fetch(`${baseUrl}/api/enquiries`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify(body),
});

const enquiry = (overrides = {}) => ({
  name: 'Ada Lovelace',
  email: 'ada@example.invalid',
  phone: '+2348012345678',
  country: 'Canada',
  level: 'Masters',
  service: 'Admission Support',
  message: 'I would like help with my application.',
  ...overrides,
});

try {
  // Success: saved, response unchanged, one notification with every field and replyTo.
  const ok = await post(enquiry());
  assert.equal(ok.status, 201);
  const body = await ok.json();
  assert.equal(body.success, true);
  assert.equal(body.message, 'Enquiry submitted');
  assert.equal(body.data.enquiry.email, 'ada@example.invalid');
  assert.equal(store.enquiries.length, 1);
  assert.equal(sent.length, 1);
  const message = sent[0];
  assert.equal(message.to, 'support@universeconsultsedu.com');
  assert.equal(message.replyTo, 'ada@example.invalid');
  for (const value of ['Ada Lovelace', 'ada@example.invalid', '+2348012345678', 'Admission Support', 'Canada', 'Masters', 'I would like help with my application.']) {
    assert.ok(message.html.includes(value), `html missing ${value}`);
    assert.ok(message.text.includes(value), `text missing ${value}`);
  }

  // Invalid submissions are rejected, saved nowhere and send nothing.
  assert.equal((await post(enquiry({ email: 'bad' }))).status, 400);
  assert.equal((await post(enquiry({ phone: '' }))).status, 400);
  assert.equal(store.enquiries.length, 1);
  assert.equal(sent.length, 1);

  // HTML is escaped and CR/LF cannot reach the subject or reply-to.
  resetRateLimits();
  const evil = await post(enquiry({
    name: 'Eve\r\nBcc: attacker@example.invalid <script>alert(1)</script>',
    message: '<img src=x onerror=alert(1)>',
    country: '"><b>x</b>',
  }));
  assert.equal(evil.status, 201);
  const escaped = sent[1];
  assert.ok(!/[\r\n]/.test(escaped.subject), 'subject contains a line break');
  assert.ok(!escaped.html.includes('<script>alert(1)</script>'));
  assert.ok(!escaped.html.includes('<img src=x'));
  assert.ok(!escaped.html.includes('<b>x</b>'));
  assert.ok(escaped.html.includes('&lt;script&gt;'));
  const unsafeReply = await post(enquiry({ email: 'a"b@example.invalid' }));
  assert.equal(unsafeReply.status, 201);
  assert.equal(sent[2].replyTo, undefined);

  // Delivery failure: still 201, enquiry kept, error logged without the visitor's details.
  failDelivery = true;
  resetRateLimits();
  const originalError = console.error;
  const logged = [];
  console.error = (...args) => { logged.push(JSON.stringify(args)); };
  const before = store.enquiries.length;
  const resilient = await post(enquiry({ email: 'resilient@example.invalid', message: 'private message body' }));
  console.error = originalError;
  assert.equal(resilient.status, 201);
  assert.equal(store.enquiries.length, before + 1);
  assert.ok(store.enquiries.some((item) => item.email === 'resilient@example.invalid'));
  assert.ok(logged.length > 0);
  assert.ok(!logged.join('').includes('resilient@example.invalid'));
  assert.ok(!logged.join('').includes('private message body'));
  failDelivery = false;

  // Rate limit: the 6th submission from one IP in the window gets 429, and spoofed
  // X-Forwarded-For headers do not provide a fresh bucket.
  resetRateLimits();
  const statuses = [];
  for (let i = 0; i < 6; i += 1) {
    statuses.push((await post(enquiry(), { 'X-Forwarded-For': `203.0.113.${i + 1}` })).status);
  }
  assert.deepEqual(statuses, [201, 201, 201, 201, 201, 429]);
  const limited = await post(enquiry(), { 'X-Forwarded-For': '198.51.100.99' });
  assert.equal(limited.status, 429);
  assert.ok(limited.headers.get('retry-after'));
  const limitedBody = await limited.json();
  assert.equal(limitedBody.success, false);
  assert.match(limitedBody.message, /Too many/);

  console.log('Enquiry notification smoke test passed.');
} finally {
  server.close();
}
