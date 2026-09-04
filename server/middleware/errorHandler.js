import { MongoServerError } from 'mongodb';
import { sendError } from './http.js';

export const notFound = (req, _res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

export const errorHandler = (error, _req, res, next) => {
  void next;
  let statusCode = error.statusCode || 500;
  let message = error.isOperational ? error.message : 'Internal server error';

  if (error instanceof MongoServerError && error.code === 11000) {
    statusCode = 409;
    message = 'A record with that unique value already exists';
  }

  if (error instanceof MongoServerError && error.code === 121) {
    statusCode = 400;
    message = 'Submitted data does not match the required format';
  }

  if (error.name === 'BSONError') {
    statusCode = 400;
    message = 'Invalid resource id';
  }

  if (statusCode >= 500) {
    console.error('Server error:', error);
  }

  sendError(res, { statusCode, message });
};
