import { ObjectId } from 'mongodb';
import { env } from '../config/env.js';
import { getCollection, getMemoryStore, isUsingMemoryStore } from '../config/database.js';
import { ADMIN_ROLE, normalizeAdminRole } from '../models/adminModel.js';
import { deleteAllStudentSessions } from '../models/studentSessionModel.js';
import { logActivity } from './activityLogService.js';
import { AppError } from '../middleware/http.js';

export const TRASH_RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const BOTH_ROLES = [ADMIN_ROLE.ADMIN, ADMIN_ROLE.SUPER_ADMIN];

// Only content types listed here can be trashed. Admin accounts, security/activity logs, sessions,
// password-reset challenges and other configuration are deliberately absent.
const TRASH_TYPES = {
  student: {
    label: 'Student',
    collection: () => env.studentsCollection,
    memory: 'students',
    roles: [ADMIN_ROLE.SUPER_ADMIN],
    title: (doc) => doc.fullName || doc.email || 'Student',
    subtitle: (doc) => doc.email || '',
    unique: [{ field: 'email', caseInsensitive: true, message: 'A student account with this email address already exists, so this student cannot be restored.' }],
  },
  enquiry: {
    label: 'Enquiry',
    collection: () => env.enquiriesCollection,
    memory: 'enquiries',
    roles: [ADMIN_ROLE.SUPER_ADMIN],
    title: (doc) => doc.name || doc.email || 'Enquiry',
    subtitle: (doc) => doc.email || '',
    unique: [],
  },
  service: {
    label: 'Service',
    collection: () => env.servicesCollection,
    memory: 'services',
    roles: [ADMIN_ROLE.SUPER_ADMIN],
    title: (doc) => doc.name || 'Service',
    subtitle: () => '',
    unique: [],
  },
  testimonial: {
    label: 'Testimonial',
    collection: () => env.testimonialsCollection,
    memory: 'testimonials',
    roles: BOTH_ROLES,
    title: (doc) => doc.name || 'Testimonial',
    subtitle: (doc) => doc.role || '',
    unique: [],
  },
  blog: {
    label: 'Blog post',
    collection: () => env.blogCollection,
    memory: 'blogPosts',
    roles: BOTH_ROLES,
    title: (doc) => doc.title || 'Blog post',
    subtitle: (doc) => doc.slug || '',
    unique: [{ field: 'slug', caseInsensitive: false, message: 'A blog post with this slug already exists, so this post cannot be restored.' }],
  },
};

export const TRASH_TYPE_KEYS = Object.keys(TRASH_TYPES);
export const trashTypeLabel = (type) => TRASH_TYPES[type]?.label || type;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const idString = (value) => (value === undefined || value === null ? '' : value.toString());
const docId = (doc) => idString(doc?._id ?? doc?.id);
const typeConfig = (type) => {
  const config = TRASH_TYPES[type];
  if (!config) throw new AppError('This content type cannot be moved to Trash', 400);
  return config;
};

export const allowedTrashTypes = (role) => {
  const normalized = normalizeAdminRole(role);
  return TRASH_TYPE_KEYS.filter((type) => TRASH_TYPES[type].roles.includes(normalized));
};

const assertCanManage = (admin, type) => {
  if (!allowedTrashTypes(admin?.role).includes(type)) {
    throw new AppError('You do not have permission to manage this type of content', 403);
  }
};

const isSuperAdminRole = (admin) => normalizeAdminRole(admin?.role) === ADMIN_ROLE.SUPER_ADMIN;

// ---- storage helpers (MongoDB or the development/test memory store) ----------------------------------

const trashCollection = () => getCollection(env.trashCollection);
const memoryList = (key) => {
  const store = getMemoryStore();
  if (!store[key]) store[key] = [];
  return store[key];
};

const findOriginal = async (config, id) => {
  if (isUsingMemoryStore()) return memoryList(config.memory).find((doc) => docId(doc) === id) || null;
  if (!ObjectId.isValid(id)) return null;
  return getCollection(config.collection()).findOne({ _id: new ObjectId(id) });
};

const findOriginalByField = async (config, field, value, caseInsensitive) => {
  const text = String(value ?? '');
  if (!text) return null;
  if (isUsingMemoryStore()) {
    return memoryList(config.memory).find((doc) => (caseInsensitive
      ? String(doc[field] ?? '').toLowerCase() === text.toLowerCase()
      : doc[field] === text)) || null;
  }
  const query = caseInsensitive
    ? { [field]: { $regex: `^${escapeRegex(text)}$`, $options: 'i' } }
    : { [field]: text };
  return getCollection(config.collection()).findOne(query);
};

