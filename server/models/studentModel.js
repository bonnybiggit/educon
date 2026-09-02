import { ObjectId } from 'mongodb';
import { env } from '../config/env.js';
import { getCollection, getMemoryStore, isUsingMemoryStore } from '../config/database.js';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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

export const findAdminStudents = async ({ search = '', status = 'all', stage = 'all', page = 1, limit = 10 } = {}) => {
  const normalizedSearch = String(search || '').trim().toLowerCase();
  const normalizedStatus = String(status || 'all').trim().toLowerCase();
  const normalizedStage = String(stage || 'all').trim();
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);
  const skip = (safePage - 1) * safeLimit;

  if (isUsingMemoryStore()) {
    let students = [...getMemoryStore().students];

    if (normalizedSearch) {
      students = students.filter((student) => [
        student.fullName,
        student.email,
        student.mobileNumber,
      ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch)));
    }

    if (normalizedStatus !== 'all') {
      students = students.filter((student) => student.status === normalizedStatus);
    }

    if (normalizedStage !== 'all') {
      students = students.filter((student) => student.currentStage === normalizedStage);
    }

    students.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = students.length;
    return {
      students: students.slice(skip, skip + safeLimit),
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.max(Math.ceil(total / safeLimit), 1),
    };
  }

  const query = {};

  if (normalizedSearch) {
    const searchRegex = escapeRegex(normalizedSearch);
    query.$or = [
      { fullName: { $regex: searchRegex, $options: 'i' } },
      { email: { $regex: searchRegex, $options: 'i' } },
      { mobileNumber: { $regex: searchRegex, $options: 'i' } },
    ];
  }

  if (normalizedStatus !== 'all') {
    query.status = normalizedStatus;
  }

  if (normalizedStage !== 'all') {
    query.currentStage = normalizedStage;
  }

  const collection = getCollection(env.studentsCollection);
  const [students, total] = await Promise.all([
    collection.find(query).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).toArray(),
    collection.countDocuments(query),
  ]);

  return {
    students,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(Math.ceil(total / safeLimit), 1),
  };
};

export const getStudentSummary = async () => {
  if (isUsingMemoryStore()) {
    const students = getMemoryStore().students;
    return {
      total: students.length,
      pending: students.filter((student) => student.status === 'pending').length,
      review: students.filter((student) => student.status === 'in review').length,
      approved: students.filter((student) => student.status === 'accepted').length,
    };
  }

  const collection = getCollection(env.studentsCollection);
  const [total, pending, review, approved] = await Promise.all([
    collection.countDocuments({}),
    collection.countDocuments({ status: 'pending' }),
    collection.countDocuments({ status: 'in review' }),
    collection.countDocuments({ status: 'accepted' }),
  ]);

  return { total, pending, review, approved };
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
