import { Router } from 'express';
import { createEnquiry } from '../controllers/enquiryController.js';
import { asyncHandler } from '../middleware/http.js';
import { enquiryLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.post('/enquiries', enquiryLimiter, asyncHandler(createEnquiry));

export default router;
