import { MongoClient } from 'mongodb';
import { env, isMemoryStoreAllowed } from './env.js';

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
  studentEmailVerifications: [],
  studentPasswordResets: [],
  adminPasswordResets: [],
  securityCounters: [],
  notificationLog: [],
};

let client;
let db;
let usingMemoryStore = false;

export const connectDatabase = async () => {
  if (!env.mongoUri) {
    if (!isMemoryStoreAllowed) {
      throw new Error(`MONGODB_URI must be configured (NODE_ENV=${env.nodeEnv}); the in-memory store is only for development/test`);
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
    if (!isMemoryStoreAllowed) {
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
    db.collection('rateLimits').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
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
    db.collection(env.notificationLogCollection).createIndex({ key: 1 }, { unique: true }),
    db.collection(env.notificationLogCollection).createIndex({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 }),
    db.collection(env.studentPasswordResetsCollection).createIndex({ studentId: 1 }, { unique: true }),
    db.collection(env.adminPasswordResetsCollection).createIndex({ adminId: 1 }, { unique: true }),
    db.collection(env.adminPasswordResetsCollection).createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection(env.studentPasswordResetsCollection).createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
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

const isTransactionUnsupported = (error) => error?.code === 20
  || /transaction numbers are only allowed|transactions are not supported/i.test(error?.message || '');

// Runs `work(session)` atomically. Standalone MongoDB servers (and the memory store) do not support
// transactions; the first operation then fails before any write, so `work` is re-run without a session.
export const runInTransaction = async (work) => {
  if (usingMemoryStore || !client) return work(undefined);

  const session = client.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (error) {
    if (!isTransactionUnsupported(error)) throw error;
    return work(undefined);
  } finally {
    await session.endSession();
  }
};

export const getMemoryStore = () => memoryStore;

export const closeDatabase = async () => {
  if (client) {
    await client.close();
  }
};
