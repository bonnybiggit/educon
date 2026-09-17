import assert from 'node:assert/strict';

// Never connect these checks to the configured application database.
process.env.NODE_ENV = 'development';
process.env.MONGODB_URI = '';
process.env.JWT_EXPIRES_IN_SECONDS = '28800';

const { default: express } = await import('express');
const { default: cors } = await import('cors');
const database = await import('./config/database.js');
const { default: studentRoutes } = await import('./routes/studentRoutes.js');
const { errorHandler } = await import('./middleware/errorHandler.js');
const { corsOptions } = await import('./middleware/corsOptions.js');
const { setVerificationEmailSenderForTests } = await import('./services/emailService.js');
await database.connectDatabase();
assert.equal(database.isUsingMemoryStore(), true);
const store = database.getMemoryStore();
let verificationCode;
setVerificationEmailSenderForTests(async ({ code }) => { verificationCode = code; });
const app = express();
app.use(cors(corsOptions));
app.use(express.json());
app.use('/api', studentRoutes);
app.use(errorHandler);
const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const credentials = { email: 'student@example.invalid', password: 'StudentPassword123' };
const registration = {
  ...credentials, fullName: 'Test Student', mobileNumber: '12345678', country: 'Nigeria', consent: true,
  targetUniversity: 'Should Not Be Stored', courseOfStudy: 'Should Not Be Stored',
};
const request = (path, { body, cookie, ...options } = {}) => fetch(`${baseUrl}/api${path}`, {
  ...options,
  headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...options.headers },
  ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}),
});
const login = async () => {
  const response = await request('/login', { body: credentials });
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Path=\/api/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const data = (await response.json()).data;
  assert.equal(data.user.password, undefined);
  assert.equal(data.user.confirmPassword, undefined);
  assert.ok(Date.parse(data.expiresAt) > Date.now());
  return cookie.split(';')[0];
};

try {
  assert.equal((await request('/student/me')).status, 401);
  for (const field of ['fullName', 'email', 'password', 'country', 'mobileNumber', 'consent']) {
    const incomplete = { ...registration, email: `missing-${field}@example.invalid` };
    delete incomplete[field];
    assert.equal((await request('/register', { body: incomplete })).status, 400, `${field} must be required`);
  }
  assert.equal((await request('/register', { body: registration })).status, 202);
  assert.equal(store.studentSessions.length, 0, 'registration must not authenticate');
  assert.equal((await request('/student/me')).status, 401);
  const registeredStudent = store.students.find((student) => student.email === credentials.email);
  assert.ok(registeredStudent);
  assert.notEqual(registeredStudent.password, credentials.password);
  assert.equal(registeredStudent.emailVerified, false);
  assert.equal(registeredStudent.emailVerifiedAt, null);
  assert.equal(registeredStudent.profileCompleted, false);
  assert.equal(registeredStudent.targetUniversity, undefined, 'academic fields must not be stored at account creation');
  assert.equal(registeredStudent.courseOfStudy, undefined, 'application fields must not be stored at account creation');
  assert.equal(store.studentEmailVerifications.length, 1);
  assert.match(verificationCode, /^\d{6}$/);
  assert.notEqual(store.studentEmailVerifications[0].codeHash, verificationCode);
  assert.equal((await request('/login', { body: credentials })).status, 403, 'unverified accounts cannot log in');
  assert.equal((await request('/register', { body: registration })).status, 202, 'duplicate registration must be generic');
  assert.equal(store.students.filter((student) => student.email === credentials.email).length, 1);
  setVerificationEmailSenderForTests(async () => { throw new Error('simulated provider failure'); });
  const failedRegistration = { ...registration, email: 'delivery-failure@example.invalid' };
  const challengeCountBeforeFailure = store.studentEmailVerifications.length;
  assert.equal((await request('/register', { body: failedRegistration })).status, 503, 'provider failure must fail registration safely');
  assert.equal(store.students.some((student) => student.email === failedRegistration.email), false);
  assert.equal(store.studentEmailVerifications.length, challengeCountBeforeFailure);
  setVerificationEmailSenderForTests(async ({ code }) => { verificationCode = code; });
  let verificationResponse = await request('/student/verify-email', { body: { email: credentials.email, code: verificationCode } });
  assert.equal((await verificationResponse.json()).data.verified, true);
  assert.equal(registeredStudent.emailVerified, true);
  assert.equal((await request('/login', { body: { ...credentials, password: 'wrong' } })).status, 401);
  assert.equal((await request('/login', { body: { ...credentials, password: {} } })).status, 400);
  let cookie = await login();
  const token = cookie.split('=')[1];
  assert.notEqual(store.studentSessions[0]._id, token, 'store only a hash of the session token');
  let response = await request('/student/me', { cookie });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal((await response.json()).data.user.email, credentials.email);
  assert.equal((await request('/student/me', { cookie: `${cookie.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}` })).status, 401);
  assert.equal((await request('/student/me', { cookie: 'educonStudentAuthenticated=true; educonStudentProfile=fake' })).status, 401);
  assert.equal((await request('/student/me', { cookie: 'educon_student_session=%invalid' })).status, 401);
  assert.equal((await request('/student/me', { cookie: `educon_admin_token=${token}` })).status, 401);
  response = await request('/student/logout', { cookie, method: 'POST', headers: { Origin: 'https://untrusted.invalid' } });
  assert.equal(response.status, 403);
  assert.equal((await request('/student/me', { cookie })).status, 200);
  response = await request('/student/logout', { cookie, method: 'POST' });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie'), /Expires=Thu, 01 Jan 1970/);
  assert.equal((await request('/student/me', { cookie })).status, 401, 'logout must invalidate replayed cookies');
  assert.equal((await request('/student/logout', { method: 'POST' })).status, 200);
  cookie = await login();
  store.studentSessions[0].expiresAt = new Date(Date.now() - 1);
  assert.equal((await request('/student/me', { cookie })).status, 401);
  cookie = await login();
  const student = store.students.pop();
  assert.equal((await request('/student/me', { cookie })).status, 401, 'deleted accounts must lose access');
  store.students.push(student);
  console.log('Student authentication API checks passed');

  if (process.argv.includes('--browser')) {
    const { runBrowserChecks } = await import('./student-auth-browser-test.mjs');
    await runBrowserChecks({ app, baseUrl, store, credentials });
  }
} finally {
  await new Promise((resolve) => server.close(resolve));
  await database.closeDatabase();
}
