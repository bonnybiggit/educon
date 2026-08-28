import { Router } from 'express';
import { createEnquiry } from '../controllers/enquiryController.js';
import { asyncHandler } from '../middleware/http.js';

const router = Router();

router.post('/enquiries', asyncHandler(createEnquiry));

export default router;
