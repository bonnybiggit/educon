import crypto from 'crypto';
import { env, isProduction } from '../config/env.js';
import { logActivity } from '../services/activityLogService.js';
import { ADMIN_ROLE, findAdminById, normalizeAdminRole, sanitizeAdmin } from '../models/adminModel.js';
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
  sameSite: isProduction ? 'none' : 'lax',
  maxAge: env.jwtExpiresInSeconds * 1000,
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

export const createAdminToken = (admin) => {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: admin._id.toString(),
    email: admin.email,
    role: admin.role,
    type: 'admin',
    iat: now,
    exp: now + env.jwtExpiresInSeconds,
  };
  const content = `${base64UrlEncode(header)}.${base64UrlEncode(payload)}`;
  return `${content}.${sign(content)}`;
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
    throw new AppError('Authentication required', 401);
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new AppError('Invalid authentication token', 401);
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const content = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = sign(content);
  const signatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedSignatureBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
  ) {
    throw new AppError('Invalid authentication token', 401);
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch {
    throw new AppError('Invalid authentication token', 401);
  }

  if (payload.type !== 'admin' || !payload.sub) {
    throw new AppError('Invalid authentication token', 401);
  }

  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new AppError('Authentication token expired', 401);
  }

  return payload;
};

export const requireAdmin = asyncHandler(async (req, _res, next) => {
  requireTrustedOrigin(req);
  const payload = verifyAdminToken(getCookieToken(req) || getBearerToken(req));
  const admin = await findAdminById(payload.sub);

  if (!admin || !admin.isActive) {
    throw new AppError('Admin account is inactive or unavailable', 403);
  }

  if (admin.passwordChangedAt && payload.iat && new Date(admin.passwordChangedAt).getTime() >= payload.iat * 1000) {
    throw new AppError('Authentication token is no longer valid', 401);
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
