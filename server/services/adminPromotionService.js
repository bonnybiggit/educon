import { ADMIN_ROLE, findAdminByEmail, findAdmins, normalizeAdminRole, revokeAllAdminSessions } from '../models/adminModel.js';
import { logActivity } from './activityLogService.js';
import { isValidEmail, normalizeEmail } from '../middleware/http.js';

// Read-only: validates the promotion and reports what would happen. Throws when it must not proceed.
export const inspectPromotion = async ({ email, allowExistingSuperAdmin = false }) => {
  const target = normalizeEmail(email);
  const admin = isValidEmail(target) ? await findAdminByEmail(target) : null;
  if (!admin) throw new Error('No administrator account matches that email.');
  if (admin.isActive !== true) throw new Error('The account is not active; refusing to promote it.');
  if (normalizeAdminRole(admin.role) === ADMIN_ROLE.SUPER_ADMIN && admin.role === ADMIN_ROLE.SUPER_ADMIN) {
    throw new Error('The account is already a super admin. Nothing to do.');
  }

  const existingSuperAdmins = (await findAdmins())
    .filter((item) => item.role === ADMIN_ROLE.SUPER_ADMIN && item.isActive === true)
    .map((item) => ({ id: item._id.toString(), email: item.email }));
  if (existingSuperAdmins.length && !allowExistingSuperAdmin) {
    throw new Error(`${existingSuperAdmins.length} active super admin account(s) already exist; refusing. Use --allow-existing-super-admin only if you intend to add another.`);
  }
  return { admin, existingSuperAdmins };
};

// Changes only role, sessions/sessionVersion (revoked in one atomic update) and updatedAt, then audits it.
export const promoteAdminToSuperAdmin = async ({ email, allowExistingSuperAdmin = false }) => {
  const { admin } = await inspectPromotion({ email, allowExistingSuperAdmin });
  const updated = await revokeAllAdminSessions(admin._id, { role: ADMIN_ROLE.SUPER_ADMIN });
  if (!updated || updated.role !== ADMIN_ROLE.SUPER_ADMIN) throw new Error('The role could not be updated.');
  await logActivity({
    adminId: admin._id,
    actorEmail: admin.email,
    action: 'admin_promoted_to_super_admin_by_owner',
    resource: 'admin',
    resourceId: admin._id,
    details: { previousRole: admin.role ?? null, newRole: ADMIN_ROLE.SUPER_ADMIN, sessionsRevoked: true },
  });
  return { id: admin._id.toString(), email: admin.email, previousRole: admin.role ?? null, role: updated.role };
};
