import bcrypt from 'bcryptjs';
import { findStudentByEmail, formatStudentResponse, insertStudent } from '../models/studentModel.js';
import { AppError, cleanString, isValidEmail, normalizeEmail, requireFields, sendSuccess } from '../middleware/http.js';

const requiredRegistrationFields = [
  'fullName',
  'email',
  'password',
  'mobileNumber',
  'country',
  'passportNumber',
  'targetCountry',
  'targetUniversity',
  'courseOfStudy',
  'intakeSession',
  'currentStage',
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

  const studentDocument = {
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
    currentStage: cleanString(payload.currentStage),
    status: 'pending',
    consent: Boolean(payload.consent),
    uploads: {
      passport: payload.uploads?.passport || '',
      transcripts: payload.uploads?.transcripts || '',
      cv: payload.uploads?.cv || '',
    },
    password: await bcrypt.hash(payload.password, 10),
    createdAt: new Date(),
    id: `memory-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  };

  try {
    await insertStudent(studentDocument);
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
  if (!email || !password) {
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

  sendSuccess(res, {
    message: 'Login successful',
    data: {
      user: {
        ...formatStudentResponse(student),
        fullName: student.fullName,
        name: student.fullName,
      },
    },
  });
};
