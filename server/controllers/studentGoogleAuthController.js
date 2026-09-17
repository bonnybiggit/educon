import crypto from 'node:crypto';
import { ObjectId } from 'mongodb';
import { OAuth2Client } from 'google-auth-library';
import { env, isProduction } from '../config/env.js';
import { saveStudentFiles } from '../models/studentFileModel.js';
import { createStudentSession } from '../models/studentSessionModel.js';
import { createStudentIdentity, findStudentIdentity } from '../models/studentIdentityModel.js';
import { consumeStudentOAuthPending, consumeStudentOAuthState, createStudentOAuthPending, createStudentOAuthState, findStudentOAuthPending } from '../models/studentOAuthModel.js';
import { findStudentByEmail, formatStudentResponse, insertStudent } from '../models/studentModel.js';
import { validateStudentProfile } from './studentAuthController.js';
import { AppError, asyncHandler, cleanString, normalizeEmail, sendSuccess } from '../middleware/http.js';
import { setStudentSessionCookie } from '../middleware/studentAuth.js';

const provider = 'google';
const allowedIssuers = new Set(['accounts.google.com', 'https://accounts.google.com']);
const pendingCookieName = 'educon_student_google_pending';

const getGoogleClient = () => {
  if (!env.googleClientId || !env.googleClientSecret || !env.googleRedirectUri) {
    throw new AppError('Google authentication is not configured', 503);
  }
  return new OAuth2Client(env.googleClientId, env.googleClientSecret, env.googleRedirectUri);
};

const getFrontendUrl = () => env.frontendUrl.replace(/\/+$/, '');
const redirectTo = (path) => `${getFrontendUrl()}${path}`;

const setPendingCookie = (res, token, expiresAt) => {
  res.cookie(pendingCookieName, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/api',
    expires: expiresAt,
  });
};

const getPendingToken = (req) => {
  const cookie = (req.headers.cookie || '').split(';')
    .map((part) => part.trim()).find((part) => part.startsWith(`${pendingCookieName}=`));
  return cookie ? cookie.slice(pendingCookieName.length + 1) : '';
};

const clearPendingCookie = (res) => res.clearCookie(pendingCookieName, {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  path: '/api',
});

export const validateGoogleIdTokenClaims = (payload, { clientId, nonce }) => {
  if (!payload || !payload.sub || !payload.email || payload.email_verified !== true) {
    throw new AppError('Google account email is not verified', 401);
  }
  if (!allowedIssuers.has(payload.iss)) throw new AppError('Invalid Google token issuer', 401);
  if (payload.aud !== clientId) throw new AppError('Invalid Google token audience', 401);
  if (!Number.isFinite(Number(payload.exp)) || Number(payload.exp) <= Math.floor(Date.now() / 1000)) {
    throw new AppError('Expired Google token', 401);
  }
  if (payload.nonce !== nonce) throw new AppError('Invalid Google token nonce', 401);
  return payload;
};

export const startGoogleStudentAuth = asyncHandler(async (_req, res) => {
  const client = getGoogleClient();
  const state = crypto.randomBytes(32).toString('hex');
  const nonce = crypto.randomBytes(32).toString('hex');
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  await createStudentOAuthState({ state, nonce, codeVerifier });
  res.set('Cache-Control', 'no-store');
  res.redirect(client.generateAuthUrl({
    access_type: 'online',
    scope: ['openid', 'email', 'profile'],
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  }));
});

export const completeGoogleStudentAuth = asyncHandler(async (req, res) => {
  if (req.query.error) throw new AppError('Google authentication was cancelled', 400);
  const { code, state } = req.query;
  if (typeof code !== 'string' || typeof state !== 'string') {
    throw new AppError('Invalid Google authentication callback', 400);
  }

  const oauthState = await consumeStudentOAuthState(state);
  if (!oauthState) throw new AppError('Invalid or expired Google authentication state', 400);

  const client = getGoogleClient();
  const { tokens } = await client.getToken({ code, codeVerifier: oauthState.codeVerifier });
  if (!tokens.id_token) throw new AppError('Google did not return an ID token', 401);
  const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: env.googleClientId });
  const claims = validateGoogleIdTokenClaims(ticket.getPayload(), {
    clientId: env.googleClientId,
    nonce: oauthState.nonce,
  });
  const email = claims.email.trim().toLowerCase();
  const identity = await findStudentIdentity(provider, claims.sub);

  if (identity) {
    const session = await createStudentSession(identity.studentId);
    setStudentSessionCookie(res, session.token, session.expiresAt);
    res.redirect(redirectTo('/dashboard'));
    return;
  }

  const pending = await createStudentOAuthPending({
    subject: claims.sub,
    email,
    fullName: claims.name || '',
    profilePicture: claims.picture || '',
  });
  setPendingCookie(res, pending.token, pending.expiresAt);
  res.redirect(redirectTo('/portal/setup?oauth=pending'));
});

export const completeGoogleStudentProfile = asyncHandler(async (req, res) => {
  const pendingToken = getPendingToken(req);
  if (!pendingToken) throw new AppError('Google profile completion is not authorized', 401);

  const pending = await findStudentOAuthPending(pendingToken);
  if (!pending) throw new AppError('Google profile completion has expired', 401);

  const payload = req.body || {};
  validateStudentProfile(payload);
  const email = normalizeEmail(payload.email);
  if (email !== pending.email) {
    throw new AppError('Profile email does not match the authenticated Google account', 403);
  }
  if (await findStudentByEmail(email)) {
    throw new AppError('Email already registered', 409);
  }
  if (await findStudentIdentity(provider, pending.subject)) {
    throw new AppError('Google account is already linked', 409);
  }

  const consumedPending = await consumeStudentOAuthPending(pendingToken);
  if (!consumedPending) throw new AppError('Google profile completion has expired', 401);

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
    passportNumber: cleanString(payload.passportNumber),
    profilePicture: payload.profilePicture || consumedPending.profilePicture || '',
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
    consent: true,
    uploads: {
      passport: req.files?.passport?.[0]?.originalname || '',
      transcripts: req.files?.transcripts?.[0]?.originalname || '',
      cv: req.files?.cv?.[0]?.originalname || '',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    await insertStudent(studentDocument);
    await saveStudentFiles(mongoId.toString(), req.files);
    await createStudentIdentity({
      provider,
      subject: consumedPending.subject,
      studentId: mongoId.toString(),
      email,
    });
  } catch (error) {
    if (error.code === 11000) throw new AppError('Google account or email is already linked', 409);
    throw error;
  }

  const session = await createStudentSession(mongoId.toString());
  setStudentSessionCookie(res, session.token, session.expiresAt);
  clearPendingCookie(res);
  sendSuccess(res, {
    statusCode: 201,
    message: 'Google student profile completed',
    data: {
      expiresAt: session.expiresAt.toISOString(),
      user: formatStudentResponse(studentDocument),
    },
  });
});

