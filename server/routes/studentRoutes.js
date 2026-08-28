import { Router } from 'express';
import { loginStudent, registerStudent } from '../controllers/studentAuthController.js';
import { asyncHandler } from '../middleware/http.js';

const router = Router();

router.post('/register', asyncHandler(registerStudent));
router.post('/login', asyncHandler(loginStudent));

export default router;
