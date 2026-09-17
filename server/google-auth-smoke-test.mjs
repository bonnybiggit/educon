import assert from 'node:assert/strict';

process.env.NODE_ENV = 'development';
process.env.MONGODB_URI = '';
delete process.env.GOOGLE_CLIENT_ID;
delete process.env.GOOGLE_CLIENT_SECRET;
delete process.env.GOOGLE_REDIRECT_URI;

const { default: express } = await import('express');
const database = await import('./config/database.js');
const { default: studentRoutes } = await import('./routes/studentRoutes.js');
const { errorHandler } = await import('./middleware/errorHandler.js');
const { validateGoogleIdTokenClaims } = await import('./controllers/studentGoogleAuthController.js');
const { createStudentOAuthPending, createStudentOAuthState, consumeStudentOAuthState } = await import('./models/studentOAuthModel.js');

await database.connectDatabase();
assert.equal(database.isUsingMemoryStore(), true);
const app = express();
app.use(express.json());
app.use('/api', studentRoutes);
app.use(errorHandler);
const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;

const createCompletionForm = (email, overrides = {}) => {
  const form = new FormData();
  Object.entries({
    fullName: 'Google Student',
    email,
    mobileNumber: '12345678',
    country: 'Nigeria',
    targetCountry: 'United Kingdom',
    targetUniversity: 'Test University',
    courseOfStudy: 'Computing',
    intakeSession: 'Sept 2026',
    consent: 'true',
    ...overrides,
  }).forEach(([field, value]) => {
    if (value !== undefined) form.append(field, String(value));
  });
  return form;
};

const pendingCookie = (token) => `educon_student_google_pending=${token}`;

const validClaims = {
  iss: 'https://accounts.google.com',
  aud: 'google-client-id',
  exp: Math.floor(Date.now() / 1000) + 300,
  nonce: 'expected-nonce',
  sub: 'google-subject-1',
  email: 'student@example.invalid',
  email_verified: true,
};

try {
  assert.equal(validateGoogleIdTokenClaims(validClaims, { clientId: 'google-client-id', nonce: 'expected-nonce' }), validClaims);
  for (const [field, value] of [
    ['issuer', { iss: 'https://accounts.example.invalid' }],
    ['audience', { aud: 'wrong-client-id' }],
    ['expiry', { exp: Math.floor(Date.now() / 1000) - 1 }],
    ['nonce', { nonce: 'wrong-nonce' }],
    ['verified email', { email_verified: false }],
  ]) {
    assert.throws(
      () => validateGoogleIdTokenClaims({ ...validClaims, ...value }, { clientId: 'google-client-id', nonce: 'expected-nonce' }),
      new RegExp(field === 'verified email' ? 'verified' : 'Invalid|Expired'),
      `${field} validation must reject invalid claims`,
    );
  }

  await createStudentOAuthState({ state: 'one-time-state', nonce: 'nonce', codeVerifier: 'verifier' });
  const consumed = await consumeStudentOAuthState('one-time-state');
  assert.equal(consumed.codeVerifier, 'verifier');
  assert.equal(await consumeStudentOAuthState('one-time-state'), null, 'OAuth state must be single-use');

  const startResponse = await fetch(`${baseUrl}/api/student/auth/google`, { redirect: 'manual' });
  assert.equal(startResponse.status, 503, 'unconfigured Google auth must fail safely');
  const callbackResponse = await fetch(`${baseUrl}/api/student/auth/google/callback?code=code&state=unknown`, { redirect: 'manual' });
  assert.equal(callbackResponse.status, 400, 'unknown OAuth state must be rejected');
  const invalidPendingResponse = await fetch(`${baseUrl}/api/student/auth/google/complete`, {
    method: 'POST',
    headers: { Cookie: pendingCookie('invalid-pending-token') },
    body: createCompletionForm('invalid-pending@example.invalid'),
  });
  assert.equal(invalidPendingResponse.status, 401, 'invalid pending Google profiles must be rejected');

  const validPending = await createStudentOAuthPending({
    subject: 'google-valid-subject',
    email: 'google-valid@example.invalid',
    fullName: 'Google Valid',
  });
  const completionResponse = await fetch(`${baseUrl}/api/student/auth/google/complete`, {
    method: 'POST',
    headers: { Cookie: pendingCookie(validPending.token) },
    body: createCompletionForm('google-valid@example.invalid'),
  });
  const completionBody = await completionResponse.text();
  assert.equal(completionResponse.status, 201, `valid Google profile completion must succeed: ${completionBody}`);
  assert.match(completionResponse.headers.get('set-cookie'), /educon_student_session=/);
  const completedStudent = database.getMemoryStore().students.find((student) => student.email === 'google-valid@example.invalid');
  assert.ok(completedStudent);
  assert.equal(completedStudent.password, undefined, 'Google-created students must not receive a fake password');
  assert.deepEqual(database.getMemoryStore().studentIdentities.map((identity) => ({
    provider: identity.provider,
    subject: identity.subject,
    studentId: identity.studentId,
  })), [{ provider: 'google', subject: 'google-valid-subject', studentId: completedStudent.id }]);

  const missingPending = await createStudentOAuthPending({
    subject: 'google-missing-subject',
    email: 'google-missing@example.invalid',
  });
  const missingResponse = await fetch(`${baseUrl}/api/student/auth/google/complete`, {
    method: 'POST',
    headers: { Cookie: pendingCookie(missingPending.token) },
    body: createCompletionForm('google-missing@example.invalid', { targetUniversity: undefined }),
  });
  assert.equal(missingResponse.status, 400, 'missing required profile fields must be rejected');

  const expiredPending = await createStudentOAuthPending({
    subject: 'google-expired-subject',
    email: 'google-expired@example.invalid',
  });
  const expiredRecord = database.getMemoryStore().studentOAuthPending.find((item) => item.subject === 'google-expired-subject');
  expiredRecord.expiresAt = new Date(Date.now() - 1);
  const expiredResponse = await fetch(`${baseUrl}/api/student/auth/google/complete`, {
    method: 'POST',
    headers: { Cookie: pendingCookie(expiredPending.token) },
    body: createCompletionForm('google-expired@example.invalid'),
  });
  assert.equal(expiredResponse.status, 401, 'expired pending Google profiles must be rejected');

  const ownerPending = await createStudentOAuthPending({
    subject: 'google-owner-subject',
    email: 'google-owner@example.invalid',
  });
  const mismatchResponse = await fetch(`${baseUrl}/api/student/auth/google/complete`, {
    method: 'POST',
    headers: { Cookie: pendingCookie(ownerPending.token) },
    body: createCompletionForm('different-user@example.invalid'),
  });
  assert.equal(mismatchResponse.status, 403, 'a pending profile must not be completed with another email');
  console.log('Google authentication foundation checks passed');
} finally {
  await new Promise((resolve) => server.close(resolve));
  await database.closeDatabase();
}
