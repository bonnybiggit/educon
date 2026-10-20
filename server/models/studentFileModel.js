import { ObjectId } from 'mongodb';
import { env } from '../config/env.js';
import { getCollection, getMemoryStore, isUsingMemoryStore } from '../config/database.js';

export const saveStudentFiles = async (studentId, files) => {
  const documents = Object.entries(files || {})
    .filter(([, entries]) => entries?.[0])
    .map(([field, entries]) => {
      const file = entries[0];
      return {
        _id: new ObjectId(),
        studentId,
        field,
        filename: file.originalname,
        contentType: file.mimetype,
        size: file.size,
        data: file.buffer,
        createdAt: new Date(),
      };
    });

  if (!documents.length) return;

  if (isUsingMemoryStore()) {
    getMemoryStore().studentFiles.push(...documents);
    return;
  }

  await getCollection(env.studentFilesCollection).insertMany(documents);
};

export const findStudentFile = async (studentId, field) => {
  if (isUsingMemoryStore()) {
    return getMemoryStore().studentFiles.find((file) => file.studentId === studentId && file.field === field) || null;
  }
  return getCollection(env.studentFilesCollection).findOne({ studentId, field });
};

export const replaceStudentFiles = async (studentId, files, { session } = {}) => {
  const documents = Object.entries(files || {})
    .filter(([, entries]) => entries?.[0])
    .map(([field, entries]) => {
      const file = entries[0];
      return {
        _id: new ObjectId(),
        studentId,
        field,
        filename: file.originalname,
        contentType: file.mimetype,
        size: file.size,
        data: file.buffer,
        createdAt: new Date(),
      };
    });

  if (isUsingMemoryStore()) {
    const storedFiles = getMemoryStore().studentFiles;
    documents.forEach((document) => {
      const index = storedFiles.findIndex((file) => file.studentId === studentId && file.field === document.field);
      if (index === -1) storedFiles.push(document);
      else storedFiles[index] = document;
    });
    return;
  }

  const options = { upsert: true, ...(session ? { session } : {}) };
  // Sequential: operations in one transaction session cannot run in parallel.
  for (const document of documents) {
    const replacement = { ...document };
    delete replacement._id; // an existing document's immutable _id must not change
    await getCollection(env.studentFilesCollection).replaceOne({ studentId, field: replacement.field }, replacement, options);
  }
};