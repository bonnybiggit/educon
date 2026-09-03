import { Router } from 'express';
import { findPublishedTestimonials, formatTestimonialResponse } from '../models/testimonialModel.js';
import { asyncHandler, sendSuccess } from '../middleware/http.js';

const router = Router();

router.get('/testimonials', asyncHandler(async (_req, res) => {
  const testimonials = await findPublishedTestimonials();
  sendSuccess(res, {
    message: 'Testimonials fetched',
    data: { testimonials: testimonials.map(formatTestimonialResponse) },
  });
}));

export default router;
