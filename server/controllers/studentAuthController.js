import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import { createStudentSession, deleteStudentSession } from '../models/studentSessionModel.js';
import { clearStudentSessionCookie, getStudentSessionToken, setStudentSessionCookie } from '../middleware/studentAuth.js';
import { deleteStudentById, findStudentByEmail, formatStudentResponse, insertStudent } from '../models/studentModel.js';
import { issueStudentVerificationCode } from './studentEmailVerificationController.js';
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
const requiredStudentProfileFields = requiredRegistrationFields.filter((field) => field !== 'password');
const requiredAccountFields = ['fullName', 'email', 'password', 'country', 'mobileNumber', 'consent'];

export const validateStudentAccount = (payload) => {
  requireFields(payload, requiredAccountFields);
  if (!isValidEmail(payload.email)) throw new AppError('Invalid email address', 400);
  if (typeof payload.password !== 'string' || payload.password.length < 6) {
    throw new AppError('Password must be at least 6 characters', 400);
  }
  if (payload.consent !== true && payload.consent !== 'true') {
    throw new AppError('Consent is required', 400);
  }
};

export const validateStudentProfile = (payload) => {
  requireFields(payload, requiredStudentProfileFields);

  if (!isValidEmail(payload.email)) {
    throw new AppError('Invalid email address', 400);
  }

  const consentGiven = payload.consent === true || payload.consent === 'true';
  if (!consentGiven) {
    throw new AppError('Consent is required', 400);
  }
};

export const registerStudent = async (req, res) => {
  const payload = req.body;
  validateStudentAccount(payload);
  const email = normalizeEmail(payload.email);
  const existingStudent = await findStudentByEmail(email);
  const genericResponse = () => sendSuccess(res, {
    statusCode: 202,
    message: 'If the account can be registered, a verification code has been sent.',
    data: { verificationRequired: true },
  });
  if (existingStudent) {
    genericResponse();
    return;
  }

  const now = new Date();
  const mongoId = new ObjectId();

  const studentDocument = {
    _id: mongoId,
    id: mongoId.toString(),
    fullName: cleanString(payload.fullName),
    dateOfBirth: cleanString(payload.dateOfBirth),
    email,
    mobileNumber: cleanString(payload.mobileNumber),
    countryCode: cleanString(payload.countryCode),
    country: cleanString(payload.country),
    emailVerified: false,
    emailVerifiedAt: null,
    profileCompleted: false,
    status: 'pending',
    consent: true,
    password: await bcrypt.hash(payload.password, 10),
    createdAt: now,
    updatedAt: now,
  };

  try {
    await insertStudent(studentDocument);
    try {
      await issueStudentVerificationCode(studentDocument);
    } catch (error) {
      await deleteStudentById(mongoId.toString());
      throw error;
    }
    genericResponse();
  } catch (error) {
    if (error.code === 11000) {
      genericResponse();
      return;
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

  if (student.emailVerified === false) {
    throw new AppError('Email verification required', 403);
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
