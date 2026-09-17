import crypto from 'node:crypto';
import { ObjectId } from 'mongodb';
import { env } from '../config/env.js';
import { getCollection, getMemoryStore, isUsingMemoryStore } from '../config/database.js';

export const VERIFICATION_CODE_TTL_MS = 10 * 60 * 1000;
export const VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;
export const MAX_VERIFICATION_ATTEMPTS = 5;

const hashVerificationCode = (code) => crypto
  .createHmac('sha256', env.emailVerificationCodePepper || 'development-verification-pepper')
  .update(code)
  .digest('hex');

export const generateVerificationCode = () => crypto.randomInt(100000, 1000000).toString();

export const createOrReplaceStudentEmailVerification = async (studentId) => {
  const code = generateVerificationCode();
  const now = new Date();
  const challenge = {
    _id: new ObjectId(),
    studentId,
    codeHash: hashVerificationCode(code),
    expiresAt: new Date(now.getTime() + VERIFICATION_CODE_TTL_MS),
    attempts: 0,
    resendAvailableAt: new Date(now.getTime() + VERIFICATION_RESEND_COOLDOWN_MS),
    createdAt: now,
  };

  if (isUsingMemoryStore()) {
    const challenges = getMemoryStore().studentEmailVerifications;
    const index = challenges.findIndex((item) => item.studentId === studentId);
    if (index === -1) challenges.push(challenge);
    else challenges[index] = challenge;
  } else {
    await getCollection(env.studentEmailVerificationsCollection).replaceOne(
      { studentId },
      challenge,
      { upsert: true },
    );
  }

  return { code, challenge };
};

export const findStudentEmailVerification = async (studentId) => {
  if (isUsingMemoryStore()) {
    return getMemoryStore().studentEmailVerifications.find((item) => item.studentId === studentId) || null;
  }
  return getCollection(env.studentEmailVerificationsCollection).findOne({ studentId });
};

export const deleteStudentEmailVerification = async (studentId) => {
  if (isUsingMemoryStore()) {
    const challenges = getMemoryStore().studentEmailVerifications;
    const index = challenges.findIndex((item) => item.studentId === studentId);
    if (index !== -1) challenges.splice(index, 1);
    return;
  }
  await getCollection(env.studentEmailVerificationsCollection).deleteOne({ studentId });
};

export const recordFailedVerificationAttempt = async (studentId, attempts) => {
  if (isUsingMemoryStore()) {
    const challenge = getMemoryStore().studentEmailVerifications.find((item) => item.studentId === studentId);
    if (challenge) challenge.attempts = attempts;
    return;
  }
  await getCollection(env.studentEmailVerificationsCollection).updateOne(
    { studentId },
    { $set: { attempts } },
  );
};

export const isVerificationCodeValid = (challenge, code) => (
  challenge
  && challenge.expiresAt.getTime() > Date.now()
  && challenge.attempts < MAX_VERIFICATION_ATTEMPTS
  && hashVerificationCode(code) === challenge.codeHash
);

export { hashVerificationCode };
