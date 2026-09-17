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
await database.connectDatabase();
assert.equal(database.isUsingMemoryStore(), true);
const store = database.getMemoryStore();
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
  ...credentials, fullName: 'Test Student', mobileNumber: '12345678', country: 'Nigeria',
  targetCountry: 'United Kingdom', targetUniversity: 'Test University',
  courseOfStudy: 'Computing', intakeSession: 'Sept 2026', consent: true,
};
const request = (path, { body, cookie, ...options } = {}) => fetch(`${baseUrl}/api${path}`, {
  ...options,
  headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...options.headers },
  ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}),
});
const multipartRequest = (path, body) => fetch(`${baseUrl}/api${path}`, {
  method: 'POST',
  body,
});
const createMultipartRegistration = (email, files) => {
  const form = new FormData();
  Object.entries({
    ...registration,
    email,
  }).forEach(([field, value]) => form.append(field, String(value)));
  Object.entries(files).forEach(([field, file]) => form.append(field, file.blob, file.filename));
  return form;
};
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
  assert.equal((await request('/register', { body: registration })).status, 201);
  assert.equal(store.studentSessions.length, 0, 'registration must not authenticate');
  assert.equal((await request('/student/me')).status, 401);
  assert.notEqual(store.students[0].password, credentials.password);
  const uploadedRegistration = createMultipartRegistration('uploaded@example.invalid', {
    passport: { blob: new Blob(['passport-bytes'], { type: 'application/pdf' }), filename: 'passport.pdf' },
    transcripts: { blob: new Blob(['transcript-bytes'], { type: 'image/png' }), filename: 'transcript.png' },
    cv: { blob: new Blob(['cv-bytes'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), filename: 'cv.docx' },
  });
  assert.equal((await multipartRequest('/register', uploadedRegistration)).status, 201);
  const uploadedStudent = store.students.find((student) => student.email === 'uploaded@example.invalid');
  assert.deepEqual(uploadedStudent.uploads, {
    passport: 'passport.pdf',
    transcripts: 'transcript.png',
    cv: 'cv.docx',
  });
  assert.equal(store.studentFiles.length, 3);
  assert.deepEqual(store.studentFiles.map((file) => file.data.toString()).sort(), ['cv-bytes', 'passport-bytes', 'transcript-bytes']);
  const invalidType = createMultipartRegistration('invalid-file@example.invalid', {
    passport: { blob: new Blob(['not-an-image'], { type: 'text/plain' }), filename: 'passport.txt' },
  });
  assert.equal((await multipartRequest('/register', invalidType)).status, 400);
  const oversized = createMultipartRegistration('large-file@example.invalid', {
    passport: { blob: new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: 'application/pdf' }), filename: 'large.pdf' },
  });
  assert.equal((await multipartRequest('/register', oversized)).status, 400);
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
