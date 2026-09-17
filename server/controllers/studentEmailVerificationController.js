import { findStudentByEmail, markStudentEmailVerified } from '../models/studentModel.js';
import {
  createOrReplaceStudentEmailVerification,
  deleteStudentEmailVerification,
  findStudentEmailVerification,
  isVerificationCodeValid,
  MAX_VERIFICATION_ATTEMPTS,
  recordFailedVerificationAttempt,
  VERIFICATION_RESEND_COOLDOWN_MS,
} from '../models/studentEmailVerificationModel.js';
import { sendVerificationEmail } from '../services/emailService.js';
import { AppError, asyncHandler, isValidEmail, normalizeEmail, sendSuccess } from '../middleware/http.js';

const GENERIC_RESEND_MESSAGE = 'If the email can be verified, a verification code has been sent.';
const GENERIC_VERIFY_MESSAGE = 'Unable to verify email with the submitted code.';
const requestBuckets = new Map();
const RATE_WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 10;

const allowRequest = (key) => {
  const now = Date.now();
  const current = requestBuckets.get(key) || { count: 0, resetAt: now + RATE_WINDOW_MS };
  if (current.resetAt <= now) {
    current.count = 0;
    current.resetAt = now + RATE_WINDOW_MS;
  }
  current.count += 1;
  requestBuckets.set(key, current);
  return current.count <= MAX_REQUESTS_PER_WINDOW;
};

const getRateKey = (req, email) => `${req.ip || 'unknown'}:${email || 'unknown'}`;

export const verificationRateLimit = (req, _res, next) => {
  const email = normalizeEmail(req.body?.email);
  if (!allowRequest(getRateKey(req, email))) {
    next(new AppError('Request limit reached. Please try again later.', 429));
    return;
  }
  next();
};

const findStudentForEmail = async (email) => {
  if (!isValidEmail(email)) return null;
  return findStudentByEmail(normalizeEmail(email));
};

export const issueStudentVerificationCode = async (student) => {
  const { code } = await createOrReplaceStudentEmailVerification(student._id.toString());
  try {
    await sendVerificationEmail({ email: student.email, code, recipientName: student.fullName });
  } catch (error) {
    await deleteStudentEmailVerification(student._id.toString());
    if (error.statusCode) throw error;
    throw new AppError('Email delivery failed', 503);
  }
};

export const resendStudentEmailVerification = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const email = normalizeEmail(req.body?.email);
  const student = await findStudentForEmail(email);
  const challenge = student ? await findStudentEmailVerification(student._id.toString()) : null;
  const cooldownActive = challenge && challenge.resendAvailableAt.getTime() > Date.now();

  if (student && !student.emailVerified && !cooldownActive) {
    await issueStudentVerificationCode(student);
  }

  sendSuccess(res, { statusCode: 202, message: GENERIC_RESEND_MESSAGE });
});

export const verifyStudentEmail = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const email = normalizeEmail(req.body?.email);
  const code = String(req.body?.code || '').trim();
  if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
    sendSuccess(res, { data: { verified: false }, message: GENERIC_VERIFY_MESSAGE });
    return;
  }

  const student = await findStudentForEmail(email);
  const challenge = student ? await findStudentEmailVerification(student._id.toString()) : null;
  if (!student || student.emailVerified === true || !challenge) {
    sendSuccess(res, { data: { verified: false }, message: GENERIC_VERIFY_MESSAGE });
    return;
  }

  if (!isVerificationCodeValid(challenge, code)) {
    const nextAttempts = challenge.attempts + 1;
    await recordFailedVerificationAttempt(student._id.toString(), nextAttempts);
    if (nextAttempts >= MAX_VERIFICATION_ATTEMPTS) {
      await deleteStudentEmailVerification(student._id.toString());
    }
    sendSuccess(res, { data: { verified: false }, message: GENERIC_VERIFY_MESSAGE });
    return;
  }

  await deleteStudentEmailVerification(student._id.toString());
  await markStudentEmailVerified(student._id.toString());
  sendSuccess(res, { data: { verified: true }, message: 'Email verified' });
});

export const getVerificationCooldownMs = () => VERIFICATION_RESEND_COOLDOWN_MS;
