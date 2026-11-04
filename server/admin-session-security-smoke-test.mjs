import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// Memory-only: never connect these checks to a configured database.
process.env.NODE_ENV = 'development';
process.env.MONGODB_URI = '';
process.env.JWT_SECRET = 'SessionSecuritySmokeTestJwtSecretValue1234567890';
process.env.ADMIN_BOOTSTRAP_EMAIL = 'owner@example.invalid';
process.env.ADMIN_BOOTSTRAP_PASSWORD = 'OwnerPassword123';
process.env.ADMIN_BOOTSTRAP_NAME = 'Smoke Owner';

const { default: express } = await import('express');
const database = await import('./config/database.js');
const { bootstrapAdminFromEnv } = await import('./services/adminBootstrapService.js');
const { default: adminRoutes } = await import('./routes/adminRoutes.js');
const { errorHandler } = await import('./middleware/errorHandler.js');
const { resetRateLimits } = await import('./middleware/rateLimit.js');
const { createAdminToken } = await import('./middleware/adminAuth.js');
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

const request = (method, path, body, cookie, headers = {}) => fetch(`${baseUrl}/api/admin${path}`, {
  method,
  headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers },
  body: body ? JSON.stringify(body) : undefined,
});
const login = async (email = 'owner@example.invalid', password = 'OwnerPassword123') => {
  resetRateLimits();
  const response = await request('POST', '/login', { email, password });
  const setCookie = response.headers.get('set-cookie') || '';
  return { response, setCookie, cookie: setCookie.split(';')[0] };
};
const status = async (cookie, headers) => (await request('GET', '/me', null, cookie, headers)).status;
const b64 = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const forge = (payload, header = { alg: 'HS256', typ: 'JWT' }, secret = env.jwtSecret) => {
  const content = `${b64(header)}.${b64(payload)}`;
  return `${content}.${crypto.createHmac('sha256', secret).update(content).digest('base64url')}`;
};
const cookieFor = (token) => `${env.adminCookieName}=${token}`;
const tokenOf = (cookie) => cookie.split('=')[1];