const insertOriginal = async (config, doc) => {
  if (isUsingMemoryStore()) {
    memoryList(config.memory).unshift(doc);
    return;
  }
  await getCollection(config.collection()).insertOne(doc);
};

const removeOriginal = async (config, id) => {
  if (isUsingMemoryStore()) {
    const list = memoryList(config.memory);
    const index = list.findIndex((doc) => docId(doc) === id);
    if (index !== -1) list.splice(index, 1);
    return;
  }
  await getCollection(config.collection()).deleteOne({ _id: new ObjectId(id) });
};

const trashGet = async (id) => {
  if (isUsingMemoryStore()) return memoryList('trash').find((entry) => idString(entry._id) === id) || null;
  if (!ObjectId.isValid(id)) return null;
  return trashCollection().findOne({ _id: new ObjectId(id) });
};

const trashInsert = async (entry) => {
  if (isUsingMemoryStore()) {
    memoryList('trash').unshift(entry);
    return;
  }
  await trashCollection().insertOne(entry);
};

const trashDelete = async (id) => {
  if (isUsingMemoryStore()) {
    const list = memoryList('trash');
    const index = list.findIndex((entry) => idString(entry._id) === idString(id));
    if (index !== -1) list.splice(index, 1);
    return;
  }
  await trashCollection().deleteOne({ _id: new ObjectId(idString(id)) });
};

// An entry left over from an interrupted move/restore for the same record is replaced, never duplicated.
const trashDeleteByOriginal = async (type, originalId) => {
  if (isUsingMemoryStore()) {
    const store = getMemoryStore();
    store.trash = memoryList('trash').filter((entry) => !(entry.type === type && entry.originalId === originalId));
    return;
  }
  await trashCollection().deleteMany({ type, originalId });
};

const isExpired = (entry, now = new Date()) => new Date(entry.purgeAt).getTime() <= now.getTime();

export const formatTrashEntry = (entry, { now = new Date(), admin } = {}) => ({
  id: idString(entry._id),
  type: entry.type,
  typeLabel: trashTypeLabel(entry.type),
  label: entry.label || '',
  subtitle: entry.subtitle || '',
  originalId: entry.originalId,
  deletedAt: new Date(entry.deletedAt).toISOString(),
  purgeAt: new Date(entry.purgeAt).toISOString(),
  daysRemaining: Math.max(0, Math.ceil((new Date(entry.purgeAt).getTime() - now.getTime()) / DAY_MS)),
  deletedBy: { id: entry.deletedBy || '', email: entry.deletedByEmail || '' },
  canRestore: admin ? allowedTrashTypes(admin.role).includes(entry.type) : undefined,
  canPurge: admin ? isSuperAdminRole(admin) : undefined,
});

// ---- soft delete -------------------------------------------------------------------------------------

// Moves the record (same _id, all fields) into the trash collection. Returns null when it does not exist.
export const moveToTrash = async ({ type, id, admin }) => {
  const config = typeConfig(type);
  assertCanManage(admin, type);
  const doc = await findOriginal(config, idString(id));
  if (!doc) return null;

  const now = new Date();
  const originalId = docId(doc);
  const entry = {
    _id: new ObjectId(),
    type,
    originalId,
    label: String(config.title(doc)).slice(0, 200),
    subtitle: String(config.subtitle(doc)).slice(0, 200),
    snapshot: doc,
    deletedAt: now,
    purgeAt: new Date(now.getTime() + TRASH_RETENTION_DAYS * DAY_MS),
    deletedBy: idString(admin.id),
    deletedByEmail: admin.email || '',
  };

  await trashDeleteByOriginal(type, originalId);
  await trashInsert(entry);
  try {
    await removeOriginal(config, originalId);
  } catch (error) {
    await trashDelete(entry._id).catch(() => {});
    throw error;
  }

  if (type === 'student') {
    // A trashed student cannot sign in (the account is gone from the live collection); also drop open sessions.
    await deleteAllStudentSessions(originalId).catch((error) => console.error('Student session cleanup failed:', error.message));
  }
  return { entry, doc };
};

// ---- restore -----------------------------------------------------------------------------------------

