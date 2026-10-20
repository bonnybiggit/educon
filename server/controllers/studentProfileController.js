import { runInTransaction } from '../config/database.js';
import { replaceStudentFiles } from '../models/studentFileModel.js';
import { findStudentById, formatStudentResponse, submitStudentApplicationById, updateStudentProfileById } from '../models/studentModel.js';
import { AppError, asyncHandler, cleanString, sendSuccess } from '../middleware/http.js';

// currentStage is intentionally excluded: it is admin-controlled application progress,
// students may only view it (see server/controllers/adminStudentController.js).
const profileFields = [
  'dateOfBirth',
  'passportNumber',
  'profilePicture',
  'mobileNumber',
  'country',
  'fullAddress',
  'targetCountry',
  'targetUniversity',
  'customUniversity',
  'highestQualification',
  'previousInstitution',
  'cgpa',
  'courseOfStudy',
  'intakeSession',
];

const requiredCompletionFields = [
  'dateOfBirth',
  'passportNumber',
  'targetCountry',
  'targetUniversity',
  'highestQualification',
  'previousInstitution',
  'cgpa',
  'courseOfStudy',
  'intakeSession',
  'uploads.waec',
  'uploads.waecScratchCard',
  'uploads.degreeCertificate',
  'uploads.transcripts',
  'uploads.passport',
  'uploads.cv',
  'uploads.statementOfPurpose',
  'uploads.academicReferenceLetter',
  'uploads.professionalReferenceLetter',
];

const forbiddenFields = new Set(['email', 'studentId', 'id', '_id', 'password', 'confirmPassword', 'provider', 'subject', 'authProviders']);

// Single completeness rule used for progress display, profileCompleted and submission.
export const calculateProfileCompletion = (student) => {
  const requiredFields = student.targetUniversity === 'OTHER'
    ? [...requiredCompletionFields, 'customUniversity']
    : requiredCompletionFields;
  const completedFields = requiredFields.filter((field) => {
    const value = field.startsWith('uploads.')
      ? student.uploads?.[field.slice('uploads.'.length)]
      : student[field];
    return typeof value === 'string' ? value.trim() !== '' : Boolean(value);
  });
  const totalFields = requiredFields.length;
  return {
    completedFields: completedFields.length,
    totalFields,
    percentage: Math.round((completedFields.length / totalFields) * 100),
    isComplete: completedFields.length === totalFields,
    missingFields: requiredFields.filter((field) => !completedFields.includes(field)),
  };
};

const SUBMITTED_MESSAGE = 'Your application has been submitted and can no longer be edited';

const validateProfilePatch = (payload) => {
  const submittedFields = Object.keys(payload);
  const forbidden = submittedFields.find((field) => forbiddenFields.has(field));
  if (forbidden) throw new AppError(`${forbidden} cannot be changed here`, 400);

  const unknown = submittedFields.find((field) => !profileFields.includes(field));
  if (unknown) throw new AppError(`Unsupported profile field: ${unknown}`, 400);

  const patch = {};
  submittedFields.forEach((field) => {
    if (typeof payload[field] !== 'string') throw new AppError(`Invalid ${field}`, 400);
    patch[field] = cleanString(payload[field]);
  });

  if (patch.profilePicture && patch.profilePicture.length > 3 * 1024 * 1024) {
    throw new AppError('Profile picture must be 3MB or smaller', 400);
  }
  return patch;
};

const buildProfileResponse = (student) => ({
  profile: formatStudentResponse(student),
  completion: calculateProfileCompletion(student),
});

export const getStudentProfile = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  sendSuccess(res, { data: buildProfileResponse(req.student) });
});

export const updateStudentProfile = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (req.student.submittedAt) throw new AppError(SUBMITTED_MESSAGE, 409);
  const patch = validateProfilePatch(req.body || {});
  const studentId = req.student._id.toString();
  const existingUploads = { ...(req.student.uploads || {}) };
  const incomingFiles = req.files || {};

  Object.entries(incomingFiles).forEach(([field, entries]) => {
    if (entries?.[0]) existingUploads[field] = entries[0].originalname;
  });

  if (Object.keys(incomingFiles).length) patch.uploads = existingUploads;
  const mergedStudent = { ...req.student, ...patch, uploads: existingUploads };
  patch.profileCompleted = calculateProfileCompletion(mergedStudent).isComplete;

  // Student update and file writes commit together, and only while the application is unsubmitted.
  const updatedStudent = await runInTransaction(async (session) => {
    const updated = await updateStudentProfileById(studentId, patch, { session });
    if (!updated) {
      const current = await findStudentById(studentId);
      throw current?.submittedAt ? new AppError(SUBMITTED_MESSAGE, 409) : new AppError('Student profile not found', 404);
    }
    await replaceStudentFiles(studentId, incomingFiles, { session });
    return updated;
  });
  sendSuccess(res, { message: 'Student profile updated', data: buildProfileResponse(updatedStudent) });
});

export const submitStudentApplication = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (req.student.submittedAt) throw new AppError('Your application has already been submitted', 409);

  // Capture the version used for validation; the final update only applies if it is unchanged.
  const validatedUpdatedAt = req.student.updatedAt ?? null;
  const { isComplete, missingFields } = calculateProfileCompletion(req.student);
  if (!isComplete) {
    throw new AppError(`Application is incomplete. Missing: ${missingFields.join(', ')}`, 400);
  }

  const studentId = req.student._id.toString();
  const submittedStudent = await submitStudentApplicationById(studentId, validatedUpdatedAt);
  if (!submittedStudent) {
    const current = await findStudentById(studentId);
    throw new AppError(
      current?.submittedAt
        ? 'Your application has already been submitted'
        : 'Your application changed while it was being submitted. Please reload and review your application before submitting again.',
      409,
    );
  }

  sendSuccess(res, { message: 'Application submitted', data: buildProfileResponse(submittedStudent) });
});
