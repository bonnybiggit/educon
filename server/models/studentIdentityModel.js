import { ObjectId } from 'mongodb';
import { env } from '../config/env.js';
import { getCollection, getMemoryStore, isUsingMemoryStore } from '../config/database.js';

export const findStudentIdentity = async (provider, subject) => {
  if (isUsingMemoryStore()) {
    return getMemoryStore().studentIdentities.find((identity) => (
      identity.provider === provider && identity.subject === subject
    )) || null;
  }
  return getCollection(env.studentIdentitiesCollection).findOne({ provider, subject });
};

export const createStudentIdentity = async ({ provider, subject, studentId, email }) => {
  const identity = {
    _id: new ObjectId(),
    provider,
    subject,
    studentId,
    email,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  if (isUsingMemoryStore()) {
    getMemoryStore().studentIdentities.push(identity);
  } else {
    await getCollection(env.studentIdentitiesCollection).insertOne(identity);
  }
  return identity;
};
