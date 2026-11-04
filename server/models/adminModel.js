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

const MAX_ADMIN_SESSIONS = 10;
const nowDate = () => new Date(Date.now());
const findMemoryAdmin = (id) => getMemoryStore().admins.find((item) => item._id.toString() === id.toString());

// Session records hold only an opaque id and timestamps; never the token itself.
export const addAdminSession = async (id, session) => {
  const now = nowDate();
  if (isUsingMemoryStore()) {
    const admin = findMemoryAdmin(id);
    if (!admin) return;
    const live = (admin.sessions || []).filter((item) => new Date(item.expiresAt) > now);
    admin.sessions = [...live, session].slice(-MAX_ADMIN_SESSIONS);
    return;
  }
  const collection = getCollection(env.adminsCollection);
  await collection.updateOne({ _id: new ObjectId(id) }, { $pull: { sessions: { expiresAt: { $lte: now } } } });
  await collection.updateOne(
    { _id: new ObjectId(id) },
    { $push: { sessions: { $each: [session], $slice: -MAX_ADMIN_SESSIONS } } }
  );
};

// Atomically refreshes activity only while the session is still live (present, inside its absolute expiry
// and inside the idle window), and never moves lastSeenAt backward. Returns false when the session was
// revoked, expired or idle-expired, so a stale read can never resurrect it.
export const touchAdminSession = async (id, jti, idleMs = env.adminIdleTimeoutSeconds * 1000) => {
  const now = nowDate();
  const idleCutoff = new Date(now.getTime() - idleMs);
  if (isUsingMemoryStore()) {
    const session = findMemoryAdmin(id)?.sessions?.find((item) => item.jti === jti);
    if (!session || new Date(session.expiresAt).getTime() <= now.getTime() || new Date(session.lastSeenAt).getTime() < idleCutoff.getTime()) {
      return false;
    }
    if (new Date(session.lastSeenAt).getTime() < now.getTime()) session.lastSeenAt = now;
    return true;
  }
  const result = await getCollection(env.adminsCollection).updateOne(
    {
      _id: new ObjectId(id),
      sessions: { $elemMatch: { jti, expiresAt: { $gt: now }, lastSeenAt: { $gte: idleCutoff } } },
    },
    { $max: { 'sessions.$.lastSeenAt': now } }
  );
  return result.matchedCount === 1;
};

export const removeAdminSession = async (id, jti) => {
  if (isUsingMemoryStore()) {
    const admin = findMemoryAdmin(id);
    if (admin?.sessions) admin.sessions = admin.sessions.filter((item) => item.jti !== jti);
    return;
  }
  await getCollection(env.adminsCollection).updateOne({ _id: new ObjectId(id) }, { $pull: { sessions: { jti } } });
};

// Applies `patch`, drops every stored session and bumps sessionVersion in a single atomic update.
export const revokeAllAdminSessions = async (id, patch = {}) => {
  const now = nowDate();
  if (isUsingMemoryStore()) {
    const admin = findMemoryAdmin(id);
    if (!admin) return null;
    Object.assign(admin, patch, {
      sessions: [],
      sessionVersion: (Number(admin.sessionVersion) || 0) + 1,
      updatedAt: now,
    });
    return admin;
  }
  return getCollection(env.adminsCollection).findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { ...patch, sessions: [], updatedAt: now }, $inc: { sessionVersion: 1 } },
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
