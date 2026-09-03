import { ObjectId } from 'mongodb';
import {
  deleteServiceById,
  findServiceById,
  findServices,
  formatServiceResponse,
  insertService,
  updateServiceById,
} from '../models/serviceModel.js';
import { logActivity } from '../services/activityLogService.js';
import { AppError, cleanString, sendSuccess } from '../middleware/http.js';

const validateServiceId = (id) => {
  if (!ObjectId.isValid(id)) throw new AppError('Invalid service id', 400);
};

const getServiceFields = (payload, { partial = false } = {}) => {
  const patch = {};
  if (!partial || payload.name !== undefined) {
    const name = cleanString(payload.name);
    if (!name) throw new AppError('Service name is required', 400);
    patch.name = name;
  }
  if (!partial || payload.description !== undefined) {
    const description = cleanString(payload.description);
    if (!description) throw new AppError('Service description is required', 400);
    patch.description = description;
  }
  if (!partial || payload.isPublished !== undefined) {
    if (typeof payload.isPublished !== 'boolean') throw new AppError('Service visibility must be a boolean', 400);
    patch.isPublished = payload.isPublished;
  }
  return patch;
};

export const getAdminServices = async (_req, res) => {
  const services = await findServices();
  sendSuccess(res, { message: 'Services fetched', data: { services: services.map(formatServiceResponse) } });
};

export const createAdminService = async (req, res) => {
  const now = new Date();
  const service = {
    _id: new ObjectId(),
    ...getServiceFields(req.body),
    createdAt: now,
    updatedAt: now,
  };
  await insertService(service);
  await logActivity({ adminId: req.admin.id, action: 'service_creation', resource: 'service', resourceId: service._id, details: { name: service.name } });
  sendSuccess(res, { statusCode: 201, message: 'Service created', data: { service: formatServiceResponse(service) } });
};

export const updateAdminService = async (req, res) => {
  validateServiceId(req.params.id);
  const patch = getServiceFields(req.body, { partial: true });
  if (!Object.keys(patch).length) throw new AppError('No valid fields to update', 400);
  const service = await updateServiceById(req.params.id, patch);
  if (!service) throw new AppError('Service not found', 404);
  await logActivity({ adminId: req.admin.id, action: 'service_update', resource: 'service', resourceId: req.params.id, details: patch });
  sendSuccess(res, { message: 'Service updated', data: { service: formatServiceResponse(service) } });
};

export const deleteAdminService = async (req, res) => {
  validateServiceId(req.params.id);
  const service = await deleteServiceById(req.params.id);
  if (!service) throw new AppError('Service not found', 404);
  await logActivity({ adminId: req.admin.id, action: 'service_deletion', resource: 'service', resourceId: req.params.id, details: { name: service.name } });
  sendSuccess(res, { message: 'Service deleted' });
};

export const getAdminService = async (req, res) => {
  validateServiceId(req.params.id);
  const service = await findServiceById(req.params.id);
  if (!service) throw new AppError('Service not found', 404);
  sendSuccess(res, { message: 'Service fetched', data: { service: formatServiceResponse(service) } });
};
