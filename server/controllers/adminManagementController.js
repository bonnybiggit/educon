import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import {
  ADMIN_ROLE,
  countActiveSuperAdmins,
  deleteAdminById,
  findAdminByEmail,
  findAdminById,
  findAdmins,
  sanitizeAdmin,
  updateAdminById,
  insertAdmin,
} from '../models/adminModel.js';
import { logActivity } from '../services/activityLogService.js';
import {
  AppError,
  cleanString,
  isValidEmail,
  normalizeEmail,
  sendSuccess,
} from '../middleware/http.js';

const isStrongPassword = (password) => (
  typeof password === 'string'
  && password.length >= 12
  && /[a-z]/.test(password)
  && /[A-Z]/.test(password)
  && /\d/.test(password)
);

const assertAdminId = (id) => {
  if (!ObjectId.isValid(id)) throw new AppError('Invalid admin id', 400);
};

const ensureMutableAdmin = async (targetAdmin, { allowBootstrap = false } = {}) => {
  if (!targetAdmin) throw new AppError('Admin account not found', 404);
  if (targetAdmin.isBootstrapAdmin && !allowBootstrap) {
    throw new AppError('The primary bootstrap super admin cannot be changed by this action', 403);
  }
};

const ensureNotLastActiveSuperAdmin = async (targetAdmin) => {
  if (targetAdmin.isActive && targetAdmin.role === ADMIN_ROLE.SUPER_ADMIN) {
    const remainingSuperAdmins = await countActiveSuperAdmins(targetAdmin._id);
    if (remainingSuperAdmins < 1) {
      throw new AppError('The last active super admin cannot be removed or deactivated', 403);
    }
  }
};

export const getAdmins = async (_req, res) => {
  const admins = await findAdmins();
  sendSuccess(res, {
    message: 'Admin accounts fetched',
    data: { admins: admins.map(sanitizeAdmin) },
  });
};

export const createAdmin = async (req, res) => {
  const name = cleanString(req.body.name);
  const email = normalizeEmail(req.body.email);
  const temporaryPassword = req.body.temporaryPassword;

  if (name.length < 2 || name.length > 100) {
    throw new AppError('Name must be between 2 and 100 characters', 400);
  }
  if (!isValidEmail(email)) {
    throw new AppError('A valid email is required', 400);
  }
  if (!isStrongPassword(temporaryPassword)) {
    throw new AppError('Temporary password must be at least 12 characters and include uppercase, lowercase, and a number', 400);
  }

  const existingAdmin = await findAdminByEmail(email);
  if (existingAdmin) throw new AppError('That email is already in use', 409);

  const now = new Date();
  const admin = {
    _id: new ObjectId(),
    name,
    email,
    passwordHash: await bcrypt.hash(temporaryPassword, 12),
    role: ADMIN_ROLE.ADMIN,
    isActive: true,
    isBootstrapAdmin: false,
    passwordChangeRequired: true,
    createdBy: new ObjectId(req.admin.id),
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
  };

  await insertAdmin(admin);
  await logActivity({
    adminId: req.admin.id,
    actorEmail: req.admin.email,
    action: 'admin_created',
    resource: 'admin',
    resourceId: admin._id,
    details: { targetEmail: admin.email, role: admin.role },
  });

  sendSuccess(res, {
    statusCode: 201,
    message: 'Admin account created',
    data: { admin: sanitizeAdmin(admin) },
  });
};

export const updateAdminAccount = async (req, res) => {
  assertAdminId(req.params.id);
  const targetAdmin = await findAdminById(req.params.id);
  await ensureMutableAdmin(targetAdmin, { allowBootstrap: true });

  const patch = {};
  if (req.body.name !== undefined) {
    const name = cleanString(req.body.name);
    if (name.length < 2 || name.length > 100) throw new AppError('Name must be between 2 and 100 characters', 400);
    patch.name = name;
  }
  if (req.body.email !== undefined) {
    const email = normalizeEmail(req.body.email);
    if (!isValidEmail(email)) throw new AppError('A valid email is required', 400);
    const existingAdmin = await findAdminByEmail(email);
    if (existingAdmin && existingAdmin._id.toString() !== req.params.id) {
      throw new AppError('That email is already in use', 409);
    }
    patch.email = email;
  }
  if (req.body.isActive !== undefined) {
    if (typeof req.body.isActive !== 'boolean') throw new AppError('Account status must be a boolean', 400);
    if (targetAdmin.isBootstrapAdmin && req.body.isActive === false) {
      throw new AppError('The primary bootstrap super admin cannot be deactivated', 403);
    }
    if (req.body.isActive === false) await ensureNotLastActiveSuperAdmin(targetAdmin);
    patch.isActive = req.body.isActive;
  }

  if (!Object.keys(patch).length) throw new AppError('No valid fields to update', 400);

  const admin = await updateAdminById(req.params.id, patch);
  await logActivity({
    adminId: req.admin.id,
    actorEmail: req.admin.email,
    action: patch.isActive === false ? 'admin_deactivated' : patch.isActive === true ? 'admin_activated' : 'admin_updated',
    resource: 'admin',
    resourceId: req.params.id,
    details: { changedFields: Object.keys(patch), targetEmail: admin.email },
  });

  sendSuccess(res, {
    message: 'Admin account updated',
    data: { admin: sanitizeAdmin(admin) },
  });
};

export const resetAdminPassword = async (req, res) => {
  assertAdminId(req.params.id);
  const newPassword = req.body.newPassword;
  const targetAdmin = await findAdminById(req.params.id);
  await ensureMutableAdmin(targetAdmin);

  if (!isStrongPassword(newPassword)) {
    throw new AppError('New password must be at least 12 characters and include uppercase, lowercase, and a number', 400);
  }

  await updateAdminById(req.params.id, {
    passwordHash: await bcrypt.hash(newPassword, 12),
    passwordChangedAt: new Date(),
    passwordChangeRequired: true,
  });
  await logActivity({
    adminId: req.admin.id,
    actorEmail: req.admin.email,
    action: 'admin_password_reset',
    resource: 'admin',
    resourceId: req.params.id,
    details: { targetEmail: targetAdmin.email },
  });

  sendSuccess(res, { message: 'Admin password reset successfully' });
};

export const deleteAdminAccount = async (req, res) => {
  assertAdminId(req.params.id);
  const targetAdmin = await findAdminById(req.params.id);
  await ensureMutableAdmin(targetAdmin);
  await ensureNotLastActiveSuperAdmin(targetAdmin);

  if (targetAdmin._id.toString() === req.admin.id) {
    throw new AppError('You cannot delete your own admin account', 403);
  }

  await deleteAdminById(req.params.id);
  await logActivity({
    adminId: req.admin.id,
    actorEmail: req.admin.email,
    action: 'admin_deleted',
    resource: 'admin',
    resourceId: req.params.id,
    details: { targetEmail: targetAdmin.email, role: targetAdmin.role },
  });

  sendSuccess(res, { message: 'Admin account deleted' });
};
