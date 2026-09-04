import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { env, isProduction } from '../config/env.js';
import {
  ADMIN_ROLE,
  clearOtherBootstrapAdmins,
  findAdminByEmail,
  findBootstrapAdmin,
  insertAdmin,
  migrateAdminRoles,
  updateAdminById,
} from '../models/adminModel.js';
import { isValidEmail, normalizeEmail } from '../middleware/http.js';

export const bootstrapAdminFromEnv = async () => {
  await migrateAdminRoles(env.bootstrapAdminEmail);

  if (!env.bootstrapAdminEmail || !env.bootstrapAdminPassword) return;

  if (!isValidEmail(env.bootstrapAdminEmail)) {
    if (isProduction) throw new Error('ADMIN_BOOTSTRAP_EMAIL is not a valid email');
    console.warn('ADMIN_BOOTSTRAP_EMAIL is not a valid email. Skipping admin bootstrap.');
    return;
  }

  if (env.bootstrapAdminPassword.length < 12) {
    if (isProduction) throw new Error('ADMIN_BOOTSTRAP_PASSWORD must be at least 12 characters');
    console.warn('ADMIN_BOOTSTRAP_PASSWORD must be at least 12 characters. Skipping admin bootstrap.');
    return;
  }

  const email = normalizeEmail(env.bootstrapAdminEmail);
  const existingAdmin = await findAdminByEmail(email) || await findBootstrapAdmin();
  if (existingAdmin) {
    const passwordMatches = await bcrypt.compare(env.bootstrapAdminPassword, existingAdmin.passwordHash);
    const patch = {};

    if (!passwordMatches) {
      patch.passwordHash = await bcrypt.hash(env.bootstrapAdminPassword, 12);
    }

    if (!existingAdmin.isActive) {
      patch.isActive = true;
    }

    if (env.bootstrapAdminName && existingAdmin.name !== env.bootstrapAdminName) {
      patch.name = env.bootstrapAdminName;
    }

    if (existingAdmin.email !== email) {
      patch.email = email;
    }

    if (existingAdmin.role !== ADMIN_ROLE.SUPER_ADMIN) patch.role = ADMIN_ROLE.SUPER_ADMIN;
    if (existingAdmin.isBootstrapAdmin !== true) patch.isBootstrapAdmin = true;
    if (existingAdmin.passwordChangeRequired) patch.passwordChangeRequired = false;

    if (patch.passwordHash) {
      patch.passwordChangedAt = new Date();
    }

    if (Object.keys(patch).length) {
      await updateAdminById(existingAdmin._id, patch);
      console.log('Bootstrap admin updated from environment variables.');
    }

    await clearOtherBootstrapAdmins(existingAdmin._id);
    return;
  }

  const now = new Date();
  await insertAdmin({
    _id: new ObjectId(),
    name: env.bootstrapAdminName || 'Super Admin',
    email,
    passwordHash: await bcrypt.hash(env.bootstrapAdminPassword, 12),
    role: ADMIN_ROLE.SUPER_ADMIN,
    isActive: true,
    isBootstrapAdmin: true,
    passwordChangeRequired: false,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
  });

  console.log('Bootstrap admin created from environment variables.');
};
