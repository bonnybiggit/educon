import { env } from '../config/env.js';
import { getCollection, getMemoryStore, isUsingMemoryStore } from '../config/database.js';

// Atomically claims a notification key. Returns true only for the first caller, so retries never re-send.
export const claimNotification = async (key, type) => {
  const entry = { key, type, createdAt: new Date() };
  if (isUsingMemoryStore()) {
    const log = getMemoryStore().notificationLog;
    if (log.some((item) => item.key === key)) return false;
    log.push(entry);
    return true;
  }
  try {
    await getCollection(env.notificationLogCollection).insertOne(entry);
    return true;
  } catch (error) {
    if (error?.code === 11000) return false;
    throw error;
  }
};

// Lets a failed send be retried later by releasing its claim.
export const releaseNotification = async (key) => {
  if (isUsingMemoryStore()) {
    const log = getMemoryStore().notificationLog;
    const index = log.findIndex((item) => item.key === key);
    if (index !== -1) log.splice(index, 1);
    return;
  }
  await getCollection(env.notificationLogCollection).deleteOne({ key });
};
