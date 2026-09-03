process.env.NODE_ENV = 'development';
process.env.MONGODB_URI = '';
process.env.ADMIN_BOOTSTRAP_EMAIL = 'bootstrap-test@example.invalid';
process.env.ADMIN_BOOTSTRAP_PASSWORD = 'BootstrapTestPassword123';
process.env.ADMIN_BOOTSTRAP_NAME = 'Bootstrap Test';

const database = await import('./config/database.js');
const { env } = await import('./config/env.js');
const { bootstrapAdminFromEnv } = await import('./services/adminBootstrapService.js');
const { default: bcrypt } = await import('bcryptjs');
const { ObjectId } = await import('mongodb');

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

await database.connectDatabase();
const store = database.getMemoryStore();
store.admins.length = 0;

await bootstrapAdminFromEnv();
assert(store.admins.length === 1, 'bootstrap admin was not created');
assert(store.admins[0].email === 'bootstrap-test@example.invalid', 'bootstrap email was not set');
assert(store.admins[0].isBootstrapAdmin === true, 'created admin was not marked as bootstrap');
assert(await bcrypt.compare('BootstrapTestPassword123', store.admins[0].passwordHash), 'created password was not hashed correctly');

const firstId = store.admins[0]._id.toString();
const firstHash = store.admins[0].passwordHash;
env.bootstrapAdminEmail = 'bootstrap-reset@example.invalid';
env.bootstrapAdminPassword = 'BootstrapResetPassword123';
env.bootstrapAdminName = 'Bootstrap Reset';

await bootstrapAdminFromEnv();
assert(store.admins.length === 1, 'changed bootstrap credentials created a duplicate account');
assert(store.admins[0]._id.toString() === firstId, 'changed bootstrap credentials replaced the account instead of updating it');
assert(store.admins[0].email === 'bootstrap-reset@example.invalid', 'changed bootstrap email was not applied');
assert(store.admins[0].name === 'Bootstrap Reset', 'changed bootstrap name was not applied');
assert(store.admins[0].passwordHash !== firstHash, 'changed bootstrap password did not update the hash');
assert(await bcrypt.compare('BootstrapResetPassword123', store.admins[0].passwordHash), 'changed bootstrap password was not usable');
assert(!(await bcrypt.compare('BootstrapTestPassword123', store.admins[0].passwordHash)), 'old bootstrap password still matched after reset');

store.admins.length = 0;
const oldBootstrapHash = await bcrypt.hash('OldBootstrapPassword123', 12);
const targetHash = await bcrypt.hash('TargetOldPassword123', 12);
store.admins.push({
  _id: new ObjectId(),
  name: 'Old Bootstrap',
  email: 'old-bootstrap@example.invalid',
  passwordHash: oldBootstrapHash,
  role: 'super_admin',
  isActive: true,
  isBootstrapAdmin: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});
store.admins.push({
  _id: new ObjectId(),
  name: 'Target Admin',
  email: 'target-bootstrap@example.invalid',
  passwordHash: targetHash,
  role: 'admin',
  isActive: false,
  isBootstrapAdmin: false,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const oldBootstrapId = store.admins[0]._id.toString();
const targetId = store.admins[1]._id.toString();
env.bootstrapAdminEmail = 'target-bootstrap@example.invalid';
env.bootstrapAdminPassword = 'TargetResetPassword123';
env.bootstrapAdminName = 'Target Bootstrap';

await bootstrapAdminFromEnv();
const oldBootstrap = store.admins.find((admin) => admin._id.toString() === oldBootstrapId);
const targetAdmin = store.admins.find((admin) => admin._id.toString() === targetId);
assert(store.admins.length === 2, 'bootstrap reset removed existing admins');
assert(oldBootstrap.isBootstrapAdmin === false, 'old bootstrap marker was not cleared');
assert(targetAdmin.isBootstrapAdmin === true, 'configured email admin was not marked as bootstrap');
assert(targetAdmin.isActive === true, 'configured email admin was not activated');
assert(targetAdmin.role === 'admin', 'bootstrap reset changed an existing admin role');
assert(await bcrypt.compare('TargetResetPassword123', targetAdmin.passwordHash), 'configured email admin password was not reset');

await bootstrapAdminFromEnv();
const bootstrapAdmins = store.admins.filter((admin) => admin.isBootstrapAdmin === true);
assert(store.admins.length === 2, 'idempotent bootstrap duplicated admins');
assert(bootstrapAdmins.length === 1 && bootstrapAdmins[0]._id.toString() === targetId, 'idempotent bootstrap marker was not stable');

console.log('Bootstrap create, reset, changed-credentials, and idempotency checks passed');
