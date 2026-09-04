process.env.NODE_ENV = 'development';
process.env.MONGODB_URI = '';
process.env.JWT_SECRET = 'RbacSmokeTestJwtSecretValue1234567890';
process.env.ADMIN_BOOTSTRAP_EMAIL = 'super@example.invalid';
process.env.ADMIN_BOOTSTRAP_PASSWORD = 'SuperPassword123';
process.env.ADMIN_BOOTSTRAP_NAME = 'Smoke Super';

const database = await import('./config/database.js');
const { default: express } = await import('express');
const { default: bcrypt } = await import('bcryptjs');
const { ObjectId } = await import('mongodb');
const { bootstrapAdminFromEnv } = await import('./services/adminBootstrapService.js');
const { ADMIN_ROLE, findAdminByEmail, sanitizeAdmin, migrateAdminRoles } = await import('./models/adminModel.js');
const { createAdminToken, requireAdmin, requireRole } = await import('./middleware/adminAuth.js');
const { default: adminRoutes } = await import('./routes/adminRoutes.js');
const { errorHandler } = await import('./middleware/errorHandler.js');
const { adminLogin } = await import('./controllers/adminAuthController.js');
const { createAdmin, resetAdminPassword, deleteAdminAccount, updateAdminAccount } = await import('./controllers/adminManagementController.js');
const { updateAdminPassword } = await import('./controllers/adminSettingsController.js');

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const mockRes = () => {
  const res = {
    statusCode: 200,
    body: null,
    cookies: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    cookie(name, value) {
      this.cookies[name] = value;
      return this;
    },
    clearCookie(name) {
      delete this.cookies[name];
      return this;
    },
  };
  return res;
};

const expectRejectStatus = async (promise, statusCode, message) => {
  try {
    await promise;
  } catch (error) {
    assert(error.statusCode === statusCode, message);
    return error;
  }
  throw new Error(message);
};

const callController = async (handler, req = {}) => {
  const res = mockRes();
  await handler({
    body: {},
    params: {},
    query: {},
    headers: {},
    ...req,
  }, res);
  return res;
};

const callMiddleware = (middleware, req = {}) => new Promise((resolve, reject) => {
  middleware({
    body: {},
    params: {},
    query: {},
    headers: {},
    method: 'GET',
    originalUrl: '/api/admin/test',
    ...req,
  }, {}, (error) => {
    if (error) {
      reject(error);
      return;
    }
    resolve();
  });
});

const assertRoleAllowed = async (admin, roles, expectedAllowed, message) => {
  try {
    await callMiddleware(requireRole(...roles), { admin: sanitizeAdmin(admin) });
    assert(expectedAllowed, message);
  } catch (error) {
    if (expectedAllowed) throw error;
    assert(error.statusCode === 403, message);
  }
};

const startTestServer = () => new Promise((resolve) => {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRoutes);
  app.use(errorHandler);
  const server = app.listen(0, () => {
    resolve({
      server,
      baseUrl: `http://127.0.0.1:${server.address().port}`,
    });
  });
});

const parseCookie = (response) => response.headers.get('set-cookie')?.split(';')[0] || '';

await database.connectDatabase();
const store = database.getMemoryStore();
store.admins.length = 0;
store.services.length = 0;
store.enquiries.length = 0;
store.testimonials.length = 0;
store.blogPosts.length = 0;
store.activityLogs.length = 0;

await bootstrapAdminFromEnv();
const superAdmin = await findAdminByEmail('super@example.invalid');
assert(superAdmin.role === ADMIN_ROLE.SUPER_ADMIN, 'bootstrap admin was not SUPER_ADMIN');

let res = await callController(adminLogin, { body: { email: 'super@example.invalid', password: 'SuperPassword123' } });
assert(res.body.success === true, 'SUPER_ADMIN could not log in');

const { server, baseUrl } = await startTestServer();
try {
  const loginResponse = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'super@example.invalid', password: 'SuperPassword123' }),
  });
  const superAdminCookie = parseCookie(loginResponse);
  assert(loginResponse.status === 200 && superAdminCookie, 'SUPER_ADMIN endpoint login did not return an auth cookie');

  let endpointResponse = await fetch(`${baseUrl}/api/admin/admins`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: superAdminCookie },
    body: JSON.stringify({ name: 'Endpoint Admin', email: 'endpoint-admin@example.invalid', temporaryPassword: 'EndpointPassword123' }),
  });
  let endpointBody = await endpointResponse.json();
  assert(endpointResponse.status === 201, `SUPER_ADMIN create-admin endpoint failed: ${endpointResponse.status} ${endpointBody.message}`);
  assert(endpointBody.data?.admin?.role === ADMIN_ROLE.ADMIN, 'create-admin endpoint did not force ADMIN role');
  assert(!('passwordHash' in endpointBody.data.admin) && !('password' in endpointBody.data.admin), 'create-admin endpoint returned sensitive password data');
  const endpointAdmin = await findAdminByEmail('endpoint-admin@example.invalid');
  assert(endpointAdmin.createdBy instanceof ObjectId, 'createdBy was not stored as an ObjectId');
  assert(await bcrypt.compare('EndpointPassword123', endpointAdmin.passwordHash), 'create-admin endpoint did not store a bcrypt password hash');

  endpointResponse = await fetch(`${baseUrl}/api/admin/admins`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: superAdminCookie },
    body: JSON.stringify({ name: 'Endpoint Admin', email: 'endpoint-admin@example.invalid', temporaryPassword: 'EndpointPassword123' }),
  });
  endpointBody = await endpointResponse.json();
  assert(endpointResponse.status === 409, `duplicate admin email returned ${endpointResponse.status} instead of 409: ${endpointBody.message}`);

  endpointResponse = await fetch(`${baseUrl}/api/admin/admins`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'No Auth', email: 'no-auth@example.invalid', temporaryPassword: 'NoAuthPassword123' }),
  });
  assert(endpointResponse.status === 401, `unauthenticated create-admin returned ${endpointResponse.status} instead of 401`);
} finally {
  await new Promise((resolve) => server.close(resolve));
}

