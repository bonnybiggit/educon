import { ObjectId } from 'mongodb';
import { findAdminStudents, formatStudentResponse, getStudentSummary, updateStudentById } from '../models/studentModel.js';
import { logActivity } from '../services/activityLogService.js';
import { AppError, cleanString, sendSuccess } from '../middleware/http.js';

const allowedStudentStatuses = ['pending', 'in review', 'accepted', 'declined'];
const allowedStudentStages = [
  'Initial Consultation',
  'Document Preparation',
  'Application Submitted',
  'Document Verification',
  'CAS Letter Processing',
  'Visa Preparation',
];

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
