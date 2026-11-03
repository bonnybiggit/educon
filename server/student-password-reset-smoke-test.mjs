import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';

// Never connect these checks to the configured application database.
process.env.NODE_ENV = 'development';
process.env.MONGODB_URI = '';

const { default: express } = await import('express');
const database = await import('./config/database.js');
const { default: studentRoutes } = await import('./routes/studentRoutes.js');
const { errorHandler } = await import('./middleware/errorHandler.js');
const { resetRateLimits } = await import('./middleware/rateLimit.js');
const { setPasswordResetEmailSenderForTests } = await import('./services/emailService.js');
const { createStudentSession } = await import('./models/studentSessionModel.js');
await database.connectDatabase();
assert.equal(database.isUsingMemoryStore(), true);
const store = database.getMemoryStore();

let sentCode;
let sentCount = 0;
setPasswordResetEmailSenderForTests(async ({ code }) => { sentCode = code; sentCount += 1; });

const app = express();
app.use(express.json());
app.use('/api', studentRoutes);
app.use(errorHandler);
const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const post = (path, body, cookie) => fetch(`${baseUrl}/api${path}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
  body: JSON.stringify(body),
});

const makeStudent = async (email, password) => {
  const student = {
    _id: new ObjectId(), id: undefined, email, fullName: 'Reset Student', emailVerified: true,
    country: 'Nigeria', targetUniversity: 'Keep Me', createdAt: new Date(),
    ...(password ? { password: await bcrypt.hash(password, 4) } : {}),
  };
  store.students.push(student);
  return student;
};

try {
  const passwordStudent = await makeStudent('has-password@example.invalid', 'OldPassword123');
  const googleOnly = await makeStudent('google-only@example.invalid');
  googleOnly.emailVerified = false;
  const originalId = googleOnly._id.toString();
  const studentCount = store.students.length;

  // Generic responses: unknown and known emails are indistinguishable and unknown emails send nothing.
  const unknown = await post('/student/password-reset/request', { email: 'nobody@example.invalid' });
  const known = await post('/student/password-reset/request', { email: passwordStudent.email });
  assert.equal(unknown.status, 202);
  assert.equal(known.status, 202);
  assert.deepEqual(await unknown.json(), await known.json());
  assert.equal(sentCount, 1);
  assert.equal((await post('/student/password-reset/request', { email: 'not-an-email' })).status, 202);

  // Only a hash is stored.
  const challenge = store.studentPasswordResets[0];
  assert.match(sentCode, /^\d{6}$/);
  assert.notEqual(challenge.codeHash, sentCode);
  assert.ok(!JSON.stringify(challenge).includes(sentCode));

  // Resend cooldown prevents mail flooding.
  await post('/student/password-reset/request', { email: passwordStudent.email });
  assert.equal(sentCount, 1, 'cooldown must suppress repeat emails');

  // Wrong code, weak password and unknown accounts are rejected without changing anything.
  const oldHash = passwordStudent.password;
  assert.equal((await post('/student/password-reset/confirm', { email: passwordStudent.email, code: '000000', password: 'NewPassword123' })).status, 400);
  assert.equal((await post('/student/password-reset/confirm', { email: passwordStudent.email, code: sentCode, password: '123' })).status, 400);
  assert.equal((await post('/student/password-reset/confirm', { email: 'nobody@example.invalid', code: sentCode, password: 'NewPassword123' })).status, 400);
  assert.equal(passwordStudent.password, oldHash);

  // Successful reset revokes every existing session and is single-use.
  const session = await createStudentSession(passwordStudent._id.toString());
  await createStudentSession(passwordStudent._id.toString());
  const bystander = await createStudentSession(googleOnly._id.toString());
  const cookie = `educon_student_session=${session.token}`;
  const reset = await post('/student/password-reset/confirm', { email: passwordStudent.email, code: sentCode, password: 'NewPassword123' }, cookie);
  assert.equal(reset.status, 200);
  assert.equal(store.studentSessions.filter((item) => item.studentId === passwordStudent._id.toString()).length, 0);
  assert.equal(store.studentSessions.length, 1, 'other students keep their sessions');
  assert.ok(bystander.token);
  assert.equal(await bcrypt.compare('NewPassword123', passwordStudent.password), true);
  assert.equal((await post('/student/password-reset/confirm', { email: passwordStudent.email, code: sentCode, password: 'AnotherPassword1' })).status, 400, 'code must be single-use');
  assert.equal(await bcrypt.compare('NewPassword123', passwordStudent.password), true);
  assert.equal((await post('/login', { email: passwordStudent.email, password: 'OldPassword123' })).status, 401);
  assert.equal((await post('/login', { email: passwordStudent.email, password: 'NewPassword123' })).status, 200);

  // A student without a password cannot log in until recovery establishes one; the account is reused, not duplicated.
  assert.equal((await post('/login', { email: googleOnly.email, password: 'Whatever123' })).status, 403);
  await post('/student/password-reset/request', { email: googleOnly.email });
  assert.equal((await post('/student/password-reset/confirm', { email: googleOnly.email, code: sentCode, password: 'GoogleUserPass1' })).status, 200);
  assert.equal(store.students.length, studentCount, 'no duplicate accounts');
  assert.equal(googleOnly._id.toString(), originalId);
  assert.equal(googleOnly.targetUniversity, 'Keep Me');
  assert.equal(googleOnly.emailVerified, true);
  assert.equal((await post('/login', { email: googleOnly.email, password: 'GoogleUserPass1' })).status, 200);

  // Too many wrong guesses burn the code.
  resetRateLimits();
  const target = await makeStudent('guess@example.invalid', 'GuessPassword1');
  await post('/student/password-reset/request', { email: target.email });
  const realCode = sentCode;
  const wrong = realCode === '111111' ? '222222' : '111111';
  for (let i = 0; i < 5; i += 1) {
    assert.equal((await post('/student/password-reset/confirm', { email: target.email, code: wrong, password: 'NewPassword123' })).status, 400);
  }
  assert.equal((await post('/student/password-reset/confirm', { email: target.email, code: realCode, password: 'NewPassword123' })).status, 400, 'exhausted code must be dead');

  // Expired codes are rejected.
  resetRateLimits();
  const late = await makeStudent('late@example.invalid', 'LatePassword1');
  await post('/student/password-reset/request', { email: late.email });
  store.studentPasswordResets.find((item) => item.studentId === late._id.toString()).expiresAt = new Date(0);
  assert.equal((await post('/student/password-reset/confirm', { email: late.email, code: sentCode, password: 'NewPassword123' })).status, 400);

  // Rate limiting applies to both endpoints.
  resetRateLimits();
  let limited = 0;
  for (let i = 0; i < 8; i += 1) {
    if ((await post('/student/password-reset/request', { email: 'flood@example.invalid' })).status === 429) limited += 1;
  }
  assert.ok(limited > 0, 'request endpoint must be rate limited');
  resetRateLimits();
  limited = 0;
  for (let i = 0; i < 12; i += 1) {
    if ((await post('/student/password-reset/confirm', { email: 'flood@example.invalid', code: '123456', password: 'NewPassword123' })).status === 429) limited += 1;
  }
  assert.ok(limited > 0, 'confirm endpoint must be rate limited');

  // Missing email configuration is reported honestly rather than pretending a message was sent.
  resetRateLimits();
  setPasswordResetEmailSenderForTests(undefined);
  const unconfigured = await post('/student/password-reset/request', { email: passwordStudent.email });
  assert.equal(unconfigured.status, 503);
  assert.match((await unconfigured.json()).message, /not configured/i);

  console.log('Student password recovery checks passed');
} finally {
  await new Promise((resolve) => server.close(resolve));
  await database.closeDatabase();
}