export const restoreFromTrash = async ({ entryId, admin }) => {
  const entry = await trashGet(idString(entryId));
  if (!entry) throw new AppError('Trash item not found', 404);
  assertCanManage(admin, entry.type);
  if (isExpired(entry)) {
    throw new AppError(`This item passed its ${TRASH_RETENTION_DAYS}-day retention period and can no longer be restored`, 410);
  }

  const config = typeConfig(entry.type);
  const existing = await findOriginal(config, entry.originalId);
  if (!existing) {
    for (const rule of config.unique) {
      const conflict = await findOriginalByField(config, rule.field, entry.snapshot?.[rule.field], rule.caseInsensitive);
      if (conflict && docId(conflict) !== entry.originalId) throw new AppError(rule.message, 409);
    }
    try {
      await insertOriginal(config, entry.snapshot);
    } catch (error) {
      if (error?.code === 11000) throw new AppError('A record with the same unique value already exists, so this item cannot be restored.', 409);
      throw error;
    }
  }
  // If the record already exists with the same _id this is a retry of an interrupted restore: just clear the entry.
  await trashDelete(entry._id);

  await logActivity({
    adminId: admin.id,
    actorEmail: admin.email,
    action: 'trash_item_restored',
    resource: entry.type,
    resourceId: entry.originalId,
    details: { label: entry.label, type: entry.type },
  });
  return formatTrashEntry(entry, { admin });
};

// ---- permanent deletion ------------------------------------------------------------------------------

const purgeStudentRelated = async (studentId) => {
  // Never remove related data of a student that is live again (for example after a restore).
  if (await findOriginal(TRASH_TYPES.student, studentId)) return { files: 0 };

  if (isUsingMemoryStore()) {
    const store = getMemoryStore();
    const before = (store.studentFiles || []).length;
    store.studentFiles = (store.studentFiles || []).filter((file) => idString(file.studentId) !== studentId);
    await deleteAllStudentSessions(studentId);
    ['studentEmailVerifications', 'studentPasswordResets'].forEach((key) => {
      store[key] = (store[key] || []).filter((item) => idString(item.studentId) !== studentId);
    });
    return { files: before - store.studentFiles.length };
  }

  const ids = ObjectId.isValid(studentId) ? [studentId, new ObjectId(studentId)] : [studentId];
  const files = await getCollection(env.studentFilesCollection).deleteMany({ studentId: { $in: ids } });
  await deleteAllStudentSessions(studentId);
  await getCollection(env.studentEmailVerificationsCollection).deleteMany({ studentId: { $in: ids } });
  await getCollection(env.studentPasswordResetsCollection).deleteMany({ studentId: { $in: ids } });
  return { files: files.deletedCount || 0 };
};

const purgeEntry = async (entry) => {
  let relatedFilesRemoved = 0;
  if (entry.type === 'student') relatedFilesRemoved = (await purgeStudentRelated(entry.originalId)).files;
  await trashDelete(entry._id);
  return { relatedFilesRemoved };
};

export const purgeTrashItem = async ({ entryId, admin }) => {
  if (!isSuperAdminRole(admin)) throw new AppError('Only a Super Admin can permanently delete items', 403);
  const entry = await trashGet(idString(entryId));
  if (!entry) throw new AppError('Trash item not found', 404);
  const { relatedFilesRemoved } = await purgeEntry(entry);
  await logActivity({
    adminId: admin.id,
    actorEmail: admin.email,
    action: 'trash_item_purged',
    resource: entry.type,
    resourceId: entry.originalId,
    details: { label: entry.label, type: entry.type, relatedFilesRemoved },
  });
};

export const emptyTrash = async ({ admin }) => {
  if (!isSuperAdminRole(admin)) throw new AppError('Only a Super Admin can empty the Trash', 403);
  const entries = isUsingMemoryStore()
    ? [...memoryList('trash')]
    : await trashCollection().find({}, { projection: { snapshot: 0 } }).toArray();
  const byType = {};
  for (const entry of entries) {
    await purgeEntry(entry);
    byType[entry.type] = (byType[entry.type] || 0) + 1;
  }
  await logActivity({
    adminId: admin.id,
    actorEmail: admin.email,
    action: 'trash_emptied',
    resource: 'trash',
    resourceId: '',
    details: { removed: entries.length, byType },
  });
  return { removed: entries.length };
};

// Removes only entries older than the retention period. Safe to run repeatedly and concurrently.
export const purgeExpiredTrash = async ({ now = new Date(), dryRun = false } = {}) => {
  const expired = isUsingMemoryStore()
    ? memoryList('trash').filter((entry) => isExpired(entry, now))
    : await trashCollection().find({ purgeAt: { $lte: now } }, { projection: { snapshot: 0 } }).toArray();

  if (!dryRun) {
    for (const entry of expired) {
      const { relatedFilesRemoved } = await purgeEntry(entry);
      await logActivity({
        actorEmail: 'system',
        action: 'trash_auto_purged',
        resource: entry.type,
        resourceId: entry.originalId,
        details: { label: entry.label, type: entry.type, relatedFilesRemoved, deletedAt: entry.deletedAt },
      });
    }
  }
  return { expired: expired.length, purged: dryRun ? 0 : expired.length };
};

