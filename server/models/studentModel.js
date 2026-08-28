import { ObjectId } from 'mongodb';
import { env } from '../config/env.js';
import { getCollection, getMemoryStore, isUsingMemoryStore } from '../config/database.js';

export const formatStudentResponse = (student) => ({
  ...student,
  _id: undefined,
  password: undefined,
  id: student._id ? student._id.toString() : student.id,
  createdAt: student.createdAt?.toISOString ? student.createdAt.toISOString() : new Date(student.createdAt).toISOString(),
  updatedAt: student.updatedAt?.toISOString ? student.updatedAt.toISOString() : student.updatedAt ? new Date(student.updatedAt).toISOString() : undefined,
});

export const findStudentByEmail = async (email) => {
  if (isUsingMemoryStore()) {
    return getMemoryStore().students.find((student) => student.email.toLowerCase() === email.toLowerCase()) || null;
  }
  return getCollection(env.studentsCollection).findOne({ email });
};

export const insertStudent = async (studentDocument) => {
  if (isUsingMemoryStore()) {
    const students = getMemoryStore().students;
    const emailAlreadyExists = students.some((student) => student.email.toLowerCase() === studentDocument.email.toLowerCase());
    if (emailAlreadyExists) {
      const error = new Error('Email already registered');
      error.code = 11000;
      throw error;
    }
    students.unshift(studentDocument);
    return { insertedId: studentDocument.id };
  }
  return getCollection(env.studentsCollection).insertOne(studentDocument);
};

export const findStudents = async () => {
  if (isUsingMemoryStore()) {
    return [...getMemoryStore().students].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  return getCollection(env.studentsCollection).find().sort({ createdAt: -1 }).toArray();
};

export const updateStudentById = async (id, patch) => {
  if (isUsingMemoryStore()) {
    const students = getMemoryStore().students;
    const studentIndex = students.findIndex((student) => student.id === id || student._id?.toString?.() === id);
    if (studentIndex === -1) return null;

    const student = students[studentIndex];
    Object.assign(student, patch, { updatedAt: new Date() });
    return student;
  }

  return getCollection(env.studentsCollection).findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { ...patch, updatedAt: new Date() } },
    { returnDocument: 'after' }
  );
};
