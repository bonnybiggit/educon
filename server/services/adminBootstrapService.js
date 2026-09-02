import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { env } from '../config/env.js';
import { findAdminByEmail, insertAdmin, updateAdminById } from '../models/adminModel.js';
import { isValidEmail, normalizeEmail } from '../middleware/http.js';

export const bootstrapAdminFromEnv = async () => {
  if (!env.bootstrapAdminEmail || !env.bootstrapAdminPassword) return;

  if (!isValidEmail(env.bootstrapAdminEmail)) {
    console.warn('ADMIN_BOOTSTRAP_EMAIL is not a valid email. Skipping admin bootstrap.');
    return;
  }

  if (env.bootstrapAdminPassword.length < 12) {
    console.warn('ADMIN_BOOTSTRAP_PASSWORD must be at least 12 characters. Skipping admin bootstrap.');
    return;
  }

  const email = normalizeEmail(env.bootstrapAdminEmail);
  const existingAdmin = await findAdminByEmail(email);
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

    if (Object.keys(patch).length) {
      await updateAdminById(existingAdmin._id, patch);
      console.log('Bootstrap admin updated from environment variables.');
    }

    return;
  }

  const now = new Date();
  await insertAdmin({
    _id: new ObjectId(),
    name: env.bootstrapAdminName || 'Super Admin',
    email,
    passwordHash: await bcrypt.hash(env.bootstrapAdminPassword, 12),
    role: 'super_admin',
    isActive: true,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
  });

  console.log('Bootstrap admin created from environment variables.');
};
