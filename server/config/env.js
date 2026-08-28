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

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI,
  dbName: process.env.MONGODB_DB_NAME || 'educon',
  studentsCollection: process.env.MONGODB_STUDENTS_COLLECTION || process.env.MONGODB_COLLECTION || 'students',
  adminsCollection: process.env.MONGODB_ADMINS_COLLECTION || 'admins',
  enquiriesCollection: process.env.MONGODB_ENQUIRIES_COLLECTION || 'enquiries',
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
