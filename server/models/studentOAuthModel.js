import crypto from 'node:crypto';
import { ObjectId } from 'mongodb';
import { env } from '../config/env.js';
import { getCollection, getMemoryStore, isUsingMemoryStore } from '../config/database.js';

const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');

export const createStudentOAuthState = async ({ state, nonce, codeVerifier }) => {
  const record = {
    _id: new ObjectId(),
    stateHash: hash(state),
    nonce,
    codeVerifier,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  };
  if (isUsingMemoryStore()) getMemoryStore().studentOAuthStates.push(record);
  else await getCollection(env.studentOAuthStatesCollection).insertOne(record);
  return record;
};

export const consumeStudentOAuthState = async (state) => {
  const stateHash = hash(state);
  if (isUsingMemoryStore()) {
    const states = getMemoryStore().studentOAuthStates;
    const index = states.findIndex((item) => item.stateHash === stateHash && item.expiresAt.getTime() > Date.now());
    if (index === -1) return null;
    const [record] = states.splice(index, 1);
    return record;
  }
  const result = await getCollection(env.studentOAuthStatesCollection).findOneAndDelete({
    stateHash,
    expiresAt: { $gt: new Date() },
  });
  return result.value || result;
};

export const createStudentOAuthPending = async ({ subject, email, fullName, profilePicture }) => {
  const token = crypto.randomBytes(32).toString('hex');
  const record = {
    _id: new ObjectId(),
    tokenHash: hash(token),
    provider: 'google',
    subject,
    email,
    fullName,
    profilePicture: profilePicture || '',
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  };
  if (isUsingMemoryStore()) getMemoryStore().studentOAuthPending.push(record);
  else await getCollection(env.studentOAuthPendingCollection).insertOne(record);
  return { token, expiresAt: record.expiresAt };
};

export const consumeStudentOAuthPending = async (token) => {
  const tokenHash = hash(token);
  if (isUsingMemoryStore()) {
    const pending = getMemoryStore().studentOAuthPending;
    const index = pending.findIndex((item) => item.tokenHash === tokenHash && item.expiresAt.getTime() > Date.now());
    if (index === -1) return null;
    const [record] = pending.splice(index, 1);
    return record;
  }
  const result = await getCollection(env.studentOAuthPendingCollection).findOneAndDelete({
    tokenHash,
    expiresAt: { $gt: new Date() },
  });
  return result.value || result;
};

export const findStudentOAuthPending = async (token) => {
  const tokenHash = hash(token);
  if (isUsingMemoryStore()) {
    return getMemoryStore().studentOAuthPending.find((item) => (
      item.tokenHash === tokenHash && item.expiresAt.getTime() > Date.now()
    )) || null;
  }
  return getCollection(env.studentOAuthPendingCollection).findOne({
    tokenHash,
    expiresAt: { $gt: new Date() },
  });
};
