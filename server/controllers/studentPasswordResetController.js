import bcrypt from 'bcryptjs';
import { findStudentByEmail, updateStudentById } from '../models/studentModel.js';
import {
  consumeStudentPasswordReset,
  createOrReplaceStudentPasswordReset,
  findStudentPasswordReset,
  isPasswordResetCodeValid,
  MAX_PASSWORD_RESET_ATTEMPTS,
  recordFailedPasswordResetAttempt,
} from '../models/studentPasswordResetModel.js';
import { deleteAllStudentSessions } from '../models/studentSessionModel.js';
import { isEmailConfigured, sendPasswordResetEmail } from '../services/emailService.js';
import { AppError, asyncHandler, isValidEmail, normalizeEmail, sendSuccess } from '../middleware/http.js';
import { clearStudentSessionCookie } from '../middleware/studentAuth.js';

const GENERIC_REQUEST_MESSAGE = 'If an account exists for that email, a password reset code has been sent.';
const GENERIC_CONFIRM_MESSAGE = 'That code is invalid or has expired. Please request a new one.';

export const requestStudentPasswordReset = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  // Configuration is global, so reporting it reveals nothing about any particular email address.
  if (!isEmailConfigured()) {
    throw new AppError('Password reset is temporarily unavailable because email delivery is not configured.', 503);
  }

  const email = normalizeEmail(req.body?.email);
  const student = isValidEmail(email) ? await findStudentByEmail(email) : null;
  const challenge = student ? await findStudentPasswordReset(student._id.toString()) : null;
  const cooldownActive = challenge && challenge.resendAvailableAt.getTime() > Date.now();

  if (student && !cooldownActive) {
    const studentId = student._id.toString();
    const { code } = await createOrReplaceStudentPasswordReset(studentId);
    try {
      await sendPasswordResetEmail({ email: student.email, code, recipientName: student.fullName });
    } catch (error) {
      await consumeStudentPasswordReset(studentId);
      // Surfacing a provider failure only for real accounts would reveal which emails exist.
      console.error('Password reset email could not be delivered:', error.message);
    }
  }

  sendSuccess(res, { statusCode: 202, message: GENERIC_REQUEST_MESSAGE });
});

export const confirmStudentPasswordReset = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const email = normalizeEmail(req.body?.email);
  const code = String(req.body?.code || '').trim();
  const { password } = req.body || {};

  if (typeof password !== 'string' || password.length < 6 || password.length > 128) {
    throw new AppError('Password must be between 6 and 128 characters', 400);
  }
  if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
    throw new AppError(GENERIC_CONFIRM_MESSAGE, 400);
  }

  const student = await findStudentByEmail(email);
  const studentId = student?._id.toString();
  const challenge = student ? await findStudentPasswordReset(studentId) : null;
  if (!student || !challenge) {
    throw new AppError(GENERIC_CONFIRM_MESSAGE, 400);
  }

  if (!isPasswordResetCodeValid(challenge, code)) {
    const attempts = challenge.attempts + 1;
    await recordFailedPasswordResetAttempt(studentId, attempts);
    if (attempts >= MAX_PASSWORD_RESET_ATTEMPTS) await consumeStudentPasswordReset(studentId);
    throw new AppError(GENERIC_CONFIRM_MESSAGE, 400);
  }

  if (!(await consumeStudentPasswordReset(studentId))) {
    throw new AppError(GENERIC_CONFIRM_MESSAGE, 400);
  }

  // Only the password hash and verification flags change; the account keeps its id and all profile data.
  await updateStudentById(studentId, {
    password: await bcrypt.hash(password, 10),
    passwordChangedAt: new Date(),
    emailVerified: true,
    ...(student.emailVerified === true ? {} : { emailVerifiedAt: new Date() }),
  });
  await deleteAllStudentSessions(studentId);
  clearStudentSessionCookie(res);

  sendSuccess(res, { message: 'Password updated. Please sign in with your new password.' });
});
