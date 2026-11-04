import bcrypt from 'bcryptjs';
import { findAdminByEmail, revokeAllAdminSessions } from '../models/adminModel.js';
import {
  consumeAdminPasswordReset,
  createOrReplaceAdminPasswordReset,
  findAdminPasswordReset,
  isAdminResetCodeValid,
  MAX_ADMIN_RESET_ATTEMPTS,
  registerAdminResetAttempt,
} from '../models/adminPasswordResetModel.js';
import { env, isProduction } from '../config/env.js';
import { isNotificationEmailConfigured } from '../services/emailService.js';
import { logActivity } from '../services/activityLogService.js';
import { sendAdminPasswordResetEmail, sendAdminSecurityAlert, maskIp } from '../services/adminSecurityAlertService.js';
import { incrementCounter } from '../services/securityCounterService.js';
import { clearAdminAuthCookie } from '../middleware/adminAuth.js';
import { AppError, isValidEmail, normalizeEmail, sendSuccess } from '../middleware/http.js';

const GENERIC_REQUEST_MESSAGE = 'If an administrator account exists for that email, a password reset code has been sent.';
const GENERIC_CONFIRM_MESSAGE = 'That code is invalid or has expired. Please request a new one.';
const MAX_CODES_PER_ACCOUNT_PER_HOUR = 5;

const isStrongPassword = (password) => (
  typeof password === 'string'
  && password.length >= 12
  && password.length <= 128
  && /[a-z]/.test(password)
  && /[A-Z]/.test(password)
  && /\d/.test(password)
);

// Whether recovery email can be delivered is global configuration, so reporting it reveals nothing about any account.
const isRecoveryConfigured = () => isNotificationEmailConfigured()
  && (Boolean(env.emailVerificationCodePepper) || !isProduction);

export const requestAdminPasswordReset = async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!isRecoveryConfigured()) {
    throw new AppError('Password recovery is temporarily unavailable.', 503);
  }

  const email = normalizeEmail(req.body?.email);
  const admin = isValidEmail(email) ? await findAdminByEmail(email) : null;

  if (admin && admin.isActive) {
    const adminId = admin._id.toString();
    // An internal failure here must not become a distinguishable 500 (which would reveal that the account
    // exists), so it is logged for the operator and the caller still receives the generic response.
    try {
      const existing = await findAdminPasswordReset(adminId);
      const cooldownActive = existing && existing.resendAvailableAt.getTime() > Date.now();
      // Account-wide cap across all IPs so the owner's inbox cannot be flooded with codes.
      const withinHourlyCap = !cooldownActive
        && (await incrementCounter(`admin-recovery:${adminId}`, 60 * 60 * 1000)) <= MAX_CODES_PER_ACCOUNT_PER_HOUR;
      const created = withinHourlyCap ? await createOrReplaceAdminPasswordReset(adminId) : null;

      if (created) {
        const { code, challenge } = created;
        await logActivity({
          adminId, actorEmail: admin.email, action: 'admin_password_reset_requested', resource: 'admin', resourceId: adminId,
          details: { network: maskIp(req.ip) },
        });
        // Delivery runs in the background so response time does not reveal whether the account exists.
        sendAdminPasswordResetEmail({ to: admin.email, code, recipientName: admin.name })
          .catch(async (error) => {
            console.error('Admin password reset email could not be delivered:', { reason: error?.message });
            try {
              await consumeAdminPasswordReset(adminId, challenge._id);
            } catch (cleanupError) {
              console.error('Admin password reset cleanup failed:', { reason: cleanupError?.message });
            }
          });
      }
    } catch (error) {
      console.error('Admin password reset request failed internally:', { name: error?.name, reason: error?.message });
    }
  }

  sendSuccess(res, { statusCode: 202, message: GENERIC_REQUEST_MESSAGE });
};

export const confirmAdminPasswordReset = async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const email = normalizeEmail(req.body?.email);
  const code = String(req.body?.code || '').trim();
  const { password } = req.body || {};

  if (!isStrongPassword(password)) {
    throw new AppError('New password must be 12-128 characters and include uppercase, lowercase, and a number', 400);
  }
  if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
    throw new AppError(GENERIC_CONFIRM_MESSAGE, 400);
  }

  const admin = await findAdminByEmail(email);
  const adminId = admin?._id.toString();
  if (!admin || !admin.isActive || !(await findAdminPasswordReset(adminId))) {
    throw new AppError(GENERIC_CONFIRM_MESSAGE, 400);
  }

  const challenge = await registerAdminResetAttempt(adminId);
  if (!challenge || challenge.attempts > MAX_ADMIN_RESET_ATTEMPTS || challenge.expiresAt.getTime() <= Date.now()) {
    await consumeAdminPasswordReset(adminId, challenge?._id);
    throw new AppError(GENERIC_CONFIRM_MESSAGE, 400);
  }

  if (!isAdminResetCodeValid(challenge, adminId, code)) {
    if (challenge.attempts >= MAX_ADMIN_RESET_ATTEMPTS) await consumeAdminPasswordReset(adminId, challenge._id);
    throw new AppError(GENERIC_CONFIRM_MESSAGE, 400);
  }

  // Removing the exact validated challenge is the single-use gate; a replayed, parallel or stale request
  // finds nothing, and cannot consume a challenge issued after it validated.
  if (!(await consumeAdminPasswordReset(adminId, challenge._id))) {
    throw new AppError(GENERIC_CONFIRM_MESSAGE, 400);
  }

  // Only credentials change; _id, role, email and every other field are preserved. All sessions are revoked.
  await revokeAllAdminSessions(adminId, {
    passwordHash: await bcrypt.hash(password, 12),
    passwordChangedAt: new Date(),
    passwordChangeRequired: false,
  });
  await logActivity({
    adminId, actorEmail: admin.email, action: 'admin_password_reset_completed', resource: 'admin', resourceId: adminId,
    details: { network: maskIp(req.ip) },
  });
  void sendAdminSecurityAlert('password_reset', { to: admin.email, accountId: adminId, name: admin.name, ip: req.ip });

  clearAdminAuthCookie(res);
  sendSuccess(res, { message: 'Password updated. Please sign in with your new password.' });
};
