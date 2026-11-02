import { ObjectId } from 'mongodb';
import { env } from '../config/env.js';
import { getCollection, getMemoryStore, isUsingMemoryStore } from '../config/database.js';

export const ADMIN_ROLES = ['super_admin', 'admin'];
export const ADMIN_ROLE = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
};

export const normalizeAdminRole = (role) => {
  const normalizedRole = String(role || '').trim().toLowerCase();
  return ADMIN_ROLES.includes(normalizedRole) ? normalizedRole : ADMIN_ROLE.ADMIN;
};

export const sanitizeAdmin = (admin) => ({
  id: admin._id.toString(),
  name: admin.name,
  email: admin.email,
  role: normalizeAdminRole(admin.role),
  isActive: Boolean(admin.isActive),
  isBootstrapAdmin: Boolean(admin.isBootstrapAdmin),
  passwordChangeRequired: Boolean(admin.passwordChangeRequired),
  createdBy: admin.createdBy ? admin.createdBy.toString() : '',
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

export const countAdmins = async () => {
  if (isUsingMemoryStore()) {
    return getMemoryStore().admins.length;
  }
  return getCollection(env.adminsCollection).countDocuments();
};

export const findAdmins = async () => {
  if (isUsingMemoryStore()) {
    return [...getMemoryStore().admins].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  return getCollection(env.adminsCollection).find().sort({ createdAt: -1 }).toArray();
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

export const updateAdminById = async (id, patch) => {
  if (isUsingMemoryStore()) {
    const admin = getMemoryStore().admins.find((item) => item._id.toString() === id.toString());
    if (!admin) return null;

    Object.assign(admin, patch, { updatedAt: new Date() });
    return admin;
  }

  return getCollection(env.adminsCollection).findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { ...patch, updatedAt: new Date() } },
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

export const deleteAdminById = async (id) => {
  if (isUsingMemoryStore()) {
    const index = getMemoryStore().admins.findIndex((admin) => admin._id.toString() === id.toString());
    if (index === -1) return null;
    const [admin] = getMemoryStore().admins.splice(index, 1);
    return admin;
  }

  const result = await getCollection(env.adminsCollection).findOneAndDelete({ _id: new ObjectId(id) });
  return result.value || result;
};

export const countActiveSuperAdmins = async (excludeId = '') => {
  const excludedId = excludeId.toString();
  if (isUsingMemoryStore()) {
    return getMemoryStore().admins.filter((admin) => (
      admin._id.toString() !== excludedId
      && admin.isActive
      && normalizeAdminRole(admin.role) === ADMIN_ROLE.SUPER_ADMIN
    )).length;
  }

  const query = { role: ADMIN_ROLE.SUPER_ADMIN, isActive: true };
  if (excludedId) query._id = { $ne: new ObjectId(excludedId) };
  return getCollection(env.adminsCollection).countDocuments(query);
};