// Safety net for hosts where the cron job is missing: opening Trash also purges expired entries (at most every 10 minutes).
let lastLazyPurge = 0;
export const purgeExpiredTrashThrottled = async () => {
  if (Date.now() - lastLazyPurge < 10 * 60 * 1000) return;
  lastLazyPurge = Date.now();
  try {
    await purgeExpiredTrash();
  } catch (error) {
    console.error('Trash expiry cleanup failed:', error.message);
  }
};
export const resetTrashThrottleForTests = () => { lastLazyPurge = 0; };

// ---- listing -----------------------------------------------------------------------------------------

const parseDate = (value, endOfDay = false) => {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`);
  if (Number.isNaN(date.getTime())) throw new AppError('Invalid date filter', 400);
  return date;
};

export const listTrash = async ({ admin, type = '', search = '', deletedFrom = '', deletedTo = '', deletedBy = '', maxDaysRemaining = '', page = 1, limit = 20 } = {}) => {
  const now = new Date();
  const allowed = allowedTrashTypes(admin?.role);
  const requestedType = String(type || '').trim();
  if (requestedType && !TRASH_TYPES[requestedType]) throw new AppError('Unknown content type filter', 400);
  if (requestedType && !allowed.includes(requestedType)) throw new AppError('You do not have permission to view this type of content', 403);

  const text = String(search || '').trim().slice(0, 100);
  const from = parseDate(deletedFrom);
  const to = parseDate(deletedTo, true);
  const days = maxDaysRemaining === '' || maxDaysRemaining === undefined ? null : Number(maxDaysRemaining);
  if (days !== null && (!Number.isInteger(days) || days < 1 || days > TRASH_RETENTION_DAYS)) {
    throw new AppError(`Days remaining must be between 1 and ${TRASH_RETENTION_DAYS}`, 400);
  }
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const purgeLimit = days === null ? null : new Date(now.getTime() + days * DAY_MS);

  const visible = (entry) => allowed.includes(entry.type) && !isExpired(entry, now);
  const matches = (entry) => {
    if (!visible(entry)) return false;
    if (requestedType && entry.type !== requestedType) return false;
    if (text) {
      const needle = text.toLowerCase();
      if (![entry.label, entry.subtitle, entry.deletedByEmail].some((field) => String(field || '').toLowerCase().includes(needle))) return false;
    }
    if (from && new Date(entry.deletedAt) < from) return false;
    if (to && new Date(entry.deletedAt) > to) return false;
    if (deletedBy && entry.deletedBy !== String(deletedBy)) return false;
    if (purgeLimit && new Date(entry.purgeAt) > purgeLimit) return false;
    return true;
  };

  let entries;
  let total;
  let facetEntries;
  if (isUsingMemoryStore()) {
    const all = memoryList('trash');
    facetEntries = all.filter(visible);
    const filtered = all.filter(matches).sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
    total = filtered.length;
    entries = filtered.slice((safePage - 1) * safeLimit, safePage * safeLimit);
  } else {
    const query = { type: { $in: requestedType ? [requestedType] : allowed }, purgeAt: { $gt: now } };
    if (text) {
      const rx = { $regex: escapeRegex(text), $options: 'i' };
      query.$or = [{ label: rx }, { subtitle: rx }, { deletedByEmail: rx }];
    }
    if (from || to) query.deletedAt = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
    if (deletedBy) query.deletedBy = String(deletedBy);
    if (purgeLimit) query.purgeAt = { $gt: now, $lte: purgeLimit };

    const collection = trashCollection();
    const projection = { snapshot: 0 };
    [entries, total, facetEntries] = await Promise.all([
      collection.find(query, { projection }).sort({ deletedAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit).toArray(),
      collection.countDocuments(query),
      collection.find({ type: { $in: allowed }, purgeAt: { $gt: now } }, { projection: { type: 1, deletedBy: 1, deletedByEmail: 1 } }).toArray(),
    ]);
  }

  const counts = Object.fromEntries(allowed.map((key) => [key, 0]));
  const admins = new Map();
  facetEntries.forEach((entry) => {
    counts[entry.type] = (counts[entry.type] || 0) + 1;
    if (entry.deletedBy) admins.set(entry.deletedBy, entry.deletedByEmail || entry.deletedBy);
  });

  return {
    items: entries.map((entry) => formatTrashEntry(entry, { now, admin })),
    pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.max(Math.ceil(total / safeLimit), 1) },
    categories: allowed.map((key) => ({ type: key, label: TRASH_TYPES[key].label, count: counts[key] || 0 })),
    deletedByOptions: [...admins].map(([id, email]) => ({ id, email })),
    retentionDays: TRASH_RETENTION_DAYS,
    canPurge: isSuperAdminRole(admin),
  };
};
