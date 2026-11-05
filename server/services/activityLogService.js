import { ObjectId } from 'mongodb';
import { env } from '../config/env.js';
import { getCollection, getMemoryStore, isUsingMemoryStore } from '../config/database.js';

// Only routine content and sign-in/out records may be hidden. Everything else (role changes, admin account and
// password actions, failures, unauthorized attempts, Trash and Activity Log audit events, unknown actions) is protected.
const HIDEABLE_ACTIONS = new Set([
  'admin_login', 'admin_logout',
  'enquiry_status_update', 'enquiry_deletion',
  'blog_post_creation', 'blog_post_update', 'blog_post_deletion',
  'service_creation', 'service_update', 'service_deletion',
  'testimonial_creation', 'testimonial_update', 'testimonial_deletion',
  'student_status_update', 'student_deletion',
]);
export const isProtectedActivityAction = (action) => !HIDEABLE_ACTIONS.has(action);

// Resolves the actor email server-side from the admin record, never from request input.
const resolveActorEmail = async (adminId) => {
  if (!adminId || !ObjectId.isValid(adminId.toString())) return '';
  try {
    const _id = new ObjectId(adminId.toString());
    const record = isUsingMemoryStore()
      ? getMemoryStore().admins.find((item) => item._id?.toString() === _id.toString())
      : await getCollection(env.adminsCollection).findOne({ _id }, { projection: { email: 1 } });
    return record?.email || '';
  } catch {
    return '';
  }
};

export const logActivity = async ({ adminId = '', actorEmail = '', action, resource, resourceId, details = {} }) => {
  if (!action || !resource) return;

  const activity = {
    _id: new ObjectId(),
    adminId: adminId ? adminId.toString() : '',
    actorEmail: actorEmail || await resolveActorEmail(adminId),
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

  // Hidden logs (hiddenAt set) are excluded; records created before this feature have no hiddenAt and stay visible.
  if (isUsingMemoryStore()) {
    return getMemoryStore().activityLogs.filter((log) => !log.hiddenAt).slice(0, safeLimit);
  }

  return getCollection(env.activityLogsCollection).find({ hiddenAt: null }).sort({ createdAt: -1 }).limit(safeLimit).toArray();
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
  protected: isProtectedActivityAction(activity.action),
  ...(activity.hiddenAt ? {
    hiddenAt: new Date(activity.hiddenAt).toISOString(),
    purgeAt: new Date(activity.purgeAt).toISOString(),
    daysRemaining: Math.max(0, Math.ceil((new Date(activity.purgeAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000))),
    hiddenByEmail: activity.hiddenByEmail || '',
  } : {}),
});
