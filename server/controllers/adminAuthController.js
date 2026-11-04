import bcrypt from 'bcryptjs';
import {
  findAdminById,
  findAdminByEmail,
  removeAdminSession,
  revokeAllAdminSessions,
  sanitizeAdmin,
  updateAdminLastLogin,
} from '../models/adminModel.js';
import { logActivity } from '../services/activityLogService.js';
import { issueAdminSession, clearAdminAuthCookie, setAdminAuthCookie } from '../middleware/adminAuth.js';
import { AppError, isValidEmail, normalizeEmail, sendSuccess } from '../middleware/http.js';
import { env } from '../config/env.js';
import { claimCooldown, incrementCounter, resetCounter } from '../services/securityCounterService.js';
import { maskIp, sendAdminSecurityAlert } from '../services/adminSecurityAlertService.js';
import {
  LOGIN_FAILURE_WINDOW_MS,
  computeLoginDelayMs,
  delayLogin,
  getDummyPasswordHash,
} from '../services/adminLoginProtection.js';

const INVALID_LOGIN_MESSAGE = 'Invalid email or password';

const recordFailedLogin = async (req, email, admin) => {
  const ip = req.ip || 'unknown';
  // Per IP+email counter drives the delay; the cross-IP account counter drives the alert only (never a block).
  const failures = await incrementCounter(`admin-login-fail:${ip}:${email}`, LOGIN_FAILURE_WINDOW_MS);
  const accountFailures = await incrementCounter(`admin-login-fail-acct:${email}`, LOGIN_FAILURE_WINDOW_MS);

  if (admin) {
    // Throttled so repeated failures cannot flood the activity log.
    if (await claimCooldown(`admin-fail-log:${admin._id}:${ip}`, 60 * 1000)) {
      await logActivity({
        adminId: admin._id,
        actorEmail: admin.email,
        action: 'admin_login_failure',
        resource: 'admin',
        resourceId: admin._id,
        details: { reason: admin.isActive ? 'invalid_credentials' : 'inactive_account', network: maskIp(ip), failures },
      });
    }
    if (admin.isActive && accountFailures >= env.adminLoginAlertThreshold) {
      void sendAdminSecurityAlert('failed_logins', {
        to: admin.email, accountId: admin._id.toString(), name: admin.name, ip, attempts: accountFailures,
      });
    }
  } else if (await claimCooldown(`admin-unknown-log:${ip}`, LOGIN_FAILURE_WINDOW_MS)) {
    // One entry per source per window; the attacker-supplied address is deliberately not stored.
    await logActivity({
      action: 'admin_login_failure',
      resource: 'admin',
      details: { reason: 'invalid_credentials', network: maskIp(ip), failures },
    });
  }

  await delayLogin(computeLoginDelayMs(failures));
};

export const adminLogin = async (req, res) => {
  const { email, password } = req.body;
  if (!email || typeof password !== 'string' || !password || password.length > 1024 || !isValidEmail(email)) {
    throw new AppError('Valid email and password are required', 400);
  }

  const normalizedEmail = normalizeEmail(email);
  const admin = await findAdminByEmail(normalizedEmail);

  // Always one bcrypt comparison of the same cost, whether or not the account exists or is active.
  const passwordMatches = await bcrypt.compare(password, admin?.passwordHash || await getDummyPasswordHash());
  if (!admin || !admin.isActive || !passwordMatches) {
    await recordFailedLogin(req, normalizedEmail, admin);
    throw new AppError(INVALID_LOGIN_MESSAGE, 401);
  }

  await resetCounter(`admin-login-fail:${req.ip || 'unknown'}:${normalizedEmail}`, LOGIN_FAILURE_WINDOW_MS);

  await updateAdminLastLogin(admin._id);
  await logActivity({
    adminId: admin._id,
    actorEmail: admin.email,
    action: 'admin_login',
    resource: 'admin',
    resourceId: admin._id,
  });

  setAdminAuthCookie(res, await issueAdminSession(admin));

  sendSuccess(res, {
    message: 'Admin login successful',
    data: {
      admin: sanitizeAdmin({ ...admin, lastLoginAt: new Date(), updatedAt: new Date() }),
    },
  });
};

export const adminLogout = async (req, res) => {
  // Revokes only this browser's session; tokens from before the upgrade have no id and simply expire.
  if (req.adminSession?.jti) await removeAdminSession(req.admin.id, req.adminSession.jti);

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

export const adminLogoutAll = async (req, res) => {
  const { password } = req.body;
  if (typeof password !== 'string' || !password) {
    throw new AppError('Your password is required to sign out everywhere', 400);
  }

  const admin = await findAdminById(req.admin.id);
  if (!admin) throw new AppError('Admin account is unavailable', 404);

  if (!(await bcrypt.compare(password, admin.passwordHash))) {
    await logActivity({
      adminId: admin._id,
      actorEmail: admin.email,
      action: 'admin_sign_out_everywhere_failure',
      resource: 'admin',
      resourceId: admin._id,
      details: { reason: 'incorrect_password' },
    });
    throw new AppError('Password is incorrect', 401);
  }

  await revokeAllAdminSessions(admin._id);
  await logActivity({
    adminId: admin._id,
    actorEmail: admin.email,
    action: 'admin_sign_out_everywhere',
    resource: 'admin',
    resourceId: admin._id,
  });

  clearAdminAuthCookie(res);
  sendSuccess(res, {
    message: 'Signed out of all devices. Please sign in again.',
    data: { reauthenticate: true },
  });
};

export const getAdminMe = (req, res) => {
  sendSuccess(res, {
    message: 'Authenticated admin profile',
    data: { admin: req.admin },
  });
};
