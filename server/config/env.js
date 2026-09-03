import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.join(process.cwd(), 'server', '.env') });

const parseOrigins = (value) => {
  if (!value) return ['http://localhost:5173'];
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''));

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI,
  dbName: process.env.MONGODB_DB_NAME || 'educon',
  studentsCollection: process.env.MONGODB_STUDENTS_COLLECTION || process.env.MONGODB_COLLECTION || 'students',
  adminsCollection: process.env.MONGODB_ADMINS_COLLECTION || 'admins',
  enquiriesCollection: process.env.MONGODB_ENQUIRIES_COLLECTION || 'enquiries',
  servicesCollection: process.env.MONGODB_SERVICES_COLLECTION || 'services',
  testimonialsCollection: process.env.MONGODB_TESTIMONIALS_COLLECTION || 'testimonials',
  blogCollection: process.env.MONGODB_BLOG_COLLECTION || 'blogPosts',
  activityLogsCollection: process.env.MONGODB_ACTIVITY_LOGS_COLLECTION || 'activityLogs',
  corsOrigins: parseOrigins(process.env.CORS_ORIGINS || process.env.CORS_ORIGIN),
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresInSeconds: Number(process.env.JWT_EXPIRES_IN_SECONDS || 60 * 60 * 8),
  adminCookieName: process.env.ADMIN_COOKIE_NAME || 'educon_admin_token',
  bootstrapAdminName: process.env.ADMIN_BOOTSTRAP_NAME,
  bootstrapAdminEmail: process.env.ADMIN_BOOTSTRAP_EMAIL,
  bootstrapAdminPassword: process.env.ADMIN_BOOTSTRAP_PASSWORD,
};

export const isProduction = env.nodeEnv === 'production';

export const validateProductionEnv = () => {
  if (!isProduction) return;

  const requiredVariables = [
    ['MONGODB_URI', env.mongoUri],
    ['MONGODB_DB_NAME', process.env.MONGODB_DB_NAME],
    ['JWT_SECRET', env.jwtSecret],
    ['ADMIN_BOOTSTRAP_EMAIL', env.bootstrapAdminEmail],
    ['ADMIN_BOOTSTRAP_PASSWORD', env.bootstrapAdminPassword],
    ['CORS_ORIGINS', process.env.CORS_ORIGINS || process.env.CORS_ORIGIN],
  ];
  const missingVariables = requiredVariables
    .filter(([, value]) => !String(value || '').trim())
    .map(([name]) => name);

  if (missingVariables.length) {
    throw new Error(`Missing production environment variables: ${missingVariables.join(', ')}`);
  }

  if (env.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }

  if (!isValidEmail(env.bootstrapAdminEmail)) {
    throw new Error('ADMIN_BOOTSTRAP_EMAIL must be a valid email in production');
  }

  if (env.bootstrapAdminPassword.length < 12) {
    throw new Error('ADMIN_BOOTSTRAP_PASSWORD must be at least 12 characters in production');
  }
};
