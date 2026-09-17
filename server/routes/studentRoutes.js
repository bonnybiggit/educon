import { Router } from 'express';
import { getStudentMe, loginStudent, logoutStudent, registerStudent } from '../controllers/studentAuthController.js';
import { noStoreStudentAuth, requireStudent } from '../middleware/studentAuth.js';
import { studentUploads } from '../middleware/studentUploads.js';
import { asyncHandler } from '../middleware/http.js';

const router = Router();

router.post('/register', studentUploads, asyncHandler(registerStudent));
router.post('/login', noStoreStudentAuth, asyncHandler(loginStudent));
router.get('/student/me', noStoreStudentAuth, requireStudent, getStudentMe);
router.post('/student/logout', noStoreStudentAuth, asyncHandler(logoutStudent));

export default router;
