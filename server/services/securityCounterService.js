import { getCollection, isUsingMemoryStore } from '../config/database.js';

// Short-lived security counters and cooldown claims. They share the TTL-indexed `rateLimits`
// collection with the request limiters, under a distinct "sec:" key prefix.
const COLLECTION = 'rateLimits';
const memory = new Map();

export const resetSecurityCounters = () => memory.clear();

const windowFor = (windowMs) => {
  const start = Math.floor(Date.now() / windowMs) * windowMs;
  return { start, resetAt: start + windowMs };
};

export const incrementCounter = async (key, windowMs) => {
  const { start, resetAt } = windowFor(windowMs);
  const id = `sec:${key}:${start}`;
  try {
    if (isUsingMemoryStore()) {
      const entry = memory.get(id) || { count: 0, expiresAt: resetAt };
      entry.count += 1;
      memory.set(id, entry);
      return entry.count;
    }
    const collection = getCollection(COLLECTION);
    for (let attempt = 0; ; attempt += 1) {
      try {
        const doc = await collection.findOneAndUpdate(
          { _id: id },
          { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(resetAt + 60 * 1000) } },
          { upsert: true, returnDocument: 'after' },
        );
        return doc.count;
      } catch (error) {
        if (error?.code !== 11000 || attempt >= 2) throw error;
      }
    }
  } catch (error) {
    console.error('Security counter unavailable:', error.message);
    return 0;
  }
};

export const resetCounter = async (key, windowMs) => {
  const id = `sec:${key}:${windowFor(windowMs).start}`;
  try {
    if (isUsingMemoryStore()) {
      memory.delete(id);
      return;
    }
    await getCollection(COLLECTION).deleteOne({ _id: id });
  } catch (error) {
    console.error('Security counter reset failed:', error.message);
  }
};

// Returns true for exactly one caller per cooldown period. Errors return false so a store outage
// can never turn into a flood of alerts, emails or log entries.
export const claimCooldown = async (key, cooldownMs) => {
  const id = `sec:cd:${key}`;
  const now = Date.now();
  const expiresAt = new Date(now + cooldownMs);
  try {
    if (isUsingMemoryStore()) {
      const existing = memory.get(id);
      if (existing && existing.expiresAt > now) return false;
      memory.set(id, { count: 1, expiresAt: now + cooldownMs });
      return true;
    }
    const collection = getCollection(COLLECTION);
    try {
      await collection.insertOne({ _id: id, expiresAt });
      return true;
    } catch (error) {
      if (error?.code !== 11000) throw error;
    }
    // The previous claim may have expired without the TTL monitor having removed it yet.
    const result = await collection.updateOne({ _id: id, expiresAt: { $lte: new Date(now) } }, { $set: { expiresAt } });
    return result.modifiedCount === 1;
  } catch (error) {
    console.error('Security cooldown unavailable:', error.message);
    return false;
  }
};
