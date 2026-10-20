import { env } from '../config/env.js';
import { isLocalDevelopmentOrigin } from './corsOptions.js';
import { AppError } from './http.js';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const originOf = (value) => {
  try {
    return new URL(value).origin;
  } catch {
    return '';
  }
};

const isTrustedOrigin = (origin, req) => {
  if (!origin) return false;
  if (env.corsOrigins.includes(origin)) return true;
  if (isLocalDevelopmentOrigin(origin)) return true;
  // Same-origin deployments, where the API also serves the built site.
  try {
    return new URL(origin).host === req.get('host');
  } catch {
    return false;
  }
};

// Cookie-authenticated writes must come from a trusted site. Browsers always attach Origin (or at least
// Referer / Sec-Fetch-Site) to cross-site writes, so a request that declares a foreign origin is rejected.
// Non-browser clients send none of these headers and are not CSRF-exposed because they hold no ambient cookies.
export const csrfProtection = (req, _res, next) => {
  if (!UNSAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const origin = req.get('origin');
  if (origin) {
    next(isTrustedOrigin(origin, req) ? undefined : new AppError('Request origin is not allowed', 403));
    return;
  }

  const referer = req.get('referer');
  if (referer) {
    next(isTrustedOrigin(originOf(referer), req) ? undefined : new AppError('Request origin is not allowed', 403));
    return;
  }

  const fetchSite = req.get('sec-fetch-site');
  if (fetchSite && !['same-origin', 'none'].includes(fetchSite)) {
    next(new AppError('Request origin is not allowed', 403));
    return;
  }

  next();
};
