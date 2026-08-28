import { ObjectId } from 'mongodb';
import { env } from '../config/env.js';
import { getCollection, getMemoryStore, isUsingMemoryStore } from '../config/database.js';

export const ADMIN_ROLES = ['super_admin', 'admin'];

export const sanitizeAdmin = (admin) => ({
  id: admin._id.toString(),
  name: admin.name,
  email: admin.email,
  role: admin.role,
  isActive: Boolean(admin.isActive),
  createdAt: admin.createdAt?.toISOString ? admin.createdAt.toISOString() : admin.createdAt,
  updatedAt: admin.updatedAt?.toISOString ? admin.updatedAt.toISOString() : admin.updatedAt,
  lastLoginAt: admin.lastLoginAt?.toISOString ? admin.lastLoginAt.toISOString() : admin.lastLoginAt,
});

export const findAdminByEmail = async (email) => {
  if (isUsingMemoryStore()) {
    return getMemoryStore().admins.find((admin) => admin.email === email) || null;
  }
  return getCollection(env.adminsCollection).findOne({ email });
};

export const findAdminById = async (id) => {
  if (isUsingMemoryStore()) {
    return getMemoryStore().admins.find((admin) => admin._id.toString() === id) || null;
  }
  return getCollection(env.adminsCollection).findOne({ _id: new ObjectId(id) });
};

export const updateAdminLastLogin = async (id) => {
  const now = new Date();
  if (isUsingMemoryStore()) {
    const admin = getMemoryStore().admins.find((item) => item._id.toString() === id.toString());
    if (admin) {
      admin.lastLoginAt = now;
      admin.updatedAt = now;
    }
    return admin;
  }

  return getCollection(env.adminsCollection).findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { lastLoginAt: now, updatedAt: now } },
    { returnDocument: 'after' }
  );
};

export const insertAdmin = async (adminDocument) => {
  if (isUsingMemoryStore()) {
    getMemoryStore().admins.unshift(adminDocument);
    return { insertedId: adminDocument._id };
  }
  return getCollection(env.adminsCollection).insertOne(adminDocument);
};
