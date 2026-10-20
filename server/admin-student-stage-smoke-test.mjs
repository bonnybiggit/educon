import assert from 'node:assert/strict';
import { ObjectId } from 'mongodb';

process.env.NODE_ENV = 'development';
process.env.MONGODB_URI = '';
process.env.JWT_SECRET = 'AdminStageSmokeTestJwtSecretValue1234567890';
process.env.ADMIN_BOOTSTRAP_EMAIL = 'stage-admin@example.invalid';
process.env.ADMIN_BOOTSTRAP_PASSWORD = 'StageAdminPassword123';
process.env.ADMIN_BOOTSTRAP_NAME = 'Stage Smoke Admin';

const { default: express } = await import('express');
const database = await import('./config/database.js');
const { default: adminRoutes } = await import('./routes/adminRoutes.js');
const { errorHandler } = await import('./middleware/errorHandler.js');
const { bootstrapAdminFromEnv } = await import('./services/adminBootstrapService.js');
const { APPLICATION_STAGE_VALUES } = await import('./constants/applicationStages.js');

await database.connectDatabase();
const store = database.getMemoryStore();
await bootstrapAdminFromEnv();

const studentId = new ObjectId().toString();
const student = {
  _id: new ObjectId(studentId),
  id: studentId,
  fullName: 'Stage Student',
  email: 'stage-student@example.invalid',
  emailVerified: true,
  profileCompleted: false,
  status: 'pending',
  currentStage: 'documents_review',
  createdAt: new Date(),
  updatedAt: new Date(),
};
store.students.push(student);

const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);
app.use(errorHandler);
const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;

const parseCookie = (response) => response.headers.get('set-cookie')?.split(';')[0] || '';

try {
  const loginResponse = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'stage-admin@example.invalid', password: 'StageAdminPassword123' }),
  });
  const cookie = parseCookie(loginResponse);
  assert.equal(loginResponse.status, 200, 'admin login must succeed');
  assert.ok(cookie, 'admin login must return an auth cookie');

  const patch = (id, body) => fetch(`${baseUrl}/api/admin/students/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify(body),
  });

  // Only the 5 approved stage values may be used, and they must match the shared allowlist exactly.
  assert.deepEqual(APPLICATION_STAGE_VALUES, ['documents_review', 'application_submitted', 'offer_given', 'visa_applied', 'visa_issued']);

  let response = await patch(studentId, { currentStage: 'application_submitted' });
  let body = await response.json();
  assert.equal(response.status, 200, `admin should be able to set an approved stage: ${body.message}`);
  assert.equal(body.data.student.currentStage, 'application_submitted');
  assert.equal(student.currentStage, 'application_submitted');

  response = await patch(studentId, { currentStage: 'Not A Real Stage' });
  assert.equal(response.status, 400, 'arbitrary stage strings must be rejected');
  assert.equal(student.currentStage, 'application_submitted', 'rejected update must not mutate the student');

  // Legacy stage names from the previous status system must no longer be accepted.
  response = await patch(studentId, { currentStage: 'Initial Consultation' });
  assert.equal(response.status, 400, 'legacy stage values must be rejected');

  response = await fetch(`${baseUrl}/api/admin/students`, { headers: { Cookie: cookie } });
  body = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(body.data.filters.stages, APPLICATION_STAGE_VALUES, 'stage filter options must match the approved allowlist');

  response = await patch(studentId, { currentStage: 'visa_issued' });
  body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.data.student.currentStage, 'visa_issued');

  response = await patch(studentId, {});
  assert.equal(response.status, 400, 'a patch with no valid fields must be rejected');

  const unauthResponse = await fetch(`${baseUrl}/api/admin/students/${studentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentStage: 'offer_given' }),
  });
  assert.equal(unauthResponse.status, 401, 'unauthenticated stage updates must be rejected');

  console.log('Admin student stage checks passed');
} finally {
  await new Promise((resolve) => server.close(resolve));
  await database.closeDatabase();
}
