import { ObjectId } from 'mongodb';
import {
  deleteEnquiryById,
  ENQUIRY_STATUSES,
  findEnquiries,
  findEnquiryById,
  formatEnquiryResponse,
  insertEnquiry,
  updateEnquiryById,
} from '../models/enquiryModel.js';
import { logActivity } from '../services/activityLogService.js';
import { AppError, cleanString, isValidEmail, normalizeEmail, requireFields, sendSuccess } from '../middleware/http.js';

export const createEnquiry = async (req, res) => {
  const payload = req.body;
  requireFields(payload, ['name', 'email', 'phone', 'message']);

  if (!isValidEmail(payload.email)) {
    throw new AppError('Invalid email address', 400);
  }

  const subject = cleanString(payload.subject || payload.service || 'General enquiry');
  const enquiryDocument = {
    _id: new ObjectId(),
    name: cleanString(payload.name),
    email: normalizeEmail(payload.email),
    phone: cleanString(payload.phone),
    subject,
    country: cleanString(payload.country),
    level: cleanString(payload.level),
    service: cleanString(payload.service),
    message: cleanString(payload.message),
    status: 'new',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await insertEnquiry(enquiryDocument);
  sendSuccess(res, {
    statusCode: 201,
    message: 'Enquiry submitted',
    data: { enquiry: formatEnquiryResponse(enquiryDocument) },
  });
};

export const getAdminEnquiries = async (_req, res) => {
  const enquiries = await findEnquiries();
  sendSuccess(res, {
    message: 'Enquiries fetched',
    data: { enquiries: enquiries.map((enquiry) => formatEnquiryResponse(enquiry)) },
  });
};

export const getAdminEnquiry = async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    throw new AppError('Invalid enquiry id', 400);
  }

  const enquiry = await findEnquiryById(id);
  if (!enquiry) {
    throw new AppError('Enquiry not found', 404);
  }

  sendSuccess(res, {
    message: 'Enquiry fetched',
    data: { enquiry: formatEnquiryResponse(enquiry) },
  });
};

export const updateAdminEnquiry = async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    throw new AppError('Invalid enquiry id', 400);
  }

  const patch = {};
  if (req.body.status !== undefined) {
    const status = cleanString(req.body.status);
    if (!ENQUIRY_STATUSES.includes(status)) {
      throw new AppError('Invalid enquiry status', 400);
    }
    patch.status = status;
  }

  if (!Object.keys(patch).length) {
    throw new AppError('No valid fields to update', 400);
  }

  const enquiry = await updateEnquiryById(id, patch);
  if (!enquiry) {
    throw new AppError('Enquiry not found', 404);
  }

  await logActivity({
    adminId: req.admin.id,
    action: 'enquiry_status_update',
    resource: 'enquiry',
    resourceId: id,
    details: patch,
  });

  sendSuccess(res, {
    message: 'Enquiry updated',
    data: { enquiry: formatEnquiryResponse(enquiry) },
  });
};

export const deleteAdminEnquiry = async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    throw new AppError('Invalid enquiry id', 400);
  }

  const enquiry = await deleteEnquiryById(id);
  if (!enquiry) {
    throw new AppError('Enquiry not found', 404);
  }

  await logActivity({
    adminId: req.admin.id,
    action: 'enquiry_deletion',
    resource: 'enquiry',
    resourceId: id,
    details: { email: enquiry.email, status: enquiry.status },
  });

  sendSuccess(res, { message: 'Enquiry deleted' });
};
