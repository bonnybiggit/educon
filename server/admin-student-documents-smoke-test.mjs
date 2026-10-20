import assert from 'node:assert/strict';
import { ObjectId } from 'mongodb';

process.env.NODE_ENV = 'development';
process.env.MONGODB_URI = '';
process.env.JWT_SECRET = 'AdminDocsSmokeTestJwtSecretValue1234567890';
process.env.ADMIN_BOOTSTRAP_EMAIL = 'docs-admin@example.invalid';
process.env.ADMIN_BOOTSTRAP_PASSWORD = 'DocsAdminPassword123';
process.env.ADMIN_BOOTSTRAP_NAME = 'Docs Smoke Admin';

const { default: express } = await import('express');
const database = await import('./config/database.js');
const { default: adminRoutes } = await import('./routes/adminRoutes.js');
const { errorHandler } = await import('./middleware/errorHandler.js');
const { bootstrapAdminFromEnv } = await import('./services/adminBootstrapService.js');
const { createStudentSession } = await import('./models/studentSessionModel.js');

await database.connectDatabase();
const store = database.getMemoryStore();
await bootstrapAdminFromEnv();

const makeStudent = (name) => {
  const _id = new ObjectId();
  const student = { _id, id: _id.toString(), fullName: name, email: `${name}@example.invalid`, createdAt: new Date() };
  store.students.push(student);
  return student;
};
const studentA = makeStudent('student-a');
const studentB = makeStudent('student-b');
const studentC = makeStudent('student-c');

const pdf = Buffer.from('%PDF-1.4 student A passport');
store.studentFiles.push(
  { _id: new ObjectId(), studentId: studentA.id, field: 'passport', filename: '../evil"\r\nname.pdf', contentType: 'application/pdf', size: pdf.length, data: pdf },
  { _id: new ObjectId(), studentId: studentB.id, field: 'passport', filename: 'b.pdf', contentType: 'application/pdf', size: 3, data: Buffer.from('B-DATA') },
  { _id: new ObjectId(), studentId: studentA.id, field: 'cv', filename: 'cv.html', contentType: 'text/html', size: 6, data: Buffer.from('<b>x</b>') },
);

const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);
app.use(errorHandler);
const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;

try {
  const login = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'docs-admin@example.invalid', password: 'DocsAdminPassword123' }),
  });
  const adminCookie = login.headers.get('set-cookie')?.split(';')[0] || '';
  assert.equal(login.status, 200);

  const studentSession = await createStudentSession(studentA.id);
  const studentCookie = `educon_student_session=${studentSession.token}`;

  const get = (path, cookie) => fetch(`${baseUrl}/api/admin/students/${path}`, { headers: cookie ? { Cookie: cookie } : {} });

  assert.equal((await get(`${studentA.id}/documents/passport`)).status, 401, 'anonymous requests must be rejected');
  assert.equal((await get(`${studentA.id}/documents/passport`, studentCookie)).status, 401, 'student sessions must not access admin documents');

  let response = await get(`${studentA.id}/documents/passport`, adminCookie);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('content-type'), 'application/pdf');
  const disposition = response.headers.get('content-disposition');
  assert.ok(disposition.startsWith('attachment;'), 'default must be attachment');
  assert.ok(!/[\r\n]/.test(disposition) && !disposition.includes('..'), 'filename must be sanitised');
  assert.equal(Buffer.from(await response.arrayBuffer()).toString(), pdf.toString(), 'must return only student A file');

  response = await get(`${studentA.id}/documents/passport?disposition=inline`, adminCookie);
  assert.ok(response.headers.get('content-disposition').startsWith('inline;'));
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  await response.arrayBuffer();

  response = await get(`${studentA.id}/documents/cv?disposition=inline`, adminCookie);
  assert.equal(response.headers.get('content-type'), 'application/octet-stream', 'unsafe stored types must not be served as-is');
  assert.ok(response.headers.get('content-disposition').startsWith('attachment;'), 'unsafe types must never be inline');
  await response.arrayBuffer();

  response = await get(`${studentC.id}/documents/passport`, adminCookie);
  assert.equal(response.status, 404, 'a student without a file must not receive another student file');
  assert.equal((await get(`${studentA.id}/documents/waec`, adminCookie)).status, 404);
  assert.equal((await get(`${studentA.id}/documents/__proto__`, adminCookie)).status, 400, 'unknown fields must be rejected');
  assert.equal((await get(`not-an-id/documents/passport`, adminCookie)).status, 400);

  const logs = store.activityLogs.filter((entry) => entry.resource === 'student_document');
  assert.equal(logs.length, 3, 'only successful accesses are logged');
  assert.ok(logs.every((entry) => entry.adminId && entry.resourceId === studentA.id && entry.details.field));
  assert.ok(logs.some((entry) => entry.action === 'student_document_view'));
  assert.ok(logs.some((entry) => entry.action === 'student_document_download'));

  console.log('Admin student document access checks passed');
} finally {
  await new Promise((resolve) => server.close(resolve));
  await database.closeDatabase();
}
