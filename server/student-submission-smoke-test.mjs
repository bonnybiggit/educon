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
const store = database.getMemoryStore();
const app = express();
app.use(express.json());
app.use('/api', studentRoutes);
app.use(errorHandler);
const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;

const makeStudent = (name) => {
  const _id = new ObjectId();
  const student = {
    _id, id: _id.toString(), fullName: name, email: `${name}@example.invalid`, emailVerified: true,
    currentStage: 'documents_review', status: 'pending', createdAt: new Date(), updatedAt: new Date(),
  };
  store.students.push(student);
  return student;
};
const student = makeStudent('submit-student');
const other = makeStudent('other-student');
const cookieFor = async (s) => `educon_student_session=${(await createStudentSession(s.id)).token}`;
const cookie = await cookieFor(student);

const call = (path, { method = 'GET', body, cookie: c = cookie } = {}) => fetch(`${baseUrl}/api${path}`, {
  method,
  headers: { ...(c ? { Cookie: c } : {}), ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) },
  body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
});

const pdf = () => new Blob([Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(16, 0x20)])], { type: 'application/pdf' });
const png = () => new Blob([Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(16)])], { type: 'image/png' });
const fields = {
  dateOfBirth: '2000-01-01', passportNumber: 'P1', targetCountry: 'United Kingdom', targetUniversity: 'Test University',
  courseOfStudy: 'Computing', intakeSession: 'Sept 2026', highestQualification: 'BSc', previousInstitution: 'College', cgpa: '4.0',
};
const docs = ['passport', 'transcripts', 'cv', 'waec', 'degreeCertificate', 'statementOfPurpose', 'academicReferenceLetter', 'professionalReferenceLetter'];

const buildForm = ({ omitField, omitDoc } = {}) => {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => key !== omitField && form.append(key, value));
  docs.filter((doc) => doc !== omitDoc).forEach((doc) => form.append(doc, pdf(), `${doc}.pdf`));
  if (omitDoc !== 'waecScratchCard') form.append('waecScratchCard', png(), 'scratch.png');
  return form;
};

