import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.join(process.cwd(), 'server', '.env') });

const parseOrigins = (value) => {
  if (!value) return [];
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

// Passenger/cPanel sets PASSENGER_APP_ENV; without this, a missing NODE_ENV on the host would silently
// select development defaults (including the in-memory store).
const nodeEnv = process.env.NODE_ENV || process.env.PASSENGER_APP_ENV || 'development';
const frontendUrl = process.env.FRONTEND_URL
  || (nodeEnv === 'production' ? 'https://universeconsultsedu.com' : 'http://localhost:5173');
const normalizedFrontendUrl = frontendUrl.replace(/\/+$/, '');
const corsOrigins = parseOrigins(process.env.CORS_ORIGINS || process.env.CORS_ORIGIN);
if (normalizedFrontendUrl && !corsOrigins.includes(normalizedFrontendUrl)) corsOrigins.push(normalizedFrontendUrl);

const positiveInteger = (value, fallback) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
};

// Legacy admin tokens are honoured only until an explicit absolute date. Without a valid
// ADMIN_LEGACY_TOKEN_UNTIL the deadline is 0 (already passed), so a restart can never extend the window.
const configuredLegacyDeadline = Date.parse(process.env.ADMIN_LEGACY_TOKEN_UNTIL || '');
const legacyTokenDeadlineMs = Number.isFinite(configuredLegacyDeadline) ? configuredLegacyDeadline : 0;

export const env = {
  nodeEnv,
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI,
  dbName: process.env.MONGODB_DB_NAME || 'educon',
  studentsCollection: process.env.MONGODB_STUDENTS_COLLECTION || process.env.MONGODB_COLLECTION || 'students',
  studentFilesCollection: process.env.MONGODB_STUDENT_FILES_COLLECTION || 'studentFiles',
  adminsCollection: process.env.MONGODB_ADMINS_COLLECTION || 'admins',
  enquiriesCollection: process.env.MONGODB_ENQUIRIES_COLLECTION || 'enquiries',
  servicesCollection: process.env.MONGODB_SERVICES_COLLECTION || 'services',
  testimonialsCollection: process.env.MONGODB_TESTIMONIALS_COLLECTION || 'testimonials',
  blogCollection: process.env.MONGODB_BLOG_COLLECTION || 'blogPosts',
  activityLogsCollection: process.env.MONGODB_ACTIVITY_LOGS_COLLECTION || 'activityLogs',
  notificationLogCollection: process.env.MONGODB_NOTIFICATION_LOG_COLLECTION || 'notificationLog',
  studentPasswordResetsCollection: process.env.MONGODB_STUDENT_PASSWORD_RESETS_COLLECTION || 'studentPasswordResets',
  studentEmailVerificationsCollection: process.env.MONGODB_STUDENT_EMAIL_VERIFICATIONS_COLLECTION || 'studentEmailVerifications',
  corsOrigins,
  // Number of reverse-proxy hops to trust for req.ip (rate limiting); leave unset when not behind a proxy.
  trustProxy: process.env.TRUST_PROXY || (nodeEnv === 'production' ? '1' : ''),
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresInSeconds: Number(process.env.JWT_EXPIRES_IN_SECONDS || 60 * 60 * 8),
  adminCookieName: process.env.ADMIN_COOKIE_NAME || 'educon_admin_token',
  // Admin-only session limits; student sessions keep using jwtExpiresInSeconds.
  adminSessionTtlSeconds: positiveInteger(process.env.ADMIN_SESSION_TTL_SECONDS, 60 * 60 * 2),
  adminIdleTimeoutSeconds: positiveInteger(process.env.ADMIN_IDLE_TIMEOUT_SECONDS, 60 * 30),
  // Rollout switch: pre-upgrade tokens without a session id work only while true AND before the absolute deadline.
  adminLegacyTokenCompat: process.env.ADMIN_LEGACY_TOKEN_COMPAT !== 'false',
  adminLegacyTokenDeadlineMs: legacyTokenDeadlineMs,
  adminAllowBearer: process.env.ADMIN_ALLOW_BEARER === 'true',
  adminPasswordResetsCollection: process.env.MONGODB_ADMIN_PASSWORD_RESETS_COLLECTION || 'adminPasswordResets',
  adminSecurityAlertsEnabled: process.env.ADMIN_SECURITY_ALERTS_ENABLED !== 'false',
  adminLoginAlertThreshold: positiveInteger(process.env.ADMIN_LOGIN_ALERT_THRESHOLD, 5),
  // Never below one hour, whatever the configured value.
  adminAlertCooldownSeconds: Math.max(positiveInteger(process.env.ADMIN_ALERT_COOLDOWN_SECONDS, 60 * 60), 60 * 60),
  bootstrapAdminName: process.env.ADMIN_BOOTSTRAP_NAME,
  bootstrapAdminEmail: process.env.ADMIN_BOOTSTRAP_EMAIL,
  bootstrapAdminPassword: process.env.ADMIN_BOOTSTRAP_PASSWORD,
  frontendUrl: normalizedFrontendUrl,
  resendApiKey: process.env.RESEND_API_KEY,
  emailFrom: process.env.EMAIL_FROM || '',
  supportNotificationEmail: process.env.SUPPORT_NOTIFICATION_EMAIL || 'support@universeconsultsedu.com',
  emailVerificationCodePepper: process.env.EMAIL_VERIFICATION_CODE_PEPPER || '',
};

export const isProduction = env.nodeEnv === 'production';

// The in-memory store is a local-testing convenience only; it is never allowed unless the mode is explicitly one of these.
export const isMemoryStoreAllowed = ['development', 'test'].includes(env.nodeEnv);

export const validateProductionEnv = () => {
  if (!isProduction) return;

  const missingVariables = [
    ['MONGODB_URI', env.mongoUri],
    ['JWT_SECRET', env.jwtSecret],
  ]
    .filter(([, value]) => !String(value || '').trim())
    .map(([name]) => name);

  if (missingVariables.length) {
    throw new Error(`Missing production environment variables: ${missingVariables.join(', ')}`);
  }

  if (!/^mongodb(?:\+srv)?:\/\//.test(env.mongoUri)) {
    throw new Error('MONGODB_URI must be a MongoDB connection string');
  }

  if (env.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }

  if (!Number.isSafeInteger(env.jwtExpiresInSeconds) || env.jwtExpiresInSeconds < 1) {
    throw new Error('JWT_EXPIRES_IN_SECONDS must be a positive integer in production');
  }

  if (process.env.ADMIN_LEGACY_TOKEN_UNTIL && !env.adminLegacyTokenDeadlineMs) {
    throw new Error('ADMIN_LEGACY_TOKEN_UNTIL must be an absolute ISO date such as 2026-12-31T00:00:00Z');
  }

  if (!Number.isInteger(env.port) || env.port < 1 || env.port > 65535) {
    throw new Error('PORT must be a valid TCP port in production');
  }

};
