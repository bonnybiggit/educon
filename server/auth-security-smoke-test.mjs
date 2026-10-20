import assert from 'node:assert/strict';
import { MongoClient } from 'mongodb';

// Runs in memory mode by default. Set TEST_MONGODB_URI (local only) to also exercise the shared MongoDB limiter store.
const testUri = process.env.TEST_MONGODB_URI || '';
if (testUri && !/^mongodb:\/\/(127\.0\.0\.1|localhost)[:/]/.test(testUri)) {
  throw new Error('Refusing to run: TEST_MONGODB_URI must point to a local MongoDB');
}
const testDbName = `educon_security_test_${Date.now()}`;

process.env.NODE_ENV = 'development';
process.env.MONGODB_URI = testUri;
if (testUri) process.env.MONGODB_DB_NAME = testDbName;
process.env.CORS_ORIGINS = 'https://app.example.test';
process.env.JWT_SECRET = 'security-test-secret';

const { default: express } = await import('express');
const database = await import('./config/database.js');
const { default: studentRoutes } = await import('./routes/studentRoutes.js');
const { default: adminRoutes } = await import('./routes/adminRoutes.js');
const { csrfProtection } = await import('./middleware/csrfProtection.js');
const { resetRateLimits } = await import('./middleware/rateLimit.js');
const { errorHandler } = await import('./middleware/errorHandler.js');

await database.connectDatabase();
assert.equal(database.isUsingMemoryStore(), !testUri);

const app = express();
app.use('/api', csrfProtection);
app.use(express.json());
app.use('/api', studentRoutes);
app.use('/api/admin', adminRoutes);
app.use(errorHandler);
const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;

const post = (path, body, headers = {}) => fetch(`${baseUrl}${path}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify(body),
});
const login = (email, headers) => post('/api/login', { email, password: 'wrong-password' }, headers);

try {
  // CSRF: writes that declare a foreign origin are rejected, before authentication or any handler runs.
  const evil = { Origin: 'https://evil.example.test', Cookie: 'educon_student_session=anything' };
  assert.equal((await fetch(`${baseUrl}/api/student/profile`, { method: 'PATCH', headers: evil })).status, 403);
  assert.equal((await fetch(`${baseUrl}/api/student/profile/submit`, { method: 'POST', headers: evil })).status, 403);
  assert.equal((await post('/api/student/logout', {}, evil)).status, 403);
  assert.equal((await post('/api/login', { email: 'a@b.co', password: 'x' }, evil)).status, 403, 'login CSRF is blocked');
  assert.equal((await post('/api/admin/login', { email: 'a@b.co', password: 'x' }, evil)).status, 403);
  assert.equal((await fetch(`${baseUrl}/api/admin/students/x`, { method: 'PATCH', headers: evil })).status, 403);
  assert.equal((await post('/api/login', {}, { Referer: 'https://evil.example.test/page' })).status, 403, 'foreign Referer');
  assert.equal((await post('/api/login', {}, { 'Sec-Fetch-Site': 'cross-site' })).status, 403, 'cross-site fetch metadata');
  assert.equal((await post('/api/login', {}, { Origin: 'null' })).status, 403, 'opaque origin');

  // CSRF: legitimate callers still reach the handlers (400/401 from validation, not 403 from the origin check).
  assert.equal((await post('/api/login', {}, { Origin: 'https://app.example.test' })).status, 400, 'configured origin');
  assert.equal((await post('/api/login', {}, { Origin: 'http://localhost:5173' })).status, 400, 'local dev origin');
  assert.equal((await post('/api/login', {}, { Origin: baseUrl })).status, 400, 'same-origin deployment');
  assert.equal((await post('/api/login', {})).status, 400, 'non-browser client without Origin');
  assert.equal((await post('/api/login', {}, { 'Sec-Fetch-Site': 'same-origin' })).status, 400);
  assert.equal((await fetch(`${baseUrl}/api/student/me`, { headers: { Origin: 'https://evil.example.test' } })).status, 401, 'reads are not origin-gated');

  // Student login: per-account limit, other accounts unaffected, Retry-After provided.
  resetRateLimits();
  let last;
  for (let i = 0; i < 8; i += 1) {
    last = await login('victim@example.test');
    assert.equal(last.status, 401, `attempt ${i + 1} is processed`);
  }
  last = await login('victim@example.test');
  assert.equal(last.status, 429, 'ninth attempt for one account is blocked');
  assert.ok(Number(last.headers.get('retry-after')) > 0);
  assert.equal((await login('VICTIM@example.test ')).status, 429, 'email normalisation cannot bypass the limit');
  assert.equal((await login('someone-else@example.test')).status, 401, 'other accounts are not locked out');

  // Per-IP ceiling across many accounts (credential stuffing).
  resetRateLimits();
  let blockedAt = 0;
  for (let i = 1; i <= 40 && !blockedAt; i += 1) {
    if ((await login(`stuffing${i}@example.test`)).status === 429) blockedAt = i;
  }
  assert.ok(blockedAt > 8 && blockedAt <= 40, `per-IP limit engaged (at ${blockedAt})`);

  // Registration: per-IP limit.
  resetRateLimits();
  for (let i = 0; i < 10; i += 1) assert.equal((await post('/api/register', {})).status, 400);
  assert.equal((await post('/api/register', {})).status, 429, 'registration is rate limited');

  // Admin login: stricter per-account limit.
  resetRateLimits();
  for (let i = 0; i < 5; i += 1) assert.equal((await post('/api/admin/login', { email: 'admin@example.test', password: 'x' })).status, 401);
  assert.equal((await post('/api/admin/login', { email: 'admin@example.test', password: 'x' })).status, 429, 'admin login is rate limited');

  if (testUri) {
    // The counters live in MongoDB, so a restart or another instance (empty in-process state) is still limited.
    resetRateLimits();
    assert.equal((await post('/api/admin/login', { email: 'admin@example.test', password: 'x' })).status, 429, 'limit is shared via MongoDB');
    const stored = await database.getCollection('rateLimits').countDocuments();
    assert.ok(stored > 0, 'counters are persisted');
    const indexes = await database.getCollection('rateLimits').indexes();
    assert.ok(indexes.some((index) => index.key?.expiresAt === 1 && index.expireAfterSeconds === 0), 'TTL index cleans up old windows');
  }

  console.log(`Auth security checks passed (${testUri ? 'MongoDB shared store' : 'memory store'})`);
} finally {
  await new Promise((resolve) => server.close(resolve));
  if (testUri) {
    const probe = new MongoClient(testUri);
    await probe.connect();
    await probe.db(testDbName).dropDatabase();
    await probe.close();
  }
  await database.closeDatabase();
}
