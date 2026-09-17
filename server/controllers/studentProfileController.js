import { replaceStudentFiles } from '../models/studentFileModel.js';
import { formatStudentResponse, updateStudentProfileById } from '../models/studentModel.js';
import { AppError, asyncHandler, cleanString, sendSuccess } from '../middleware/http.js';

const allowedStages = [
  'Initial Consultation',
  'Document Preparation',
  'Application Submitted',
  'Document Verification',
  'CAS Letter Processing',
  'Visa Preparation',
];

const profileFields = [
  'dateOfBirth',
  'passportNumber',
  'profilePicture',
  'targetCountry',
  'targetUniversity',
  'customUniversity',
  'highestQualification',
  'previousInstitution',
  'cgpa',
  'courseOfStudy',
  'intakeSession',
  'currentStage',
];

const requiredCompletionFields = [
  'dateOfBirth',
  'passportNumber',
  'targetCountry',
  'targetUniversity',
  'courseOfStudy',
  'intakeSession',
  'currentStage',
  'uploads.passport',
  'uploads.transcripts',
  'uploads.cv',
];

const forbiddenFields = new Set(['email', 'studentId', 'id', '_id', 'password', 'confirmPassword', 'provider', 'subject', 'authProviders']);

export const calculateProfileCompletion = (student) => {
  const completedFields = requiredCompletionFields.filter((field) => {
    const value = field.startsWith('uploads.')
      ? student.uploads?.[field.slice('uploads.'.length)]
      : student[field];
    return typeof value === 'string' ? value.trim() !== '' : Boolean(value);
  });
  const totalFields = requiredCompletionFields.length;
  return {
    completedFields: completedFields.length,
    totalFields,
    percentage: Math.round((completedFields.length / totalFields) * 100),
    isComplete: completedFields.length === totalFields,
    missingFields: requiredCompletionFields.filter((field) => !completedFields.includes(field)),
  };
};

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

  if (patch.currentStage && !allowedStages.includes(patch.currentStage)) {
    throw new AppError('Invalid current stage', 400);
  }
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

  const updatedStudent = await updateStudentProfileById(studentId, patch);
  if (!updatedStudent) throw new AppError('Student profile not found', 404);
  await replaceStudentFiles(studentId, incomingFiles);

  sendSuccess(res, { message: 'Student profile updated', data: buildProfileResponse(updatedStudent) });
});
