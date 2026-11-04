import bcrypt from 'bcryptjs';
import { findAdminByEmail, findAdmins, revokeAllAdminSessions } from '../models/adminModel.js';
import { logActivity } from './activityLogService.js';
import { maskEmail } from './adminSecurityAlertService.js';
import { isValidEmail, normalizeEmail } from '../middleware/http.js';

export const isStrongAdminPassword = (password) => typeof password === 'string'
  && password.length >= 12
  && password.length <= 128
  && /[a-z]/.test(password)
  && /[A-Z]/.test(password)
  && /\d/.test(password);

// Read-only: masked identities so the owner can see which sign-in email is actually stored.
export const listAdminsForRecovery = async () => (await findAdmins()).map((admin) => ({
  id: admin._id.toString(),
  email: maskEmail(admin.email),
  role: admin.role,
  isActive: admin.isActive !== false,
}));

// Owner-run recovery (requires server shell access and the production environment, never a public endpoint).
// It only ever updates an EXISTING account: _id, role, permissions and all other fields are preserved,
// every session is revoked, and nothing is created or deleted.
export const recoverAdminAccount = async ({ currentEmail, newEmail, newPassword }) => {
  const current = normalizeEmail(currentEmail);
  const admin = isValidEmail(current) ? await findAdminByEmail(current) : null;
  if (!admin) throw new Error('No administrator account matches that stored email.');
  if (!isStrongAdminPassword(newPassword)) {
    throw new Error('Password must be 12-128 characters with uppercase, lowercase and a number.');
  }

  const patch = {
    passwordHash: await bcrypt.hash(newPassword, 12),
    passwordChangedAt: new Date(),
    passwordChangeRequired: false,
  };

  const target = newEmail ? normalizeEmail(newEmail) : '';
  if (target && target !== admin.email) {
    if (!isValidEmail(target)) throw new Error('The new email address is not valid.');
    if (await findAdminByEmail(target)) throw new Error('That email address is already used by an administrator.');
    patch.email = target;
  }

  const updated = await revokeAllAdminSessions(admin._id, patch);
  if (!updated) throw new Error('The administrator account could not be updated.');
  await logActivity({
    adminId: admin._id,
    actorEmail: patch.email || admin.email,
    action: 'admin_account_recovered_by_owner',
    resource: 'admin',
    resourceId: admin._id,
    details: { emailChanged: Boolean(patch.email) },
  });
  return { id: admin._id.toString(), emailChanged: Boolean(patch.email), role: updated.role };
};