res = await callController(createAdmin, {
  admin: sanitizeAdmin(superAdmin),
  body: { name: 'Smoke Admin', email: 'admin@example.invalid', temporaryPassword: 'AdminPassword123' },
});
assert(res.statusCode === 201, 'SUPER_ADMIN could not create ADMIN');

let admin = await findAdminByEmail('admin@example.invalid');
assert(admin.role === ADMIN_ROLE.ADMIN, 'created account was not ADMIN');
res = await callController(adminLogin, { body: { email: 'admin@example.invalid', password: 'AdminPassword123' } });
assert(res.body.success === true, 'ADMIN could not log in');

await assertRoleAllowed(superAdmin, [ADMIN_ROLE.SUPER_ADMIN], true, 'SUPER_ADMIN could not access Admin Management');
await assertRoleAllowed(admin, [ADMIN_ROLE.SUPER_ADMIN], false, 'ADMIN did not receive 403 from Admin Management role check');
await assertRoleAllowed(superAdmin, [ADMIN_ROLE.ADMIN, ADMIN_ROLE.SUPER_ADMIN], true, 'SUPER_ADMIN could not access shared admin route');
await assertRoleAllowed(admin, [ADMIN_ROLE.ADMIN, ADMIN_ROLE.SUPER_ADMIN], true, 'ADMIN could not access shared admin route');
await assertRoleAllowed(admin, [ADMIN_ROLE.SUPER_ADMIN], false, 'ADMIN did not receive 403 for Services/Enquiries role check');

await assertRoleAllowed(admin, [ADMIN_ROLE.SUPER_ADMIN], false, 'ADMIN could create another ADMIN');

res = await callController(resetAdminPassword, {
  admin: sanitizeAdmin(superAdmin),
  params: { id: admin._id.toString() },
  body: { newPassword: 'ResetPassword123' },
});
assert(res.body.success === true, 'SUPER_ADMIN could not reset ADMIN password');
admin = await findAdminByEmail('admin@example.invalid');
assert(await bcrypt.compare('ResetPassword123', admin.passwordHash), 'ADMIN reset password was not hashed and stored');

await assertRoleAllowed(admin, [ADMIN_ROLE.SUPER_ADMIN], false, 'ADMIN could reset another user password');

const oldToken = createAdminToken(admin);
await callController(updateAdminPassword, {
  admin: sanitizeAdmin(admin),
  body: {
    currentPassword: 'ResetPassword123',
    newPassword: 'OwnPassword123',
    confirmPassword: 'OwnPassword123',
  },
});
admin = await findAdminByEmail('admin@example.invalid');
assert(await bcrypt.compare('OwnPassword123', admin.passwordHash), 'ADMIN could not change own password');
await expectRejectStatus(callMiddleware(requireAdmin, {
  headers: { cookie: `educon_admin_token=${oldToken}` },
}), 401, 'old JWT was not invalidated after password change');

await expectRejectStatus(callController(updateAdminAccount, {
  admin: sanitizeAdmin(superAdmin),
  params: { id: superAdmin._id.toString() },
  body: { isActive: false },
}), 403, 'last SUPER_ADMIN could be deactivated');

await expectRejectStatus(callController(deleteAdminAccount, {
  admin: sanitizeAdmin(superAdmin),
  params: { id: superAdmin._id.toString() },
}), 403, 'bootstrap SUPER_ADMIN could be deleted');

store.admins.push({
  _id: new ObjectId(),
  name: 'Legacy Admin',
  email: 'legacy@example.invalid',
  passwordHash: await bcrypt.hash('LegacyPassword123', 12),
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});
await migrateAdminRoles('super@example.invalid');
const legacyAdmin = await findAdminByEmail('legacy@example.invalid');
assert(legacyAdmin.role === ADMIN_ROLE.ADMIN, 'legacy admin without role was not migrated to ADMIN');

assert(store.activityLogs.some((log) => log.action === 'admin_created'), 'admin creation was not logged');
assert(store.activityLogs.some((log) => log.action === 'admin_password_reset'), 'admin password reset was not logged');
assert(store.activityLogs.some((log) => log.action === 'admin_password_changed'), 'own password change was not logged');

console.log('RBAC smoke checks passed');
