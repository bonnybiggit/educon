import { ObjectId } from 'mongodb';
import { findStudentFile } from '../models/studentFileModel.js';
import { studentDocumentFields } from '../middleware/studentUploads.js';
import { findAdminStudents, findStudentById, formatStudentResponse, getStudentSummary, updateStudentById } from '../models/studentModel.js';
import { moveToTrash } from '../services/trashService.js';
import { logActivity } from '../services/activityLogService.js';
import { AppError, cleanString, sendSuccess } from '../middleware/http.js';
import { APPLICATION_STAGE_VALUES } from '../constants/applicationStages.js';

const allowedStudentStatuses = ['pending', 'in review', 'accepted', 'declined'];
const allowedStudentStages = APPLICATION_STAGE_VALUES;

export const getAdminStudents = async (req, res) => {
  const { search = '', status = 'all', stage = 'all', page = 1, limit = 10 } = req.query;
  const normalizedStatus = cleanString(status).toLowerCase() || 'all';
  const normalizedStage = cleanString(stage) || 'all';

  if (normalizedStatus !== 'all' && !allowedStudentStatuses.includes(normalizedStatus)) {
    throw new AppError('Invalid student status filter', 400);
  }

  if (normalizedStage !== 'all' && !allowedStudentStages.includes(normalizedStage)) {
    throw new AppError('Invalid student stage filter', 400);
  }

  const [studentResult, summary] = await Promise.all([
    findAdminStudents({ search, status: normalizedStatus, stage: normalizedStage, page, limit }),
    getStudentSummary(),
  ]);

  sendSuccess(res, {
    message: 'Students fetched',
    data: {
      students: studentResult.students.map((student) => formatStudentResponse(student)),
      summary,
      pagination: {
        page: studentResult.page,
        limit: studentResult.limit,
        total: studentResult.total,
        totalPages: studentResult.totalPages,
      },
      filters: {
        statuses: allowedStudentStatuses,
        stages: allowedStudentStages,
      },
    },
  });
};

const inlineSafeTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const downloadSafeTypes = new Set([
  ...inlineSafeTypes,
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const toSafeFilename = (name, field) => {
  const cleaned = String(name || '').replace(/[\\/]/g, '_').replace(/[^\w.\- ]/g, '_').replace(/^\.+/, '').trim();
  return (cleaned || field).slice(0, 120);
};

export const getAdminStudentDocument = async (req, res) => {
  const { id, field } = req.params;
  if (!ObjectId.isValid(id)) throw new AppError('Invalid student id', 400);
  if (!studentDocumentFields.includes(field)) throw new AppError('Unknown document type', 400);

  const student = await findStudentById(id);
  if (!student) throw new AppError('Document not found', 404);
  const studentId = student._id.toString();
  const file = await findStudentFile(studentId, field);
  if (!file || file.studentId !== studentId || !file.data) throw new AppError('Document not found', 404);

  const rawData = file.data.buffer && !Buffer.isBuffer(file.data) ? Buffer.from(file.data.buffer) : file.data;
  const data = Buffer.isBuffer(rawData) ? rawData : Buffer.from(rawData);
  const contentType = downloadSafeTypes.has(file.contentType) ? file.contentType : 'application/octet-stream';
  const wantsInline = req.query.disposition === 'inline' && inlineSafeTypes.has(contentType);
  const filename = toSafeFilename(file.filename, field);

  await logActivity({
    adminId: req.admin.id,
    actorEmail: req.admin.email,
    action: wantsInline ? 'student_document_view' : 'student_document_download',
    resource: 'student_document',
    resourceId: studentId,
    details: { field, filename },
  });

  res.set({
    'Content-Type': contentType,
    'Content-Length': String(data.length),
    'Content-Disposition': `${wantsInline ? 'inline' : 'attachment'}; filename="${filename.replace(/"/g, '')}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'private, no-store',
    'Content-Security-Policy': "default-src 'none'; sandbox",
  });
  res.status(200).send(data);
};

export const updateAdminStudent = async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id) && !id.startsWith('memory-')) {
    throw new AppError('Invalid student id', 400);
  }

  const updates = req.body;
  const patch = {};

  if (typeof updates.currentStage === 'string' && updates.currentStage.trim() !== '') {
    const currentStage = cleanString(updates.currentStage);
    if (!allowedStudentStages.includes(currentStage)) {
      throw new AppError('Invalid student stage', 400);
    }
    patch.currentStage = currentStage;
  }

  if (typeof updates.status === 'string' && updates.status.trim() !== '') {
    const status = cleanString(updates.status);
    if (!allowedStudentStatuses.includes(status)) {
      throw new AppError('Invalid student status', 400);
    }
    patch.status = status;
  }

  if (!Object.keys(patch).length) {
    throw new AppError('No valid fields to update', 400);
  }

  const student = await updateStudentById(id, patch);
  if (!student) {
    throw new AppError('Student not found', 404);
  }

  await logActivity({
    adminId: req.admin.id,
    actorEmail: req.admin.email,
    action: 'student_status_update',
    resource: 'student',
    resourceId: id,
    details: patch,
  });

  sendSuccess(res, {
    message: 'Student updated',
    data: { student: formatStudentResponse(student) },
  });
};

export const deleteAdminStudent = async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) throw new AppError('Invalid student id', 400);
  const moved = await moveToTrash({ type: 'student', id: req.params.id, admin: req.admin });
  if (!moved) throw new AppError('Student not found', 404);
  await logActivity({
    adminId: req.admin.id,
    actorEmail: req.admin.email,
    action: 'student_deletion',
    resource: 'student',
    resourceId: req.params.id,
    details: { movedToTrash: true, trashId: moved.entry._id.toString() },
  });
  sendSuccess(res, { message: 'Student moved to Trash' });
};
