import { getCollection, isUsingMemoryStore } from '../config/database.js';
import { normalizeEmail } from './http.js';

const RATE_LIMITS_COLLECTION = 'rateLimits';
const memoryBuckets = new Map();

export const resetRateLimits = () => memoryBuckets.clear();

const hitMemory = (id, windowMs) => {
  const now = Date.now();
  const bucket = memoryBuckets.get(id);
  if (!bucket || bucket.resetAt <= now) {
    memoryBuckets.set(id, { count: 1, resetAt: now + windowMs });
    return { count: 1, resetAt: now + windowMs };
  }
  bucket.count += 1;
  return bucket;
};

// Fixed-window counter shared by every server instance through MongoDB (TTL-indexed on `expiresAt`).
const hitShared = async (id, windowMs) => {
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
  const resetAt = windowStart + windowMs;
  const _id = `${id}:${windowStart}`;
  const collection = getCollection(RATE_LIMITS_COLLECTION);
  const update = { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(resetAt + 60 * 1000) } };

  for (let attempt = 0; ; attempt += 1) {
    try {
      const doc = await collection.findOneAndUpdate({ _id }, update, { upsert: true, returnDocument: 'after' });
      return { count: doc.count, resetAt };
    } catch (error) {
      // Two first hits can race on the upsert; the loser retries as a plain increment.
      if (error?.code !== 11000 || attempt >= 2) throw error;
    }
  }
};

const hit = async (id, windowMs) => {
  if (isUsingMemoryStore()) return hitMemory(id, windowMs);
  try {
    return await hitShared(id, windowMs);
  } catch (error) {
    // A limiter store outage must not lock everyone out; fall back to this instance's own counter.
    console.error('Rate limit store unavailable, using in-process counter:', error.message);
    return hitMemory(id, windowMs);
  }
};

const clientIp = (req) => req.ip || req.socket?.remoteAddress || 'unknown';

export const createRateLimiter = ({ name, windowMs, max, byEmail = false }) => async (req, res, next) => {
  try {
    const ip = clientIp(req);
    const keys = [`${name}:ip:${ip}`];
    if (byEmail) {
      const email = normalizeEmail(req.body?.email);
      if (email) keys.push(`${name}:acct:${ip}:${email.slice(0, 254)}`);
    }

    const results = await Promise.all(keys.map((key, index) => hit(key, windowMs).then((result) => ({
      ...result,
      // The per-IP bucket is looser than the per-account bucket.
      limit: index === 0 ? max * (byEmail ? 4 : 1) : max,
    }))));

    const blocked = results.find((result) => result.count > result.limit);
    if (blocked) {
      res.set('Retry-After', String(Math.max(1, Math.ceil((blocked.resetAt - Date.now()) / 1000))));
      res.status(429).json({ success: false, message: 'Too many attempts. Please wait a while and try again.' });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
};

const FIFTEEN_MINUTES = 15 * 60 * 1000;

export const studentLoginLimiter = createRateLimiter({ name: 'student-login', windowMs: FIFTEEN_MINUTES, max: 8, byEmail: true });
export const adminLoginLimiter = createRateLimiter({ name: 'admin-login', windowMs: FIFTEEN_MINUTES, max: 5, byEmail: true });
export const studentRegisterLimiter = createRateLimiter({ name: 'student-register', windowMs: 60 * 60 * 1000, max: 10 });
