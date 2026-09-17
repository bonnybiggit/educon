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

export const replaceStudentFiles = async (studentId, files) => {
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

  await Promise.all(documents.map((document) => getCollection(env.studentFilesCollection).replaceOne(
    { studentId, field: document.field },
    document,
    { upsert: true },
  )));
};