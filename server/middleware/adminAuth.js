import crypto from 'crypto';
import { env, isProduction } from '../config/env.js';
import { logActivity } from '../services/activityLogService.js';
import {
  ADMIN_ROLE,
  addAdminSession,
  findAdminById,
  normalizeAdminRole,
  removeAdminSession,
  sanitizeAdmin,
  touchAdminSession,
} from '../models/adminModel.js';
import { AppError, asyncHandler } from './http.js';

const base64UrlEncode = (value) => Buffer
  .from(JSON.stringify(value))
  .toString('base64url');

const getJwtSecret = () => {
  if (!env.jwtSecret) {
    throw new Error('JWT secret is not configured');
  }
  return env.jwtSecret;
};

const sign = (content) => crypto
  .createHmac('sha256', getJwtSecret())
  .update(content)
  .digest('base64url');

const getAdminCookieOptions = () => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  maxAge: env.adminSessionTtlSeconds * 1000,
  path: '/',
});

const getCookieToken = (req) => {
  const cookieHeader = req.headers.cookie || '';
  const cookies = Object.fromEntries(
    cookieHeader
      .split(';')
      .map((cookie) => cookie.trim())
      .filter(Boolean)
      .map((cookie) => {
        const separatorIndex = cookie.indexOf('=');
        if (separatorIndex === -1) return [cookie, ''];
        return [
          decodeURIComponent(cookie.slice(0, separatorIndex)),
          decodeURIComponent(cookie.slice(separatorIndex + 1)),
        ];
      })
  );

  return cookies[env.adminCookieName] || '';
};

const getBearerToken = (req) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return '';
  return header.slice(7).trim();
};

const isTrustedOrigin = (origin) => {
  if (env.corsOrigins.includes(origin)) return true;
  if (isProduction) return false;

  try {
    const { hostname, protocol } = new URL(origin);
    return ['http:', 'https:'].includes(protocol)
      && (hostname === 'localhost' || hostname === '127.0.0.1' || /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(hostname));
  } catch {
    return false;
  }
};

const requireTrustedOrigin = (req) => {
  if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) return;
  const origin = req.headers.origin;
  if (origin && !isTrustedOrigin(origin)) {
    throw new AppError('Request origin is not allowed', 403);
  }
};

export const SESSION_INVALID_CODE = 'ADMIN_SESSION_INVALID';
const sessionInvalid = (message, statusCode = 401) => new AppError(message, statusCode, SESSION_INVALID_CODE);

const CLOCK_SKEW_SECONDS = 30;
const SESSION_TOUCH_INTERVAL_MS = 60 * 1000;

// Tokens carrying a `jti` are tracked server-side; tokens without one are only produced by tests and pre-upgrade logins.
export const createAdminToken = (admin, { jti } = {}) => {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: admin._id.toString(),
    email: admin.email,
    role: admin.role,
    type: 'admin',
    // Bumped on the account to revoke every previously issued token; accounts without it count as 0.
    sv: Number(admin.sessionVersion) || 0,
    ...(jti ? { jti } : {}),
    iat: now,
    exp: now + (jti ? env.adminSessionTtlSeconds : env.jwtExpiresInSeconds),
  };
  const content = `${base64UrlEncode(header)}.${base64UrlEncode(payload)}`;
  return `${content}.${sign(content)}`;
};

export const issueAdminSession = async (admin) => {
  const jti = crypto.randomUUID();
  const now = Date.now();
  await addAdminSession(admin._id, {
    jti,
    createdAt: new Date(now),
    lastSeenAt: new Date(now),
    expiresAt: new Date(now + env.adminSessionTtlSeconds * 1000),
  });
  return createAdminToken(admin, { jti });
};

export const setAdminAuthCookie = (res, token) => {
  res.cookie(env.adminCookieName, token, getAdminCookieOptions());
};

export const clearAdminAuthCookie = (res) => {
  res.clearCookie(env.adminCookieName, {
    ...getAdminCookieOptions(),
    maxAge: undefined,
  });
};

