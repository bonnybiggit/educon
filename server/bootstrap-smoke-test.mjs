process.env.NODE_ENV = 'development';
process.env.MONGODB_URI = '';
process.env.ADMIN_BOOTSTRAP_EMAIL = 'bootstrap-test@example.invalid';
process.env.ADMIN_BOOTSTRAP_PASSWORD = 'BootstrapTestPassword123';
process.env.ADMIN_BOOTSTRAP_NAME = 'Bootstrap Test';

const database = await import('./config/database.js');
const { env } = await import('./config/env.js');
const { bootstrapAdminFromEnv } = await import('./services/adminBootstrapService.js');
const { default: bcrypt } = await import('bcryptjs');

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

await database.connectDatabase();
const store = database.getMemoryStore();
store.admins.length = 0;

await bootstrapAdminFromEnv();
assert(store.admins.length === 1, 'bootstrap admin was not created in an empty store');
const existingAdmin = store.admins[0];
assert(existingAdmin.email === 'bootstrap-test@example.invalid', 'bootstrap email was not set');
assert(existingAdmin.isBootstrapAdmin === true, 'created admin was not marked as bootstrap');
assert(await bcrypt.compare('BootstrapTestPassword123', existingAdmin.passwordHash), 'created password was not hashed correctly');

const originalAdmin = { ...existingAdmin };
env.bootstrapAdminEmail = 'different-admin@example.invalid';
env.bootstrapAdminPassword = 'DifferentBootstrapPassword123';
env.bootstrapAdminName = 'Changed Bootstrap Name';

await bootstrapAdminFromEnv();
assert(store.admins.length === 1, 'bootstrap created an admin while existing accounts were present');
assert(existingAdmin.email === originalAdmin.email, 'bootstrap changed the existing email');
assert(existingAdmin.name === originalAdmin.name, 'bootstrap changed the existing name');
assert(existingAdmin.passwordHash === originalAdmin.passwordHash, 'bootstrap changed the existing password hash');
assert(existingAdmin.role === originalAdmin.role, 'bootstrap changed the existing role');
assert(existingAdmin.isActive === originalAdmin.isActive, 'bootstrap changed the existing active state');
assert(existingAdmin.updatedAt === originalAdmin.updatedAt, 'bootstrap changed existing account metadata');
assert(await bcrypt.compare('BootstrapTestPassword123', existingAdmin.passwordHash), 'existing password no longer matches');
assert(!(await bcrypt.compare('DifferentBootstrapPassword123', existingAdmin.passwordHash)), 'new bootstrap password was applied to an existing account');

store.admins.length = 0;
env.bootstrapAdminEmail = '';
env.bootstrapAdminPassword = '';
await bootstrapAdminFromEnv();
assert(store.admins.length === 0, 'admin was created without explicit bootstrap credentials');

console.log('Bootstrap creation-only and existing-account preservation checks passed');
