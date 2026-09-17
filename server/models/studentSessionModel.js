import crypto from 'node:crypto';
import { getCollection, getMemoryStore, isUsingMemoryStore } from '../config/database.js';
import { env } from '../config/env.js';

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export const createStudentSession = async (studentId) => {
  const token = crypto.randomBytes(32).toString('hex');
  const lifetime = Number.isFinite(env.jwtExpiresInSeconds) && env.jwtExpiresInSeconds > 0
    ? env.jwtExpiresInSeconds : 8 * 60 * 60;
  const session = {
    _id: hashToken(token),
    studentId,
    expiresAt: new Date(Date.now() + lifetime * 1000),
  };
  if (isUsingMemoryStore()) {
    getMemoryStore().studentSessions.push(session);
  } else {
    await getCollection('studentSessions').insertOne(session);
  }
  return { token, expiresAt: session.expiresAt };
};

export const findStudentSession = async (token) => {
  if (!/^[a-f0-9]{64}$/.test(token || '')) return null;
  const id = hashToken(token);
  const session = isUsingMemoryStore()
    ? getMemoryStore().studentSessions.find((item) => item._id === id)
    : await getCollection('studentSessions').findOne({ _id: id });
  return session && session.expiresAt.getTime() > Date.now() ? session : null;
};

export const deleteStudentSession = async (token) => {
  if (!/^[a-f0-9]{64}$/.test(token || '')) return;
  const id = hashToken(token);
  if (isUsingMemoryStore()) {
    const sessions = getMemoryStore().studentSessions;
    const index = sessions.findIndex((item) => item._id === id);
    if (index !== -1) sessions.splice(index, 1);
  } else {
    await getCollection('studentSessions').deleteOne({ _id: id });
  }
};