export const verifyAdminToken = (token) => {
  if (!token || typeof token !== 'string') {
    throw sessionInvalid('Authentication required');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw sessionInvalid('Invalid authentication token');
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  let header;
  let payload;
  try {
    header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8'));
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch {
    throw sessionInvalid('Invalid authentication token');
  }

  // Only the exact algorithm we issue is accepted (no "none", no algorithm switching).
  if (!header || header.alg !== 'HS256' || header.typ !== 'JWT' || !payload || typeof payload !== 'object') {
    throw sessionInvalid('Invalid authentication token');
  }

  const content = `${encodedHeader}.${encodedPayload}`;
  const signatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(sign(content));

  if (
    signatureBuffer.length !== expectedSignatureBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
  ) {
    throw sessionInvalid('Invalid authentication token');
  }

  if (payload.type !== 'admin' || typeof payload.sub !== 'string' || !/^[a-f0-9]{24}$/i.test(payload.sub)) {
    throw sessionInvalid('Invalid authentication token');
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (!Number.isInteger(payload.iat) || !Number.isInteger(payload.exp) || payload.exp <= payload.iat) {
    throw sessionInvalid('Invalid authentication token');
  }
  if (payload.iat > nowSeconds + CLOCK_SKEW_SECONDS) {
    throw sessionInvalid('Invalid authentication token');
  }
  if (payload.exp <= nowSeconds) {
    throw sessionInvalid('Authentication token expired');
  }
  if (payload.jti !== undefined && (typeof payload.jti !== 'string' || !payload.jti
    || payload.exp - payload.iat > env.adminSessionTtlSeconds + CLOCK_SKEW_SECONDS)) {
    throw sessionInvalid('Invalid authentication token');
  }

  return payload;
};

export const requireAdmin = asyncHandler(async (req, _res, next) => {
  requireTrustedOrigin(req);
  const payload = verifyAdminToken(getCookieToken(req) || (env.adminAllowBearer ? getBearerToken(req) : ''));
  const admin = await findAdminById(payload.sub);

  if (!admin || !admin.isActive) {
    throw sessionInvalid('Admin account is inactive or unavailable', 403);
  }

  if ((Number(payload.sv) || 0) !== (Number(admin.sessionVersion) || 0)) {
    throw sessionInvalid('Authentication token is no longer valid');
  }

  // Compared in whole seconds like `iat`, so a sign-in in the same second as a password change is not rejected.
  if (admin.passwordChangedAt && Math.floor(new Date(admin.passwordChangedAt).getTime() / 1000) > payload.iat) {
    throw sessionInvalid('Authentication token is no longer valid');
  }

  if (payload.jti) {
    const now = Date.now();
    const session = (admin.sessions || []).find((item) => item.jti === payload.jti);
    if (!session || new Date(session.expiresAt).getTime() <= now) {
      throw sessionInvalid('Authentication token is no longer valid');
    }
    const lastSeen = new Date(session.lastSeenAt).getTime();
    if (now - lastSeen > env.adminIdleTimeoutSeconds * 1000) {
      await removeAdminSession(admin._id, payload.jti);
      throw sessionInvalid('Session expired due to inactivity');
    }
    if (now - lastSeen > SESSION_TOUCH_INTERVAL_MS && !(await touchAdminSession(admin._id, payload.jti))) {
      throw sessionInvalid('Authentication token is no longer valid');
    }
    req.adminSession = { jti: payload.jti };
  } else if (
    !env.adminLegacyTokenCompat
    || Date.now() > env.adminLegacyTokenDeadlineMs
    || payload.iat * 1000 > env.adminLegacyTokenDeadlineMs
  ) {
    throw sessionInvalid('Please sign in again');
  }

  req.admin = sanitizeAdmin(admin);

  if (req.admin.passwordChangeRequired) {
    const allowedPasswordChangePaths = ['/api/admin/me', '/api/admin/logout', '/api/admin/settings', '/api/admin/password'];
    if (!allowedPasswordChangePaths.includes(req.originalUrl.split('?')[0])) {
      throw new AppError('Password change is required before continuing', 403);
    }
  }

  next();
});

export const requireRole = (...roles) => asyncHandler(async (req, _res, next) => {
  const allowedRoles = roles.map(normalizeAdminRole);
  const adminRole = normalizeAdminRole(req.admin?.role);

  if (!allowedRoles.includes(adminRole)) {
    await logActivity({
      adminId: req.admin?.id,
      actorEmail: req.admin?.email,
      action: 'unauthorized_access_attempt',
      resource: 'admin_route',
      resourceId: '',
      details: { method: req.method, path: req.originalUrl, requiredRoles: allowedRoles },
    });
    throw new AppError('You are not authorized to perform this action', 403);
  }

  next();
});

export const requireSuperAdmin = requireRole(ADMIN_ROLE.SUPER_ADMIN);
