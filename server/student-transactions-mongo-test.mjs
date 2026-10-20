// Integration test against a REAL, disposable MongoDB (replica set or standalone).
// Usage: set TEST_MONGODB_URI to a local test server. A throwaway database is created and dropped.
import assert from 'node:assert/strict';
import { MongoClient, ObjectId } from 'mongodb';

const testUri = process.env.TEST_MONGODB_URI;
if (!testUri) {
  console.log('Skipped: set TEST_MONGODB_URI to a disposable local MongoDB to run this test');
  process.exit(0);
}
if (!/^mongodb:\/\/(127\.0\.0\.1|localhost)[:/]/.test(testUri)) {
  throw new Error('Refusing to run: TEST_MONGODB_URI must point to a local MongoDB');
}

const testDbName = `educon_txn_test_${Date.now()}`;
process.env.NODE_ENV = 'development';
process.env.MONGODB_URI = testUri;
process.env.MONGODB_DB_NAME = testDbName;

const { env } = await import('./config/env.js');
const { default: express } = await import('express');
const database = await import('./config/database.js');
const { default: studentRoutes } = await import('./routes/studentRoutes.js');
const { errorHandler } = await import('./middleware/errorHandler.js');
const { createStudentSession } = await import('./models/studentSessionModel.js');
const { replaceStudentFiles } = await import('./models/studentFileModel.js');

assert.equal(env.dbName, testDbName);
await database.connectDatabase();
assert.equal(database.isUsingMemoryStore(), false, 'must run against real MongoDB');

const probe = new MongoClient(testUri);
await probe.connect();
const supportsTransactions = Boolean((await probe.db('admin').command({ hello: 1 })).setName);
console.log(`Topology: ${supportsTransactions ? 'replica set (transactions)' : 'standalone (fallback)'}`);

const students = database.getCollection(env.studentsCollection);
const filesCol = database.getCollection(env.studentFilesCollection);

const app = express();
app.use(express.json());
app.use('/api', studentRoutes);
app.use(errorHandler);
const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;

const makeStudent = async (name) => {
  const _id = new ObjectId();
  const student = {
    _id, fullName: name, email: `${name}@example.invalid`, emailVerified: true,
    currentStage: 'documents_review', status: 'pending', createdAt: new Date(), updatedAt: new Date(),
  };
  await students.insertOne(student);
  const { token } = await createStudentSession(_id.toString());
  return { id: _id.toString(), cookie: `educon_student_session=${token}` };
};
const call = (path, { method = 'GET', body, cookie } = {}) => fetch(`${baseUrl}/api${path}`, {
  method,
  headers: { Cookie: cookie },
  body,
});

const pdf = () => new Blob([Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(16, 0x20)])], { type: 'application/pdf' });
const png = () => new Blob([Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(16)])], { type: 'image/png' });
const fields = {
  dateOfBirth: '2000-01-01', passportNumber: 'P1', targetCountry: 'United Kingdom', targetUniversity: 'Test University',
  courseOfStudy: 'Computing', intakeSession: 'Sept 2026', highestQualification: 'BSc', previousInstitution: 'College', cgpa: '4.0',
};
const docs = ['passport', 'transcripts', 'cv', 'waec', 'degreeCertificate', 'statementOfPurpose', 'academicReferenceLetter', 'professionalReferenceLetter'];
const fullForm = () => {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => form.append(key, value));
  docs.forEach((doc) => form.append(doc, pdf(), `${doc}.pdf`));
  form.append('waecScratchCard', png(), 'scratch.png');
  return form;
};
const swapForm = (name) => {
  const form = new FormData();
  form.append('passport', pdf(), name);
  return form;
};
const passportFile = (id) => filesCol.findOne({ studentId: id, field: 'passport' });