try {
  assert.equal((await call('/student/profile/submit', { method: 'POST', cookie: '' })).status, 401, 'submit requires authentication');

  // Incomplete: nothing saved yet.
  let response = await call('/student/profile/submit', { method: 'POST' });
  assert.equal(response.status, 400);
  assert.ok((await response.json()).message.includes('Missing'));
  assert.equal(student.submittedAt, undefined);

  // Drafts remain editable; a draft missing one document and one field is still rejected.
  response = await call('/student/profile', { method: 'PATCH', body: buildForm({ omitField: 'cgpa', omitDoc: 'cv' }) });
  assert.equal(response.status, 200, 'save for later works for drafts');
  response = await call('/student/profile/submit', { method: 'POST' });
  assert.equal(response.status, 400);
  const incompleteMessage = (await response.json()).message;
  assert.ok(incompleteMessage.includes('cgpa') && incompleteMessage.includes('uploads.cv'));
  assert.equal(student.submittedAt, undefined, 'failed submission must not change state');

  // Complete the draft, then submit.
  const finish = new FormData();
  finish.append('cgpa', '4.0');
  finish.append('cv', pdf(), 'cv.pdf');
  assert.equal((await call('/student/profile', { method: 'PATCH', body: finish })).status, 200);

  response = await call('/student/profile/submit', { method: 'POST' });
  const submitted = await response.json();
  assert.equal(response.status, 200, submitted.message);
  assert.equal(submitted.data.profile.submissionStatus, 'submitted');
  assert.ok(!Number.isNaN(Date.parse(submitted.data.profile.submittedAt)));
  assert.equal(student.submissionStatus, 'submitted');
  assert.equal(student.profileCompleted, true);
  assert.equal(student.currentStage, 'documents_review', 'submission must not change the admin-controlled stage');
  assert.equal(student.status, 'pending', 'submission must not change the admin-controlled status');
  const firstSubmittedAt = student.submittedAt.getTime();

  // Duplicate submission is rejected and does not rewrite the timestamp.
  response = await call('/student/profile/submit', { method: 'POST' });
  assert.equal(response.status, 409);
  assert.equal(student.submittedAt.getTime(), firstSubmittedAt);

  // Edits are blocked after submission, for fields and for uploads.
  response = await call('/student/profile', { method: 'PATCH', body: { courseOfStudy: 'Changed' } });
  assert.equal(response.status, 409);
  assert.equal(student.courseOfStudy, 'Computing');
  const replace = new FormData();
  replace.append('passport', pdf(), 'replacement.pdf');
  response = await call('/student/profile', { method: 'PATCH', body: replace });
  assert.equal(response.status, 409);
  assert.equal(student.uploads.passport, 'passport.pdf');
  assert.equal(store.studentFiles.find((file) => file.studentId === student.id && file.field === 'passport').filename, 'passport.pdf');

  // Read access still works and reports the submitted state.
  response = await call('/student/profile');
  assert.equal((await response.json()).data.profile.submissionStatus, 'submitted');

  // Other students are unaffected.
  assert.equal(other.submittedAt, undefined);
  response = await call('/student/profile', { method: 'PATCH', body: { dateOfBirth: '1999-01-01' }, cookie: await cookieFor(other) });
  assert.equal(response.status, 200, 'another student can still edit their own draft');

  // Stale version: a profile update lands while the submit is validating completeness.
  const racer = makeStudent('racing-student');
  const racerCookie = await cookieFor(racer);
  const racerForm = buildForm();
  assert.equal((await call('/student/profile', { method: 'PATCH', body: racerForm, cookie: racerCookie })).status, 200);
  const originalCgpa = racer.cgpa;
  let injected = false;
  Object.defineProperty(racer, 'cgpa', {
    configurable: true,
    enumerable: true,
    get() {
      if (!injected) {
        injected = true;
        racer.updatedAt = new Date(Date.now() + 5000);
      }
      return originalCgpa;
    },
    set() {},
  });
  response = await call('/student/profile/submit', { method: 'POST', cookie: racerCookie });
  assert.equal(injected, true, 'the concurrent update must happen during validation');
  assert.equal(response.status, 409);
  assert.match((await response.json()).message, /reload and review/i);
  assert.equal(racer.submittedAt, undefined, 'a stale submission must not be recorded');
  assert.equal(racer.submissionStatus, undefined);
  Object.defineProperty(racer, 'cgpa', { value: originalCgpa, writable: true, configurable: true, enumerable: true });

  // After reloading (no concurrent change) the same student can submit, including legacy records with no submittedAt.
  assert.equal('submittedAt' in racer, false, 'legacy-style record has no submittedAt field');
  response = await call('/student/profile/submit', { method: 'POST', cookie: racerCookie });
  assert.equal(response.status, 200);
  assert.equal(racer.submissionStatus, 'submitted');

  // Concurrent upload + submit: the stored file must always match the recorded upload, and a rejected upload writes nothing.
  const sibling = makeStudent('concurrent-student');
  const siblingCookie = await cookieFor(sibling);
  assert.equal((await call('/student/profile', { method: 'PATCH', body: buildForm(), cookie: siblingCookie })).status, 200);
  const filesBefore = store.studentFiles.length;
  const swap = new FormData();
  swap.append('passport', pdf(), 'swapped.pdf');
  const [uploadResponse, submitResponse] = await Promise.all([
    call('/student/profile', { method: 'PATCH', body: swap, cookie: siblingCookie }),
    call('/student/profile/submit', { method: 'POST', cookie: siblingCookie }),
  ]);
  assert.ok([200, 409].includes(uploadResponse.status));
  assert.ok([200, 409].includes(submitResponse.status));
  assert.equal(store.studentFiles.length, filesBefore, 'no orphaned or duplicate file records');
  const storedPassport = store.studentFiles.find((file) => file.studentId === sibling.id && file.field === 'passport');
  assert.equal(storedPassport.filename, sibling.uploads.passport, 'stored file matches the recorded upload');
  if (uploadResponse.status === 409) assert.equal(storedPassport.filename, 'passport.pdf', 'rejected upload must not change the file');
  if (submitResponse.status === 409) assert.equal(sibling.submittedAt, undefined);

  // Once submitted, a further upload is rejected and leaves files untouched.
  if (!sibling.submittedAt) assert.equal((await call('/student/profile/submit', { method: 'POST', cookie: siblingCookie })).status, 200);
  const lateUpload = new FormData();
  lateUpload.append('passport', pdf(), 'late.pdf');
  assert.equal((await call('/student/profile', { method: 'PATCH', body: lateUpload, cookie: siblingCookie })).status, 409);
  assert.notEqual(store.studentFiles.find((file) => file.studentId === sibling.id && file.field === 'passport').filename, 'late.pdf');
  assert.equal(store.studentFiles.length, filesBefore);

  console.log('Student application submission checks passed');
} finally {
  await new Promise((resolve) => server.close(resolve));
  await database.closeDatabase();
}
