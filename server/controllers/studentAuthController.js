import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import { saveStudentFiles } from '../models/studentFileModel.js';
import { createStudentSession, deleteStudentSession } from '../models/studentSessionModel.js';
import { clearStudentSessionCookie, getStudentSessionToken, setStudentSessionCookie } from '../middleware/studentAuth.js';
import { findStudentByEmail, formatStudentResponse, insertStudent } from '../models/studentModel.js';
import { AppError, cleanString, isValidEmail, normalizeEmail, requireFields, sendSuccess } from '../middleware/http.js';

const requiredRegistrationFields = [
  'fullName',
  'email',
  'password',
  'mobileNumber',
  'country',
  'targetCountry',
  'targetUniversity',
  'courseOfStudy',
  'intakeSession',
  'consent',
];

export const registerStudent = async (req, res) => {
  const payload = req.body;
  requireFields(payload, requiredRegistrationFields);

  if (!isValidEmail(payload.email)) {
    throw new AppError('Invalid email address', 400);
  }

  if (typeof payload.password !== 'string' || payload.password.length < 6) {
    throw new AppError('Password must be at least 6 characters', 400);
  }

  if (!payload.consent) {
    throw new AppError('Consent is required', 400);
  }

  const now = new Date();
  const mongoId = new ObjectId();

  const studentDocument = {
    _id: mongoId,
    id: mongoId.toString(),
    fullName: cleanString(payload.fullName),
    dateOfBirth: cleanString(payload.dateOfBirth),
    email: normalizeEmail(payload.email),
    mobileNumber: cleanString(payload.mobileNumber),
    countryCode: cleanString(payload.countryCode),
    country: cleanString(payload.country),
    passportNumber: cleanString(payload.passportNumber),
    profilePicture: payload.profilePicture || '',
    targetCountry: cleanString(payload.targetCountry),
    targetUniversity: cleanString(payload.targetUniversity),
    customUniversity: cleanString(payload.customUniversity),
    highestQualification: cleanString(payload.highestQualification),
    previousInstitution: cleanString(payload.previousInstitution),
    cgpa: cleanString(payload.cgpa),
    courseOfStudy: cleanString(payload.courseOfStudy),
    intakeSession: cleanString(payload.intakeSession),
    currentStage: cleanString(payload.currentStage) || 'Initial Consultation',
    status: 'pending',
    consent: Boolean(payload.consent),
    uploads: {
      passport: payload.uploads?.passport || req.files?.passport?.[0]?.originalname || '',
      transcripts: payload.uploads?.transcripts || req.files?.transcripts?.[0]?.originalname || '',
      cv: payload.uploads?.cv || req.files?.cv?.[0]?.originalname || '',
    },
    password: await bcrypt.hash(payload.password, 10),
    createdAt: now,
    updatedAt: now,
  };

  try {
    await insertStudent(studentDocument);
    await saveStudentFiles(mongoId.toString(), req.files);
    sendSuccess(res, { statusCode: 201, message: 'Registration saved' });
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError('Email already registered', 409);
    }
    throw error;
  }
};

export const loginStudent = async (req, res) => {
  const { email, password } = req.body;
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    throw new AppError('Email and password are required', 400);
  }

  const student = await findStudentByEmail(normalizeEmail(email));
  if (!student) {
    throw new AppError('Invalid email or password', 401);
  }

  const validPassword = await bcrypt.compare(password, student.password);
  if (!validPassword) {
    throw new AppError('Invalid email or password', 401);
  }

  await deleteStudentSession(getStudentSessionToken(req));
  const session = await createStudentSession(student._id.toString());
  setStudentSessionCookie(res, session.token, session.expiresAt);

  sendSuccess(res, {
    message: 'Login successful',
    data: {
      expiresAt: session.expiresAt.toISOString(),
      user: {
        ...formatStudentResponse(student),
        fullName: student.fullName,
        name: student.fullName,
      },
    },
  });
};

export const getStudentMe = (req, res) => {
  sendSuccess(res, {
    data: {
      user: formatStudentResponse(req.student),
      expiresAt: req.studentSession.expiresAt.toISOString(),
    },
  });
};

export const logoutStudent = async (req, res) => {
  await deleteStudentSession(getStudentSessionToken(req));
  clearStudentSessionCookie(res);
  sendSuccess(res, { message: 'Logged out' });
};
