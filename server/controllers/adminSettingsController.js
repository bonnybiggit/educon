import bcrypt from 'bcryptjs';
import {
  findAdminByEmail,
  findAdminById,
  sanitizeAdmin,
  updateAdminById,
} from '../models/adminModel.js';
import {
  AppError,
  cleanString,
  isValidEmail,
  normalizeEmail,
  sendSuccess,
} from '../middleware/http.js';
import { logActivity } from '../services/activityLogService.js';

const isStrongPassword = (password) => (
  typeof password === 'string'
  && password.length >= 12
  && /[a-z]/.test(password)
  && /[A-Z]/.test(password)
  && /\d/.test(password)
);

export const getAdminSettings = async (req, res) => {
  const admin = await findAdminById(req.admin.id);
  if (!admin) throw new AppError('Admin account is unavailable', 404);

  sendSuccess(res, {
    message: 'Admin settings retrieved',
    data: { admin: sanitizeAdmin(admin) },
  });
};

export const updateAdminProfile = async (req, res) => {
  const name = cleanString(req.body.name);
  const email = normalizeEmail(req.body.email);

  if (name.length < 2 || name.length > 100) {
    throw new AppError('Name must be between 2 and 100 characters', 400);
  }
  if (!isValidEmail(email)) {
    throw new AppError('A valid email is required', 400);
  }

  const existingAdmin = await findAdminByEmail(email);
  if (existingAdmin && existingAdmin._id.toString() !== req.admin.id) {
    throw new AppError('That email is already in use', 409);
  }

  const admin = await updateAdminById(req.admin.id, { name, email });
  if (!admin) throw new AppError('Admin account is unavailable', 404);

  sendSuccess(res, {
    message: 'Admin profile updated',
    data: { admin: sanitizeAdmin(admin) },
  });
};

export const updateAdminPassword = async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  if (!currentPassword || !newPassword || !confirmPassword) {
    throw new AppError('All password fields are required', 400);
  }
  if (!isStrongPassword(newPassword)) {
    throw new AppError('New password must be at least 12 characters and include uppercase, lowercase, and a number', 400);
  }
  if (newPassword !== confirmPassword) {
    throw new AppError('New passwords do not match', 400);
  }

  const admin = await findAdminById(req.admin.id);
  if (!admin || !(await bcrypt.compare(currentPassword, admin.passwordHash))) {
    throw new AppError('Current password is incorrect', 401);
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await updateAdminById(req.admin.id, { passwordHash, passwordChangedAt: new Date(), passwordChangeRequired: false });
  await logActivity({
    adminId: req.admin.id,
    actorEmail: req.admin.email,
    action: 'admin_password_changed',
    resource: 'admin',
    resourceId: req.admin.id,
  });

  sendSuccess(res, { message: 'Password updated successfully' });
};
