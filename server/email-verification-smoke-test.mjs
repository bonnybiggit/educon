import assert from 'node:assert/strict';
import { ObjectId } from 'mongodb';

process.env.NODE_ENV = 'development';
process.env.MONGODB_URI = '';
delete process.env.RESEND_API_KEY;

const { default: express } = await import('express');
const database = await import('./config/database.js');
const { default: studentRoutes } = await import('./routes/studentRoutes.js');
const { errorHandler } = await import('./middleware/errorHandler.js');
const {
  createOrReplaceStudentEmailVerification,
  findStudentEmailVerification,
  MAX_VERIFICATION_ATTEMPTS,
} = await import('./models/studentEmailVerificationModel.js');
const { buildVerificationEmail } = await import('./services/emailService.js');

await database.connectDatabase();
assert.equal(database.isUsingMemoryStore(), true);
const store = database.getMemoryStore();
const app = express();
app.use(express.json());
app.use('/api', studentRoutes);
app.use(errorHandler);
const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;

const addStudent = (email) => {
  const student = {
    _id: new ObjectId(),
    id: new ObjectId().toString(),
    email,
    fullName: 'Verification Student',
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  store.students.push(student);
  return student;
};

const post = (path, body) => fetch(`${baseUrl}/api${path}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

try {
  const email = 'verify@example.invalid';
  const student = addStudent(email);
  const first = await createOrReplaceStudentEmailVerification(student._id.toString());
  const challenge = await findStudentEmailVerification(student._id.toString());
  assert.match(first.code, /^\d{6}$/);
  assert.notEqual(challenge.codeHash, first.code);
  assert.equal(challenge.attempts, 0);
  assert.ok(challenge.expiresAt.getTime() > Date.now());
  assert.ok(challenge.resendAvailableAt.getTime() > Date.now());
  assert.ok(challenge.createdAt instanceof Date);
  assert.equal(buildVerificationEmail({ code: first.code, recipientName: 'Student' }).html.includes(first.code), true);

  const wrong = await post('/student/verify-email', { email, code: '000000' });
  assert.equal(wrong.status, 200);
  assert.equal(wrong.headers.get('cache-control'), 'no-store');
  assert.equal((await wrong.json()).data.verified, false);
  assert.equal((await findStudentEmailVerification(student._id.toString())).attempts, 1);

  for (let attempt = 1; attempt < MAX_VERIFICATION_ATTEMPTS; attempt += 1) {
    await post('/student/verify-email', { email, code: '000000' });
  }
  assert.equal(await findStudentEmailVerification(student._id.toString()), null, 'challenge must expire after maximum attempts');

  const expired = await createOrReplaceStudentEmailVerification(student._id.toString());
  const expiredRecord = store.studentEmailVerifications.find((item) => item.studentId === student._id.toString());
  expiredRecord.expiresAt = new Date(Date.now() - 1);
  const expiredResponse = await post('/student/verify-email', { email, code: expired.code });
  assert.equal(expiredResponse.status, 200);
  assert.equal((await expiredResponse.json()).data.verified, false);

  const reusable = await createOrReplaceStudentEmailVerification(student._id.toString());
  const validResponse = await post('/student/verify-email', { email, code: reusable.code });
  assert.equal(validResponse.status, 200);
  assert.equal((await validResponse.json()).data.verified, true);
  assert.equal(store.students.find((item) => item._id.toString() === student._id.toString()).emailVerified, true);
  assert.equal(await findStudentEmailVerification(student._id.toString()), null, 'verified code must be deleted');
  const reusedResponse = await post('/student/verify-email', { email, code: reusable.code });
  assert.equal((await reusedResponse.json()).data.verified, false);

  const resendStudent = addStudent('resend@example.invalid');
  const original = await createOrReplaceStudentEmailVerification(resendStudent._id.toString());
  const cooldownResponse = await post('/student/verify-email/resend', { email: resendStudent.email });
  assert.equal(cooldownResponse.status, 202);
  assert.equal(cooldownResponse.headers.get('cache-control'), 'no-store');
  assert.equal((await findStudentEmailVerification(resendStudent._id.toString())).codeHash, (await findStudentEmailVerification(resendStudent._id.toString())).codeHash);

  const replacedStudent = addStudent('replace@example.invalid');
  const old = await createOrReplaceStudentEmailVerification(replacedStudent._id.toString());
  const replacement = await createOrReplaceStudentEmailVerification(replacedStudent._id.toString());
  assert.notEqual(old.code, replacement.code);
  const oldResponse = await post('/student/verify-email', { email: replacedStudent.email, code: old.code });
  assert.equal((await oldResponse.json()).data.verified, false);
  assert.equal((await post('/student/verify-email', { email: replacedStudent.email, code: replacement.code })).status, 200);

  const failedStudent = addStudent('provider-failure@example.invalid');
  const failedResponse = await post('/student/verify-email/resend', { email: failedStudent.email });
  assert.equal(failedResponse.status, 503, 'missing Resend configuration must fail safely');
  assert.equal(await findStudentEmailVerification(failedStudent._id.toString()), null, 'failed delivery must not leave a usable challenge');
  assert.equal(original.code.length, 6);
  console.log('Email verification infrastructure checks passed');
} finally {
  await new Promise((resolve) => server.close(resolve));
  await database.closeDatabase();
}