try {
  const owner = store.admins[0];
  const ownerId = owner._id.toString();
  const originalHash = owner.passwordHash;
  const now = Math.floor(Date.now() / 1000);
  const goodPayload = () => ({
    sub: ownerId, email: owner.email, role: owner.role, type: 'admin', sv: Number(owner.sessionVersion) || 0, iat: now, exp: now + 600,
  });

  // Lifetime and session issuing: 2 hour cookie, tracked session, student lifetime untouched.
  assert.equal(env.adminSessionTtlSeconds, 7200);
  assert.equal(env.adminIdleTimeoutSeconds, 1800);
  assert.equal(env.jwtExpiresInSeconds, 28800, 'student/legacy lifetime must stay unchanged');
  const first = await login();
  assert.equal(first.response.status, 200);
  assert.match(first.setCookie, /Max-Age=7200/);
  const claims = JSON.parse(Buffer.from(tokenOf(first.cookie).split('.')[1], 'base64url').toString());
  assert.ok(claims.jti, 'token has no session id');
  assert.equal(claims.exp - claims.iat, 7200);
  assert.equal(owner.sessions.length, 1);
  assert.ok(!JSON.stringify(owner.sessions).includes(tokenOf(first.cookie)), 'raw token stored');
  assert.equal(await status(first.cookie), 200);

  // Normal logout revokes only the current session.
  const second = await login();
  assert.equal(await status(second.cookie), 200);
  assert.equal((await request('POST', '/logout', null, first.cookie)).status, 200);
  assert.equal(await status(first.cookie), 401, 'logged-out token still works');
  assert.equal(await status(second.cookie), 200, 'logout revoked another session');
  assert.equal(owner.sessions.length, 1);

  // Sign out everywhere: password required; failure changes nothing.
  const third = await login();
  const svBefore = Number(owner.sessionVersion) || 0;
  resetRateLimits();
  assert.equal((await request('POST', '/logout-all', {}, second.cookie)).status, 400);
  let result = await request('POST', '/logout-all', { password: 'WrongPassword123' }, second.cookie);
  assert.equal(result.status, 401);
  assert.equal((await result.json()).code, undefined, 'wrong password must not look like a lost session');
  assert.equal(await status(second.cookie), 200);
  assert.equal(await status(third.cookie), 200);
  assert.equal(Number(owner.sessionVersion) || 0, svBefore);
  result = await request('POST', '/logout-all', { password: 'OwnerPassword123' }, second.cookie);
  assert.equal(result.status, 200);
  assert.equal((await result.json()).data.reauthenticate, true);
  assert.equal(await status(second.cookie), 401);
  assert.equal(await status(third.cookie), 401);
  assert.equal(owner.sessions.length, 0);
  assert.equal(Number(owner.sessionVersion) || 0, svBefore + 1, 'sessionVersion was not bumped');
  assert.equal(owner._id.toString(), ownerId);
  assert.equal(owner.passwordHash, originalHash);

  // Revoked-session responses carry the code the frontend redirects on.
  result = await request('GET', '/me', null, second.cookie);
  assert.equal((await result.json()).code, 'ADMIN_SESSION_INVALID');

  // Login still works after everything was revoked.
  const fresh = await login();
  assert.equal(fresh.response.status, 200);
  assert.equal(await status(fresh.cookie), 200);

  // Inactivity timeout and absolute session expiry (stored state aged, no clock mocking).
  let session = owner.sessions.find((item) => item.jti === JSON.parse(Buffer.from(tokenOf(fresh.cookie).split('.')[1], 'base64url').toString()).jti);
  session.lastSeenAt = new Date(Date.now() - 31 * 60 * 1000);
  assert.equal(await status(fresh.cookie), 401, 'idle session accepted');
  assert.ok(!owner.sessions.includes(session), 'idle session not removed');
  const active = await login();
  session = owner.sessions[owner.sessions.length - 1];
  session.lastSeenAt = new Date(Date.now() - 20 * 60 * 1000);
  assert.equal(await status(active.cookie), 200, 'session within idle window rejected');
  assert.ok(Date.now() - session.lastSeenAt.getTime() < 5000, 'activity was not recorded');
  session.expiresAt = new Date(Date.now() - 1000);
  assert.equal(await status(active.cookie), 401, 'expired session accepted');

  // Strict JWT validation.
  const sessionless = await login();
  assert.equal(await status(sessionless.cookie), 200);
  const bad = {
    'alg none': forge(goodPayload(), { alg: 'none', typ: 'JWT' }),
    'alg HS512': forge(goodPayload(), { alg: 'HS512', typ: 'JWT' }),
    'wrong typ': forge(goodPayload(), { alg: 'HS256', typ: 'X' }),
    'wrong secret': forge(goodPayload(), undefined, 'AnotherSecretValueThatIsLongEnough123456'),
    'unsigned': `${b64({ alg: 'none', typ: 'JWT' })}.${b64(goodPayload())}.`,
    'no exp': forge({ ...goodPayload(), exp: undefined }),
    'no iat': forge({ ...goodPayload(), iat: undefined }),
    'expired': forge({ ...goodPayload(), iat: now - 1200, exp: now - 600 }),
    'future iat': forge({ ...goodPayload(), iat: now + 3600, exp: now + 7200 }),
    'exp before iat': forge({ ...goodPayload(), iat: now, exp: now - 5 }),
    'non-numeric exp': forge({ ...goodPayload(), exp: String(now + 600) }),
    'wrong type claim': forge({ ...goodPayload(), type: 'student' }),
    'bad subject': forge({ ...goodPayload(), sub: 'not-an-object-id' }),
    'oversized session': forge({ ...goodPayload(), jti: 'x', exp: now + 86400 }),
    'malformed': 'abc.def',
  };
  for (const [name, token] of Object.entries(bad)) {
    assert.equal(await status(cookieFor(token)), 401, `${name} token was accepted`);
  }
  const tampered = tokenOf(sessionless.cookie).split('.');
  tampered[1] = b64({ ...JSON.parse(Buffer.from(tampered[1], 'base64url').toString()), role: 'super_admin', exp: now + 9999 });
  assert.equal(await status(cookieFor(tampered.join('.'))), 401, 'tampered payload accepted');

  // Bearer authentication is rejected for admin routes.
  assert.equal(await status('', { Authorization: `Bearer ${tokenOf(sessionless.cookie)}` }), 401, 'Bearer token accepted');

  // Legacy (pre-upgrade, no session id) tokens: accepted only inside the compatibility window.
  const legacyToken = createAdminToken(owner);
  const originalDeadline = env.adminLegacyTokenDeadlineMs;
  env.adminLegacyTokenDeadlineMs = 0;
  assert.equal(await status(cookieFor(legacyToken)), 401, 'legacy token accepted without explicit deadline');
  env.adminLegacyTokenDeadlineMs = Date.now() - 60_000;
  assert.equal(await status(cookieFor(createAdminToken(owner))), 401, 'legacy token issued after deadline accepted');
  env.adminLegacyTokenDeadlineMs = Date.now() + 3_600_000;
  assert.equal(await status(cookieFor(legacyToken)), 200, 'valid legacy token rejected during compatibility');
  env.adminLegacyTokenCompat = false;
  assert.equal(await status(cookieFor(legacyToken)), 401, 'legacy token accepted after compatibility ended');
  env.adminLegacyTokenCompat = true;
  env.adminLegacyTokenDeadlineMs = Date.now() - 1000;
  assert.equal(await status(cookieFor(legacyToken)), 401, 'legacy token accepted after deadline');
  env.adminLegacyTokenDeadlineMs = Date.now() + 3_600_000;
  assert.equal(await status(cookieFor(legacyToken)), 200);

  // Password change: bad attempt keeps sessions; success signs out everything including the caller.
  const keeper = await login();
  const other = await login();
  resetRateLimits();
  const strong = { newPassword: 'BrandNewPassword456', confirmPassword: 'BrandNewPassword456' };
  assert.equal((await request('PATCH', '/password', { currentPassword: 'WrongPassword123', ...strong }, keeper.cookie)).status, 401);
  assert.equal(await status(keeper.cookie), 200);
  assert.equal(await status(other.cookie), 200);
  result = await request('PATCH', '/password', { currentPassword: 'OwnerPassword123', ...strong }, keeper.cookie);
  assert.equal(result.status, 200);
  assert.equal((await result.json()).data.reauthenticate, true);
  assert.equal(await status(keeper.cookie), 401, 'current session survived password change');
  assert.equal(await status(other.cookie), 401, 'other session survived password change');
  assert.equal(await status(cookieFor(legacyToken)), 401, 'legacy token survived password change');
  assert.equal((await login('owner@example.invalid', 'OwnerPassword123')).response.status, 401);
  // A sign-in in the same second as the password change must work.
  const afterChange = await login('owner@example.invalid', 'BrandNewPassword456');
  assert.equal(afterChange.response.status, 200);
  assert.equal(await status(afterChange.cookie), 200, 'same-second sign-in rejected');
  assert.equal(owner._id.toString(), ownerId);
  assert.equal(owner.role, 'super_admin');
  assert.equal(owner.isBootstrapAdmin, true);
  assert.equal(store.admins.length, 1);

  // Phase 1 email-change revocation still works alongside the new sessions.
  resetRateLimits();
  result = await request('PATCH', '/profile', { name: 'Smoke Owner', email: 'renamed@example.invalid', currentPassword: 'BrandNewPassword456' }, afterChange.cookie);
  assert.equal(result.status, 200);
  assert.equal(await status(afterChange.cookie), 401);
  const afterEmail = await login('renamed@example.invalid', 'BrandNewPassword456');
  assert.equal(await status(afterEmail.cookie), 200);

  // Logs: events recorded, no secrets.
  const actions = store.activityLogs.map((log) => log.action);
  for (const action of ['admin_logout', 'admin_sign_out_everywhere', 'admin_sign_out_everywhere_failure', 'admin_password_changed']) {
    assert.ok(actions.includes(action), `missing ${action} log`);
  }
  const serialized = JSON.stringify(store.activityLogs);
  for (const secret of ['OwnerPassword123', 'BrandNewPassword456', 'WrongPassword123', env.jwtSecret, tokenOf(afterEmail.cookie), tokenOf(first.cookie)]) {
    assert.ok(!serialized.includes(secret), 'activity log leaked a secret');
  }

  // Concurrency: touching is conditional and monotonic.
  const { touchAdminSession } = await import('./models/adminModel.js');
  const liveJti = 'concurrency-test-session';
  const live = {
    jti: liveJti, createdAt: new Date(), lastSeenAt: new Date(), expiresAt: new Date(Date.now() + 3_600_000),
  };
  owner.sessions = [live];
  const future = new Date(Date.now() + 60_000);
  live.lastSeenAt = future;
  assert.equal(await touchAdminSession(ownerId, liveJti), true);
  assert.equal(live.lastSeenAt.getTime(), future.getTime(), 'lastSeenAt moved backward');
  live.lastSeenAt = new Date(Date.now() - 31 * 60 * 1000);
  assert.equal(await touchAdminSession(ownerId, liveJti), false, 'idle-expired session was refreshed');
  assert.ok(Date.now() - live.lastSeenAt.getTime() > 30 * 60 * 1000, 'idle-expired lastSeenAt was modified');
  live.lastSeenAt = new Date();
  const savedExpiry = live.expiresAt;
  live.expiresAt = new Date(Date.now() - 1000);
  assert.equal(await touchAdminSession(ownerId, liveJti), false, 'absolute-expired session was refreshed');
  live.expiresAt = savedExpiry;
  assert.equal(await touchAdminSession(ownerId, 'revoked-or-unknown-jti'), false);
  assert.equal(await touchAdminSession(ownerId, liveJti), true);

  console.log('Admin session security checks passed');
} finally {
  server.close();
}
