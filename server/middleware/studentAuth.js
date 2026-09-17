import { isProduction } from '../config/env.js';
import { findStudentById } from '../models/studentModel.js';
import { findStudentSession } from '../models/studentSessionModel.js';
import { AppError, asyncHandler } from './http.js';

const cookieName = 'educon_student_session';
const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  path: '/api',
};

export const getStudentSessionToken = (req) => {
  const cookie = (req.headers.cookie || '').split(';')
    .map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`));
  return cookie ? cookie.slice(cookieName.length + 1) : '';
};

export const setStudentSessionCookie = (res, token, expiresAt) => {
  res.cookie(cookieName, token, { ...cookieOptions, expires: expiresAt });
};

export const clearStudentSessionCookie = (res) => res.clearCookie(cookieName, cookieOptions);

export const noStoreStudentAuth = (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
};

export const requireStudent = asyncHandler(async (req, _res, next) => {
  const session = await findStudentSession(getStudentSessionToken(req));
  const student = session ? await findStudentById(session.studentId) : null;
  if (!student) throw new AppError('Authentication required', 401);
  req.student = student;
  req.studentSession = session;
  next();
});
