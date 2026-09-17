import { MongoClient } from 'mongodb';
import { env } from './env.js';

const memoryStore = {
  students: [],
  studentFiles: [],
  studentSessions: [],
  admins: [],
  enquiries: [],
  services: [],
  testimonials: [],
  blogPosts: [],
  activityLogs: [],
  studentIdentities: [],
  studentOAuthStates: [],
  studentOAuthPending: [],
  studentEmailVerifications: [],
};

let client;
let db;
let usingMemoryStore = false;

export const connectDatabase = async () => {
  if (!env.mongoUri) {
    if (env.nodeEnv === 'production') {
      throw new Error('MONGODB_URI must be configured in production');
    }
    console.warn('No MONGODB_URI found. Starting in local memory mode for app testing.');
    usingMemoryStore = true;
    return;
  }

  try {
    client = new MongoClient(env.mongoUri);
    await client.connect();
    db = client.db(env.dbName);
    await ensureIndexes();
  } catch (error) {
    if (env.nodeEnv === 'production') {
      throw new Error(`MongoDB connection failed: ${error.message}`, { cause: error });
    }
    console.warn('MongoDB connection failed. Falling back to in-memory storage.', error.message);
    usingMemoryStore = true;
  }
};

export const ensureIndexes = async () => {
  if (!db) return;

  await Promise.all([
    db.collection(env.studentsCollection).createIndex({ email: 1 }, { unique: true }),
    db.collection(env.studentsCollection).createIndex({ createdAt: -1 }),
    db.collection(env.studentFilesCollection).createIndex({ studentId: 1, field: 1 }, { unique: true }),
    db.collection('studentSessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection(env.adminsCollection).createIndex({ email: 1 }, { unique: true }),
    db.collection(env.adminsCollection).createIndex({ role: 1, isActive: 1 }),
    db.collection(env.enquiriesCollection).createIndex({ email: 1 }),
    db.collection(env.enquiriesCollection).createIndex({ status: 1, createdAt: -1 }),
    db.collection(env.servicesCollection).createIndex({ updatedAt: -1 }),
    db.collection(env.testimonialsCollection).createIndex({ isPublished: 1, updatedAt: -1 }),
    db.collection(env.blogCollection).createIndex({ slug: 1 }, { unique: true }),
    db.collection(env.blogCollection).createIndex({ isPublished: 1, updatedAt: -1 }),
    db.collection(env.activityLogsCollection).createIndex({ adminId: 1, createdAt: -1 }),
    db.collection(env.activityLogsCollection).createIndex({ resource: 1, resourceId: 1 }),
    db.collection(env.studentIdentitiesCollection).createIndex({ provider: 1, subject: 1 }, { unique: true }),
    db.collection(env.studentIdentitiesCollection).createIndex({ studentId: 1, provider: 1 }, { unique: true }),
    db.collection(env.studentOAuthStatesCollection).createIndex({ stateHash: 1 }, { unique: true }),
    db.collection(env.studentOAuthStatesCollection).createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection(env.studentOAuthPendingCollection).createIndex({ tokenHash: 1 }, { unique: true }),
    db.collection(env.studentOAuthPendingCollection).createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection(env.studentEmailVerificationsCollection).createIndex({ studentId: 1 }, { unique: true }),
    db.collection(env.studentEmailVerificationsCollection).createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]);
};

export const getCollection = (name) => {
  if (!db) {
    throw new Error('Database is not connected');
  }
  return db.collection(name);
};

export const isUsingMemoryStore = () => usingMemoryStore;

export const getMemoryStore = () => memoryStore;

export const closeDatabase = async () => {
  if (client) {
    await client.close();
  }
};
