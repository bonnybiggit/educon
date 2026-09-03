import { Router } from 'express';
import { findPublishedServices, formatServiceResponse } from '../models/serviceModel.js';
import { asyncHandler, sendSuccess } from '../middleware/http.js';

const router = Router();

router.get('/services', asyncHandler(async (_req, res) => {
  const services = await findPublishedServices();
  sendSuccess(res, {
    message: 'Services fetched',
    data: { services: services.map(formatServiceResponse) },
  });
}));

export default router;
