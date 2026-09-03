import { ObjectId } from 'mongodb';
import {
  deleteTestimonialById,
  findTestimonialById,
  findTestimonials,
  formatTestimonialResponse,
  insertTestimonial,
  updateTestimonialById,
} from '../models/testimonialModel.js';
import { logActivity } from '../services/activityLogService.js';
import { AppError, cleanString, sendSuccess } from '../middleware/http.js';

const validateTestimonialId = (id) => {
  if (!ObjectId.isValid(id)) throw new AppError('Invalid testimonial id', 400);
};

const getTestimonialFields = (payload, { partial = false } = {}) => {
  const patch = {};
  if (!partial || payload.name !== undefined) {
    const name = cleanString(payload.name);
    if (!name) throw new AppError('Name is required', 400);
    patch.name = name;
  }
  if (!partial || payload.text !== undefined) {
    const text = cleanString(payload.text);
    if (!text) throw new AppError('Testimonial message is required', 400);
    patch.text = text;
  }
  if (!partial || payload.role !== undefined) {
    patch.role = cleanString(payload.role);
  }
  if (!partial || payload.imageUrl !== undefined) {
    patch.imageUrl = cleanString(payload.imageUrl);
  }
  if (!partial || payload.isPublished !== undefined) {
    if (typeof payload.isPublished !== 'boolean') throw new AppError('Visibility must be a boolean', 400);
    patch.isPublished = payload.isPublished;
  }
  return patch;
};

export const getAdminTestimonials = async (_req, res) => {
  const testimonials = await findTestimonials();
  sendSuccess(res, {
    message: 'Testimonials fetched',
    data: { testimonials: testimonials.map(formatTestimonialResponse) },
  });
};

export const getAdminTestimonial = async (req, res) => {
  validateTestimonialId(req.params.id);
  const testimonial = await findTestimonialById(req.params.id);
  if (!testimonial) throw new AppError('Testimonial not found', 404);
  sendSuccess(res, {
    message: 'Testimonial fetched',
    data: { testimonial: formatTestimonialResponse(testimonial) },
  });
};

export const createAdminTestimonial = async (req, res) => {
  const now = new Date();
  const testimonial = {
    _id: new ObjectId(),
    ...getTestimonialFields(req.body),
    createdAt: now,
    updatedAt: now,
  };
  await insertTestimonial(testimonial);
  await logActivity({
    adminId: req.admin.id,
    action: 'testimonial_creation',
    resource: 'testimonial',
    resourceId: testimonial._id,
    details: { name: testimonial.name },
  });
  sendSuccess(res, {
    statusCode: 201,
    message: 'Testimonial created',
    data: { testimonial: formatTestimonialResponse(testimonial) },
  });
};

export const updateAdminTestimonial = async (req, res) => {
  validateTestimonialId(req.params.id);
  const patch = getTestimonialFields(req.body, { partial: true });
  if (!Object.keys(patch).length) throw new AppError('No valid fields to update', 400);
  const testimonial = await updateTestimonialById(req.params.id, patch);
  if (!testimonial) throw new AppError('Testimonial not found', 404);
  await logActivity({
    adminId: req.admin.id,
    action: 'testimonial_update',
    resource: 'testimonial',
    resourceId: req.params.id,
    details: patch,
  });
  sendSuccess(res, {
    message: 'Testimonial updated',
    data: { testimonial: formatTestimonialResponse(testimonial) },
  });
};

export const deleteAdminTestimonial = async (req, res) => {
  validateTestimonialId(req.params.id);
  const testimonial = await deleteTestimonialById(req.params.id);
  if (!testimonial) throw new AppError('Testimonial not found', 404);
  await logActivity({
    adminId: req.admin.id,
    action: 'testimonial_deletion',
    resource: 'testimonial',
    resourceId: req.params.id,
    details: { name: testimonial.name },
  });
  sendSuccess(res, { message: 'Testimonial deleted' });
};
