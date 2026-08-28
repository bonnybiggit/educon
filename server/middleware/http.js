import { ObjectId } from 'mongodb';

export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

export const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

export const sendSuccess = (res, { statusCode = 200, message = 'OK', data = {} } = {}) => {
  res.status(statusCode).json({ success: true, message, data });
};

export const sendError = (res, { statusCode = 500, message = 'Internal server error' } = {}) => {
  res.status(statusCode).json({ success: false, message });
};

export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''));

export const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

export const cleanString = (value) => String(value || '').trim();

export const requireFields = (payload, fields) => {
  const missingFields = fields.filter((field) => {
    const value = payload[field];
    return value === undefined || value === null || value === '';
  });

  if (missingFields.length) {
    throw new AppError(`Missing fields: ${missingFields.join(', ')}`, 400);
  }
};

export const isValidObjectId = (id) => ObjectId.isValid(id);
