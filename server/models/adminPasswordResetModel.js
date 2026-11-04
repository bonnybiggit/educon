import crypto from 'node:crypto';
import { ObjectId } from 'mongodb';
import { env } from '../config/env.js';
import { getCollection, getMemoryStore, isUsingMemoryStore } from '../config/database.js';
import { generateVerificationCode } from './studentEmailVerificationModel.js';

export const ADMIN_RESET_TTL_MS = 10 * 60 * 1000;
export const ADMIN_RESET_COOLDOWN_MS = 60 * 1000;
export const MAX_ADMIN_RESET_ATTEMPTS = 5;

export const generateAdminResetCode = generateVerificationCode;

// Keyed (HMAC) and bound to the admin id and a purpose prefix, so a code cannot be replayed for another
// account or as a student verification/reset code. Only this hash is ever stored.
export const hashAdminResetCode = (adminId, code) => crypto
  .createHmac('sha256', env.emailVerificationCodePepper || 'development-verification-pepper')
  .update(`admin-password-reset:${adminId}:${code}`)
  .digest('hex');

const safeEqualHex = (a, b) => {
  const left = Buffer.from(String(a), 'hex');
  const right = Buffer.from(String(b), 'hex');
  return left.length > 0 && left.length === right.length && crypto.timingSafeEqual(left, right);
};

const findMemory = (adminId) => getMemoryStore().adminPasswordResets.find((item) => item.adminId === adminId);

// Each request gets a brand-new challenge with its own _id. The previous challenge is removed first because
// replacing a document with a different _id is rejected by MongoDB (the cause of a 500 on repeat requests).
// Returns null if a concurrent request created a challenge first (unique adminId index).
export const createOrReplaceAdminPasswordReset = async (adminId) => {
  const code = generateAdminResetCode();
  const now = new Date();
  const challenge = {
    _id: new ObjectId(),
    adminId,
    codeHash: hashAdminResetCode(adminId, code),
    expiresAt: new Date(now.getTime() + ADMIN_RESET_TTL_MS),
    attempts: 0,
    resendAvailableAt: new Date(now.getTime() + ADMIN_RESET_COOLDOWN_MS),
    createdAt: now,
  };

  if (isUsingMemoryStore()) {
    const challenges = getMemoryStore().adminPasswordResets;
    const index = challenges.findIndex((item) => item.adminId === adminId);
    if (index === -1) challenges.push(challenge);
    else challenges[index] = challenge;
    return { code, challenge };
  }

  const collection = getCollection(env.adminPasswordResetsCollection);
  await collection.deleteOne({ adminId });
  try {
    await collection.insertOne(challenge);
  } catch (error) {
    if (error?.code === 11000) return null;
    throw error;
  }
  return { code, challenge };
};

export const findAdminPasswordReset = async (adminId) => {
  if (isUsingMemoryStore()) return findMemory(adminId) || null;
  return getCollection(env.adminPasswordResetsCollection).findOne({ adminId });
};

// Single-use: true only for the one caller that actually removed this exact challenge. Matching on _id
// means a request that validated an older challenge can never consume a newly issued replacement.
export const consumeAdminPasswordReset = async (adminId, challengeId) => {
  if (!challengeId) return false;
  const id = String(challengeId);
  if (isUsingMemoryStore()) {
    const challenges = getMemoryStore().adminPasswordResets;
    const index = challenges.findIndex((item) => item.adminId === adminId && String(item._id) === id);
    if (index === -1) return false;
    challenges.splice(index, 1);
    return true;
  }
  const result = await getCollection(env.adminPasswordResetsCollection).deleteOne({
    _id: new ObjectId(id),
    adminId,
  });
  return result.deletedCount === 1;
};

// Atomically counts an attempt before the code is compared, so parallel guesses cannot exceed the limit.
export const registerAdminResetAttempt = async (adminId) => {
  if (isUsingMemoryStore()) {
    const challenge = findMemory(adminId);
    if (!challenge) return null;
    challenge.attempts += 1;
    return challenge;
  }
  return getCollection(env.adminPasswordResetsCollection).findOneAndUpdate(
    { adminId },
    { $inc: { attempts: 1 } },
    { returnDocument: 'after' },
  );
};

export const isAdminResetCodeValid = (challenge, adminId, code) => Boolean(
  challenge
  && challenge.expiresAt.getTime() > Date.now()
  && challenge.attempts <= MAX_ADMIN_RESET_ATTEMPTS
  && safeEqualHex(hashAdminResetCode(adminId, code), challenge.codeHash),
);
