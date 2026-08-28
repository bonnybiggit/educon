import { ObjectId } from 'mongodb';
import { env } from '../config/env.js';
import { getCollection, getMemoryStore, isUsingMemoryStore } from '../config/database.js';

export const logActivity = async ({ adminId, action, resource, resourceId, details = {} }) => {
  if (!adminId || !action || !resource) return;

  const activity = {
    _id: new ObjectId(),
    adminId: adminId.toString(),
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
