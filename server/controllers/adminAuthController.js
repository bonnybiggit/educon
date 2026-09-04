import bcrypt from 'bcryptjs';
import { findAdminByEmail, sanitizeAdmin, updateAdminLastLogin } from '../models/adminModel.js';
import { logActivity } from '../services/activityLogService.js';
import { createAdminToken, clearAdminAuthCookie, setAdminAuthCookie } from '../middleware/adminAuth.js';
import { AppError, isValidEmail, normalizeEmail, sendSuccess } from '../middleware/http.js';

export const adminLogin = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password || !isValidEmail(email)) {
    throw new AppError('Valid email and password are required', 400);
  }

  const admin = await findAdminByEmail(normalizeEmail(email));
  if (!admin || !admin.isActive) {
    await logActivity({
      actorEmail: normalizeEmail(email),
      action: 'admin_login_failure',
      resource: 'admin',
      details: { reason: 'invalid_credentials_or_inactive' },
    });
    throw new AppError('Invalid email or password', 401);
  }

  const validPassword = await bcrypt.compare(password, admin.passwordHash);
  if (!validPassword) {
    await logActivity({
      adminId: admin._id,
      actorEmail: admin.email,
      action: 'admin_login_failure',
      resource: 'admin',
      resourceId: admin._id,
      details: { reason: 'invalid_credentials' },
    });
    throw new AppError('Invalid email or password', 401);
  }

  await updateAdminLastLogin(admin._id);
  await logActivity({
    adminId: admin._id,
    actorEmail: admin.email,
    action: 'admin_login',
    resource: 'admin',
    resourceId: admin._id,
  });

  setAdminAuthCookie(res, createAdminToken(admin));

  sendSuccess(res, {
    message: 'Admin login successful',
    data: {
      admin: sanitizeAdmin({ ...admin, lastLoginAt: new Date(), updatedAt: new Date() }),
    },
  });
};

export const adminLogout = async (req, res) => {
  await logActivity({
    adminId: req.admin.id,
    actorEmail: req.admin.email,
    action: 'admin_logout',
    resource: 'admin',
    resourceId: req.admin.id,
  });

  clearAdminAuthCookie(res);
  sendSuccess(res, { message: 'Admin logout successful' });
};

export const getAdminMe = (req, res) => {
  sendSuccess(res, {
    message: 'Authenticated admin profile',
    data: { admin: req.admin },
  });
};
