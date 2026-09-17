import assert from 'node:assert/strict';
import { ObjectId } from 'mongodb';

process.env.NODE_ENV = 'development';
process.env.MONGODB_URI = '';

const { default: express } = await import('express');
const database = await import('./config/database.js');
const { default: studentRoutes } = await import('./routes/studentRoutes.js');
const { errorHandler } = await import('./middleware/errorHandler.js');
const { createStudentSession } = await import('./models/studentSessionModel.js');

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

const studentId = new ObjectId().toString();
const student = {
  _id: new ObjectId(studentId),
  id: studentId,
  fullName: 'Profile Student',
  email: 'profile@example.invalid',
  emailVerified: true,
  profileCompleted: false,
  country: 'Nigeria',
  mobileNumber: '12345678',
  password: 'existing-hash',
  preservedField: 'must remain',
  createdAt: new Date(),
  updatedAt: new Date(),
};
const otherStudent = {
  _id: new ObjectId(),
  id: new ObjectId().toString(),
  fullName: 'Other Student',
  email: 'other@example.invalid',
  emailVerified: true,
  profileCompleted: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};
store.students.push(student, otherStudent);
const session = await createStudentSession(studentId);
const cookie = `educon_student_session=${session.token}`;
const request = (path, options = {}) => fetch(`${baseUrl}/api${path}`, {
  ...options,
  headers: { ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) },
});
const jsonPatch = (body, headers = {}) => request('/student/profile', {
  method: 'PATCH',
  headers: { Cookie: cookie, ...headers },
  body: JSON.stringify(body),
});
const completeFields = {
  dateOfBirth: '2000-01-01',
  passportNumber: 'P12345',
  targetCountry: 'United Kingdom',
  targetUniversity: 'Test University',
  courseOfStudy: 'Computing',
  intakeSession: 'Sept 2026',
  currentStage: 'Initial Consultation',
};

try {
  assert.equal((await request('/student/profile')).status, 401, 'unauthenticated profile access must fail');
  let response = await request('/student/profile', { headers: { Cookie: cookie } });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal((await response.json()).data.completion.isComplete, false);

  response = await jsonPatch({ dateOfBirth: '2000-01-01' });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).data.completion.completedFields, 1);
  assert.equal(student.preservedField, 'must remain');

  response = await jsonPatch({ email: 'attacker@example.invalid' });
  assert.equal(response.status, 400);
  response = await jsonPatch({ studentId: otherStudent.id });
  assert.equal(response.status, 400);
  assert.equal(otherStudent.dateOfBirth, undefined);

  const validForm = new FormData();
  Object.entries(completeFields).forEach(([field, value]) => validForm.append(field, value));
  validForm.append('passport', new Blob(['passport'], { type: 'application/pdf' }), 'passport.pdf');
  validForm.append('transcripts', new Blob(['transcript'], { type: 'image/png' }), 'transcript.png');
  validForm.append('cv', new Blob(['cv'], { type: 'application/pdf' }), 'cv.pdf');
  response = await request('/student/profile', { method: 'PATCH', headers: { Cookie: cookie }, body: validForm });
  assert.equal(response.status, 200);
  const completed = (await response.json()).data;
  assert.equal(completed.completion.isComplete, true);
  assert.equal(completed.completion.percentage, 100);
  assert.equal(student.profileCompleted, true);
  assert.equal(student.uploads.passport, 'passport.pdf');
  assert.equal(store.studentFiles.length, 3);
  assert.equal(student.preservedField, 'must remain');

  response = await jsonPatch({ currentStage: 'Not A Real Stage' });
  assert.equal(response.status, 400);

  const invalidTypeForm = new FormData();
  invalidTypeForm.append('passport', new Blob(['bad'], { type: 'text/plain' }), 'passport.txt');
  response = await request('/student/profile', { method: 'PATCH', headers: { Cookie: cookie }, body: invalidTypeForm });
  assert.equal(response.status, 400);

  const oversizedForm = new FormData();
  oversizedForm.append('passport', new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: 'application/pdf' }), 'large.pdf');
  response = await request('/student/profile', { method: 'PATCH', headers: { Cookie: cookie }, body: oversizedForm });
  assert.equal(response.status, 400);

  response = await jsonPatch({ passportNumber: 'P54321' });
  assert.equal(response.status, 200);
  assert.equal(student.passportNumber, 'P54321');
  assert.equal(student.profileCompleted, true);
  console.log('Student profile completion checks passed');
} finally {
  await new Promise((resolve) => server.close(resolve));
  await database.closeDatabase();
}
