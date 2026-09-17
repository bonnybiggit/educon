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