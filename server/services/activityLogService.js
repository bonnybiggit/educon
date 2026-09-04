import { ObjectId } from 'mongodb';
import { env } from '../config/env.js';
import { getCollection, getMemoryStore, isUsingMemoryStore } from '../config/database.js';

export const logActivity = async ({ adminId = '', actorEmail = '', action, resource, resourceId, details = {} }) => {
  if (!action || !resource) return;

  const activity = {
    _id: new ObjectId(),
    adminId: adminId ? adminId.toString() : '',
    actorEmail,
    action,
    resource,
    resourceId: resourceId ? resourceId.toString() : '',
    details,
    createdAt: new Date(),
  };

  try {
    if (isUsingMemoryStore()) {
      getMemoryStore().activityLogs.unshift(activity);
      return;
    }
    await getCollection(env.activityLogsCollection).insertOne(activity);
  } catch (error) {
    console.error('Activity log error:', error.message);
  }
};

export const findActivityLogs = async ({ limit = 100 } = {}) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 250);

  if (isUsingMemoryStore()) {
    return getMemoryStore().activityLogs.slice(0, safeLimit);
  }

  return getCollection(env.activityLogsCollection).find().sort({ createdAt: -1 }).limit(safeLimit).toArray();
};

export const formatActivityLogResponse = (activity) => ({
  id: activity._id.toString(),
  adminId: activity.adminId || '',
  actorEmail: activity.actorEmail || '',
  action: activity.action,
  resource: activity.resource,
  resourceId: activity.resourceId || '',
  details: activity.details || {},
  createdAt: activity.createdAt?.toISOString ? activity.createdAt.toISOString() : activity.createdAt,
});