try {
  // 1. Rollback: a failure after the student update must undo both the student update and file writes.
  const rb = await makeStudent('rollback');
  assert.equal((await call('/student/profile', { method: 'PATCH', body: fullForm(), cookie: rb.cookie })).status, 200);
  const before = await students.findOne({ _id: new ObjectId(rb.id) });
  const beforeFile = await passportFile(rb.id);
  const boom = new Error('forced failure');
  const failing = database.runInTransaction(async (session) => {
    await students.updateOne({ _id: new ObjectId(rb.id) }, { $set: { courseOfStudy: 'ROLLED BACK' } }, { session });
    await replaceStudentFiles(rb.id, { passport: [{ originalname: 'rolledback.pdf', mimetype: 'application/pdf', size: 1, buffer: Buffer.from('x') }] }, { session });
    throw boom;
  });
  await assert.rejects(failing, (error) => error === boom, 'the original error must propagate');
  const afterRollback = await students.findOne({ _id: new ObjectId(rb.id) });
  if (supportsTransactions) {
    assert.equal(afterRollback.courseOfStudy, before.courseOfStudy, 'student update rolled back');
    assert.equal((await passportFile(rb.id)).filename, beforeFile.filename, 'file write rolled back');
  }
  assert.equal(await filesCol.countDocuments({ studentId: rb.id }), 9, 'no orphaned or missing file records');

  // 2. Draft save works and file records match uploads (transaction or fallback path).
  const draft = await makeStudent('draft');
  assert.equal((await call('/student/profile', { method: 'PATCH', body: fullForm(), cookie: draft.cookie })).status, 200);
  assert.equal(await filesCol.countDocuments({ studentId: draft.id }), 9);

  // 3. Concurrent upload vs submit, repeated: stored file must always match the recorded upload.
  for (let round = 0; round < 15; round += 1) {
    const racer = await makeStudent(`racer${round}`);
    assert.equal((await call('/student/profile', { method: 'PATCH', body: fullForm(), cookie: racer.cookie })).status, 200);
    const [upload, submit] = await Promise.all([
      call('/student/profile', { method: 'PATCH', body: swapForm('swapped.pdf'), cookie: racer.cookie }),
      call('/student/profile/submit', { method: 'POST', cookie: racer.cookie }),
    ]);
    assert.ok([200, 409].includes(upload.status), `round ${round}: upload ${upload.status}`);
    assert.ok([200, 409].includes(submit.status), `round ${round}: submit ${submit.status}`);
    const doc = await students.findOne({ _id: new ObjectId(racer.id) });
    const stored = await passportFile(racer.id);
    assert.equal(stored.filename, doc.uploads.passport, `round ${round}: stored file matches recorded upload`);
    assert.equal(await filesCol.countDocuments({ studentId: racer.id }), 9, `round ${round}: no duplicate/orphan files`);
    if (upload.status === 409) assert.equal(stored.filename, 'passport.pdf', 'rejected upload must not change the file');
    if (submit.status === 200) assert.ok(doc.submittedAt, 'submitted student has submittedAt');
    if (upload.status === 200 && submit.status === 200) {
      // Both succeeded: the upload must have committed before the submit.
      assert.ok(doc.submittedAt.getTime() >= doc.updatedAt.getTime() - 1, 'submit is the last write');
    }
  }

  // 4. After submission, uploads are rejected and files untouched.
  const done = await makeStudent('submitted');
  assert.equal((await call('/student/profile', { method: 'PATCH', body: fullForm(), cookie: done.cookie })).status, 200);
  assert.equal((await call('/student/profile/submit', { method: 'POST', cookie: done.cookie })).status, 200);
  assert.equal((await call('/student/profile/submit', { method: 'POST', cookie: done.cookie })).status, 409);
  assert.equal((await call('/student/profile', { method: 'PATCH', body: swapForm('late.pdf'), cookie: done.cookie })).status, 409);
  assert.equal((await passportFile(done.id)).filename, 'passport.pdf');

  // 5. Legacy student document without a submittedAt field can still submit.
  const legacy = await makeStudent('legacy');
  assert.equal((await call('/student/profile', { method: 'PATCH', body: fullForm(), cookie: legacy.cookie })).status, 200);
  assert.equal('submittedAt' in (await students.findOne({ _id: new ObjectId(legacy.id) })), false);
  assert.equal((await call('/student/profile/submit', { method: 'POST', cookie: legacy.cookie })).status, 200);

  console.log('Student transaction checks against real MongoDB passed');
} finally {
  await new Promise((resolve) => server.close(resolve));
  await probe.db(testDbName).dropDatabase();
  await probe.close();
  await database.closeDatabase();
}
