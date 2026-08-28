import { ObjectId } from 'mongodb';
import { findStudents, formatStudentResponse, updateStudentById } from '../models/studentModel.js';
import { logActivity } from '../services/activityLogService.js';
import { AppError, cleanString, sendSuccess } from '../middleware/http.js';

const allowedStudentStatuses = ['pending', 'in review', 'accepted', 'declined'];

export const getAdminStudents = async (_req, res) => {
  const students = await findStudents();
  sendSuccess(res, {
    message: 'Students fetched',
    data: { students: students.map((student) => formatStudentResponse(student)) },
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
    patch.currentStage = cleanString(updates.currentStage);
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
