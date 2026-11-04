import bcrypt from 'bcryptjs';
import {
  findAdminByEmail,
  findAdminById,
  sanitizeAdmin,
  revokeAllAdminSessions,
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
import { clearAdminAuthCookie } from '../middleware/adminAuth.js';
import { sendAdminSecurityAlert } from '../services/adminSecurityAlertService.js';

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

  const current = await findAdminById(req.admin.id);
  if (!current) throw new AppError('Admin account is unavailable', 404);

  const emailChanged = email !== normalizeEmail(current.email);
  if (!emailChanged) {
    const admin = await updateAdminById(req.admin.id, { name });
    sendSuccess(res, {
      message: 'Admin profile updated',
      data: { admin: sanitizeAdmin(admin) },
    });
    return;
  }

  const { currentPassword } = req.body;
  if (typeof currentPassword !== 'string' || !currentPassword) {
    throw new AppError('Current password is required to change your email', 400);
  }
  if (!(await bcrypt.compare(currentPassword, current.passwordHash))) {
    await logActivity({
      adminId: current._id,
      actorEmail: current.email,
      action: 'admin_email_change_failure',
      resource: 'admin',
      resourceId: current._id,
      details: { reason: 'incorrect_password' },
    });
    throw new AppError('Current password is incorrect', 401);
  }

  const existingAdmin = await findAdminByEmail(email);
  if (existingAdmin && existingAdmin._id.toString() !== req.admin.id) {
    throw new AppError('That email is already in use', 409);
  }

  const previousEmail = current.email;
  const admin = await revokeAllAdminSessions(req.admin.id, { name, email });
  if (!admin) throw new AppError('Admin account is unavailable', 404);

  await logActivity({
    adminId: current._id,
    actorEmail: email,
    action: 'admin_email_changed',
    resource: 'admin',
    resourceId: current._id,
    details: { previousEmail, newEmail: email },
  });

  const accountId = String(req.admin.id);
  void sendAdminSecurityAlert('email_changed_old', { to: previousEmail, accountId, name: current.name, ip: req.ip, newEmail: email });
  void sendAdminSecurityAlert('email_changed_new', { to: email, accountId, name: admin.name, ip: req.ip, previousEmail });

  clearAdminAuthCookie(res);
  sendSuccess(res, {
    message: 'Email updated. Please sign in again with your new email.',
    data: { admin: sanitizeAdmin(admin), reauthenticate: true },
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
  await revokeAllAdminSessions(req.admin.id, { passwordHash, passwordChangedAt: new Date(), passwordChangeRequired: false });
  await logActivity({
    adminId: req.admin.id,
    actorEmail: req.admin.email,
    action: 'admin_password_changed',
    resource: 'admin',
    resourceId: req.admin.id,
  });

  void sendAdminSecurityAlert('password_changed', { to: admin.email, accountId: String(req.admin.id), name: admin.name, ip: req.ip });

  clearAdminAuthCookie(res);
  sendSuccess(res, {
    message: 'Password updated. Please sign in again with your new password.',
    data: { reauthenticate: true },
  });
};
