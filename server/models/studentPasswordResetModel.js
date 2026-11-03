import crypto from 'node:crypto';
import { ObjectId } from 'mongodb';
import { env } from '../config/env.js';
import { getCollection, getMemoryStore, isUsingMemoryStore } from '../config/database.js';
import { generateVerificationCode, hashVerificationCode } from './studentEmailVerificationModel.js';

export const PASSWORD_RESET_TTL_MS = 10 * 60 * 1000;
export const PASSWORD_RESET_COOLDOWN_MS = 60 * 1000;
export const MAX_PASSWORD_RESET_ATTEMPTS = 5;

// Domain-separated so a verification code can never be replayed as a reset code.
const hashResetCode = (code) => hashVerificationCode(`password-reset:${code}`);

const timingSafeEqualHex = (a, b) => {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

export const createOrReplaceStudentPasswordReset = async (studentId) => {
  const code = generateVerificationCode();
  const now = new Date();
  const challenge = {
    _id: new ObjectId(),
    studentId,
    codeHash: hashResetCode(code),
    expiresAt: new Date(now.getTime() + PASSWORD_RESET_TTL_MS),
    attempts: 0,
    resendAvailableAt: new Date(now.getTime() + PASSWORD_RESET_COOLDOWN_MS),
    createdAt: now,
  };

  if (isUsingMemoryStore()) {
    const challenges = getMemoryStore().studentPasswordResets;
    const index = challenges.findIndex((item) => item.studentId === studentId);
    if (index === -1) challenges.push(challenge);
    else challenges[index] = challenge;
  } else {
    await getCollection(env.studentPasswordResetsCollection).replaceOne({ studentId }, challenge, { upsert: true });
  }
  return { code, challenge };
};

export const findStudentPasswordReset = async (studentId) => {
  if (isUsingMemoryStore()) {
    return getMemoryStore().studentPasswordResets.find((item) => item.studentId === studentId) || null;
  }
  return getCollection(env.studentPasswordResetsCollection).findOne({ studentId });
};

// Returns true only for the single caller that actually removed the challenge, which makes codes single-use.
export const consumeStudentPasswordReset = async (studentId) => {
  if (isUsingMemoryStore()) {
    const challenges = getMemoryStore().studentPasswordResets;
    const index = challenges.findIndex((item) => item.studentId === studentId);
    if (index === -1) return false;
    challenges.splice(index, 1);
    return true;
  }
  const result = await getCollection(env.studentPasswordResetsCollection).deleteOne({ studentId });
  return result.deletedCount === 1;
};

export const recordFailedPasswordResetAttempt = async (studentId, attempts) => {
  if (isUsingMemoryStore()) {
    const challenge = getMemoryStore().studentPasswordResets.find((item) => item.studentId === studentId);
    if (challenge) challenge.attempts = attempts;
    return;
  }
  await getCollection(env.studentPasswordResetsCollection).updateOne({ studentId }, { $set: { attempts } });
};

export const isPasswordResetCodeValid = (challenge, code) => Boolean(
  challenge
  && challenge.expiresAt.getTime() > Date.now()
  && challenge.attempts < MAX_PASSWORD_RESET_ATTEMPTS
  && timingSafeEqualHex(hashResetCode(code), challenge.codeHash),
);
