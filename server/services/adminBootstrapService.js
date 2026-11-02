import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { env } from '../config/env.js';
import {
  ADMIN_ROLE,
  countAdmins,
  insertAdmin,
} from '../models/adminModel.js';
import { isValidEmail, normalizeEmail } from '../middleware/http.js';

export const bootstrapAdminFromEnv = async () => {
  if (!env.bootstrapAdminEmail || !env.bootstrapAdminPassword) {
    if (env.bootstrapAdminEmail || env.bootstrapAdminPassword) {
      console.warn('Admin bootstrap skipped because both email and password are required.');
    }
    return;
  }

  if (!isValidEmail(env.bootstrapAdminEmail)) {
    console.warn('ADMIN_BOOTSTRAP_EMAIL is not a valid email. Skipping admin bootstrap.');
    return;
  }

  if (env.bootstrapAdminPassword.length < 12) {
    console.warn('ADMIN_BOOTSTRAP_PASSWORD must be at least 12 characters. Skipping admin bootstrap.');
    return;
  }

  if (await countAdmins() > 0) {
    console.log('Admin bootstrap skipped; existing admin accounts were preserved.');
    return;
  }

  const email = normalizeEmail(env.bootstrapAdminEmail);
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
