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
  // Assigned at registration/by an admin; students cannot change this via the profile patch.
  currentStage: 'documents_review',
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
  highestQualification: 'BSc',
  previousInstitution: 'Test College',
  cgpa: '4.2',
};

// Real magic-byte fixtures so the content-sniffing validation in studentUploads.js accepts them.
const pdfBytes = () => Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(16, 0x20)]);
const oversizedPdfBytes = () => Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(5 * 1024 * 1024 + 1, 0x41)]);
const pngBytes = () => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(16, 0)]);
const jpegBytes = () => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(16, 0)]);
const webpBytes = () => Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4, 0), Buffer.from('WEBP'), Buffer.alloc(8, 0)]);
const docxBytes = () => Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(16, 0)]);

const allDocumentFields = ['passport', 'transcripts', 'cv', 'waec', 'waecScratchCard', 'degreeCertificate', 'statementOfPurpose', 'academicReferenceLetter', 'professionalReferenceLetter'];

try {
  assert.equal((await request('/student/profile')).status, 401, 'unauthenticated profile access must fail');
  let response = await request('/student/profile', { headers: { Cookie: cookie } });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal((await response.json()).data.completion.isComplete, false);
  assert.equal((await request('/student/profile', { headers: { Cookie: cookie } }).then((res) => res.json()))  .data.completion.totalFields, 18);

    // currentStage is admin-assigned and no longer part of the student's completion rule.
  response = await jsonPatch({ dateOfBirth: '2000-01-01' });
  assert.equal(response.status, 200);
    assert.equal((await response.json()).data.completion.completedFields, 1);
  assert.equal(student.preservedField, 'must remain');

  response = await jsonPatch({ email: 'attacker@example.invalid' });
  assert.equal(response.status, 400);
  response = await jsonPatch({ studentId: otherStudent.id });
  assert.equal(response.status, 400);
  assert.equal(otherStudent.dateOfBirth, undefined);

  // mobileNumber, country and fullAddress are now editable via the profile patch.
  response = await jsonPatch({ mobileNumber: '+2348012345678', country: 'Ghana', fullAddress: '12 Independence Ave, Accra' });
  assert.equal(response.status, 200);
  assert.equal(student.mobileNumber, '+2348012345678');
  assert.equal(student.country, 'Ghana');
  assert.equal(student.fullAddress, '12 Independence Ave, Accra');
  assert.equal(otherStudent.mobileNumber, undefined, 'cross-student data must remain isolated');
  assert.equal(otherStudent.fullAddress, undefined, 'cross-student data must remain isolated');

  const validForm = new FormData();
  Object.entries(completeFields).forEach(([field, value]) => validForm.append(field, value));
  validForm.append('passport', new Blob([pdfBytes()], { type: 'application/pdf' }), 'passport.pdf');
  validForm.append('transcripts', new Blob([pngBytes()], { type: 'image/png' }), 'transcript.png');
  validForm.append('cv', new Blob([pdfBytes()], { type: 'application/pdf' }), 'cv.pdf');
  validForm.append('waec', new Blob([pdfBytes()], { type: 'application/pdf' }), 'waec.pdf');
  validForm.append('waecScratchCard', new Blob([jpegBytes()], { type: 'image/jpeg' }), 'scratch-card.jpg');
  validForm.append('degreeCertificate', new Blob([pngBytes()], { type: 'image/png' }), 'degree.png');
  validForm.append('statementOfPurpose', new Blob([docxBytes()], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), 'sop.docx');
  validForm.append('academicReferenceLetter', new Blob([pdfBytes()], { type: 'application/pdf' }), 'academic-ref.pdf');
  validForm.append('professionalReferenceLetter', new Blob([webpBytes()], { type: 'image/webp' }), 'professional-ref.webp');
  response = await request('/student/profile', { method: 'PATCH', headers: { Cookie: cookie }, body: validForm });
  assert.equal(response.status, 200);
  const completed = (await response.json()).data;
  assert.equal(completed.completion.isComplete, true);
  assert.equal(completed.completion.percentage, 100);
  assert.equal(student.profileCompleted, true);
  assert.equal(student.uploads.passport, 'passport.pdf');
  assert.equal(student.uploads.waecScratchCard, 'scratch-card.jpg');
  assert.equal(student.uploads.professionalReferenceLetter, 'professional-ref.webp');
  assert.equal(store.studentFiles.length, allDocumentFields.length);
  assert.ok(store.studentFiles.every((file) => file.studentId === studentId), 'uploaded files must be scoped to the uploading student');
  assert.equal(student.preservedField, 'must remain');

  // currentStage is admin-only application progress; students must not be able to change it here.
  response = await jsonPatch({ currentStage: 'application_submitted' });
  assert.equal(response.status, 400);
  assert.equal(student.currentStage, 'documents_review', 'student must not be able to change their own currentStage');

  const invalidTypeForm = new FormData();
  invalidTypeForm.append('passport', new Blob(['bad'], { type: 'text/plain' }), 'passport.txt');
  response = await request('/student/profile', { method: 'PATCH', headers: { Cookie: cookie }, body: invalidTypeForm });
  assert.equal(response.status, 400);

  // WAEC Scratch Card must only accept images: a declared-PDF upload is rejected before content sniffing runs.
  const scratchCardPdfForm = new FormData();
  scratchCardPdfForm.append('waecScratchCard', new Blob([pdfBytes()], { type: 'application/pdf' }), 'scratch-card.pdf');
  response = await request('/student/profile', { method: 'PATCH', headers: { Cookie: cookie }, body: scratchCardPdfForm });
  assert.equal(response.status, 400);

  // A spoofed mimetype (declared image/png, but the bytes are not a real PNG) must be rejected by content sniffing.
  const spoofedScratchCardForm = new FormData();
  spoofedScratchCardForm.append('waecScratchCard', new Blob(['not-a-real-png'], { type: 'image/png' }), 'scratch-card.png');
  response = await request('/student/profile', { method: 'PATCH', headers: { Cookie: cookie }, body: spoofedScratchCardForm });
  assert.equal(response.status, 400);

  const oversizedForm = new FormData();
  oversizedForm.append('passport', new Blob([oversizedPdfBytes()], { type: 'application/pdf' }), 'large.pdf');
  response = await request('/student/profile', { method: 'PATCH', headers: { Cookie: cookie }, body: oversizedForm });
  assert.equal(response.status, 400);

  // The 5MB limit also applies to the new document fields.
  const oversizedScratchCardForm = new FormData();
  oversizedScratchCardForm.append('waecScratchCard', new Blob([Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(5 * 1024 * 1024 + 1, 0)])], { type: 'image/jpeg' }), 'large.jpg');
  response = await request('/student/profile', { method: 'PATCH', headers: { Cookie: cookie }, body: oversizedScratchCardForm });
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
