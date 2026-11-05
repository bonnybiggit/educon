import { ObjectId } from 'mongodb';
import { env } from '../config/env.js';
import { getCollection, getMemoryStore, isUsingMemoryStore } from '../config/database.js';
import { ADMIN_ROLE, normalizeAdminRole } from '../models/adminModel.js';
import { AppError } from '../middleware/http.js';
import { formatActivityLogResponse, isProtectedActivityAction, logActivity } from './activityLogService.js';

// Separate from the Central Trash: hidden logs stay in the activity log collection, flagged with hiddenAt/purgeAt.
export const ACTIVITY_LOG_RETENTION_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_BATCH = 250;

const assertSuperAdmin = (admin) => {
  if (normalizeAdminRole(admin?.role) !== ADMIN_ROLE.SUPER_ADMIN) {
    throw new AppError('Only a Super Admin can manage Activity Logs', 403);
  }
};

const parseIds = (ids) => {
  if (!Array.isArray(ids) || ids.length === 0) throw new AppError('Select at least one log', 400);
  if (ids.length > MAX_BATCH) throw new AppError(`You can change at most ${MAX_BATCH} logs at a time`, 400);
  const unique = [...new Set(ids.map((id) => String(id)))];
  if (!unique.every((id) => ObjectId.isValid(id) && String(new ObjectId(id)) === id)) throw new AppError('Invalid log id', 400);
  return unique;
};

const loadByIds = async (ids) => {
  if (isUsingMemoryStore()) {
    return getMemoryStore().activityLogs.filter((log) => ids.includes(log._id.toString()));
  }
  return getCollection(env.activityLogsCollection).find({ _id: { $in: ids.map((id) => new ObjectId(id)) } }).toArray();
};

const updateByIds = async (ids, update) => {
  if (isUsingMemoryStore()) {
    getMemoryStore().activityLogs.filter((log) => ids.includes(log._id.toString())).forEach((log) => {
      if (update.$set) Object.assign(log, update.$set);
      if (update.$unset) Object.keys(update.$unset).forEach((key) => delete log[key]);
    });
    return;
  }
  await getCollection(env.activityLogsCollection).updateMany({ _id: { $in: ids.map((id) => new ObjectId(id)) } }, update);
};

export const hideActivityLogs = async ({ ids, admin, now = new Date() }) => {
  assertSuperAdmin(admin);
  const requested = parseIds(ids);
  const found = await loadByIds(requested);
  const hideable = found.filter((log) => !log.hiddenAt && !isProtectedActivityAction(log.action));
  const protectedCount = found.filter((log) => isProtectedActivityAction(log.action)).length;
  if (hideable.length === 0) {
    throw new AppError(protectedCount ? 'Protected security records cannot be deleted' : 'No matching logs to delete', protectedCount ? 403 : 404);
  }
  const hideIds = hideable.map((log) => log._id.toString());
  const purgeAt = new Date(now.getTime() + ACTIVITY_LOG_RETENTION_DAYS * DAY_MS);
  await updateByIds(hideIds, {
    $set: { hiddenAt: now, purgeAt, hiddenBy: String(admin.id), hiddenByEmail: admin.email || '' },
  });
  await logActivity({
    adminId: admin.id,
    actorEmail: admin.email,
    action: 'activity_logs_hidden',
    resource: 'activity_log',
    details: { count: hideIds.length, skippedProtected: protectedCount, logIds: hideIds, purgeAt: purgeAt.toISOString() },
  });
  return { hidden: hideIds.length, skippedProtected: protectedCount, purgeAt };
};

export const restoreActivityLogs = async ({ ids, admin, now = new Date() }) => {
  assertSuperAdmin(admin);
  const requested = parseIds(ids);
  const found = await loadByIds(requested);
  const restorable = found.filter((log) => log.hiddenAt && new Date(log.purgeAt) > now);
  if (restorable.length === 0) throw new AppError('No hidden logs to restore', 404);
  const restoreIds = restorable.map((log) => log._id.toString());
  await updateByIds(restoreIds, { $unset: { hiddenAt: '', purgeAt: '', hiddenBy: '', hiddenByEmail: '' } });
  await logActivity({
    adminId: admin.id,
    actorEmail: admin.email,
    action: 'activity_logs_restored',
    resource: 'activity_log',
    details: { count: restoreIds.length, logIds: restoreIds },
  });
  return { restored: restoreIds.length };
};

export const findHiddenActivityLogs = async ({ admin, limit = 100, now = new Date() } = {}) => {
  assertSuperAdmin(admin);
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), MAX_BATCH);
  let logs;
  if (isUsingMemoryStore()) {
    logs = getMemoryStore().activityLogs
      .filter((log) => log.hiddenAt && new Date(log.purgeAt) > now)
      .sort((a, b) => new Date(b.hiddenAt) - new Date(a.hiddenAt))
      .slice(0, safeLimit);
  } else {
    logs = await getCollection(env.activityLogsCollection)
      .find({ hiddenAt: { $ne: null }, purgeAt: { $gt: now } }).sort({ hiddenAt: -1 }).limit(safeLimit).toArray();
  }
  return logs.map(formatActivityLogResponse);
};

// Permanently removes hidden logs whose 90 days are over. Only hidden, non-protected records are ever touched.
export const purgeExpiredActivityLogs = async ({ now = new Date(), dryRun = false } = {}) => {
  let expired;
  if (isUsingMemoryStore()) {
    expired = getMemoryStore().activityLogs.filter((log) => log.hiddenAt && new Date(log.purgeAt) <= now && !isProtectedActivityAction(log.action));
  } else {
    expired = (await getCollection(env.activityLogsCollection)
      .find({ hiddenAt: { $ne: null }, purgeAt: { $lte: now } }, { projection: { action: 1 } }).toArray())
      .filter((log) => !isProtectedActivityAction(log.action));
  }
  if (!dryRun && expired.length) {
    const ids = expired.map((log) => log._id.toString());
    if (isUsingMemoryStore()) {
      const store = getMemoryStore();
      store.activityLogs = store.activityLogs.filter((log) => !ids.includes(log._id.toString()));
    } else {
      await getCollection(env.activityLogsCollection).deleteMany({ _id: { $in: expired.map((log) => log._id) }, hiddenAt: { $ne: null }, purgeAt: { $lte: now } });
    }
    await logActivity({
      actorEmail: 'system',
      action: 'activity_logs_auto_purged',
      resource: 'activity_log',
      details: { count: ids.length },
    });
  }
  return { expired: expired.length, purged: dryRun ? 0 : expired.length };
};
