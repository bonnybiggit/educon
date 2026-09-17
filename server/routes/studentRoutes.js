import { Router } from 'express';
import { getStudentMe, loginStudent, logoutStudent, registerStudent } from '../controllers/studentAuthController.js';
import { noStoreStudentAuth, requireStudent } from '../middleware/studentAuth.js';
import { studentUploads } from '../middleware/studentUploads.js';
import { asyncHandler } from '../middleware/http.js';
import { completeGoogleStudentAuth, completeGoogleStudentProfile, startGoogleStudentAuth } from '../controllers/studentGoogleAuthController.js';
import { resendStudentEmailVerification, verificationRateLimit, verifyStudentEmail } from '../controllers/studentEmailVerificationController.js';
import { getStudentProfile, updateStudentProfile } from '../controllers/studentProfileController.js';

const router = Router();

router.get('/student/auth/google', startGoogleStudentAuth);
router.get('/student/auth/google/callback', completeGoogleStudentAuth);
router.post('/student/auth/google/complete', studentUploads, completeGoogleStudentProfile);
router.get('/student/profile', noStoreStudentAuth, requireStudent, getStudentProfile);
router.patch('/student/profile', noStoreStudentAuth, requireStudent, studentUploads, updateStudentProfile);
router.post('/student/verify-email', verificationRateLimit, verifyStudentEmail);
router.post('/student/verify-email/resend', verificationRateLimit, resendStudentEmailVerification);
router.post('/register', asyncHandler(registerStudent));
router.post('/login', noStoreStudentAuth, asyncHandler(loginStudent));
router.get('/student/me', noStoreStudentAuth, requireStudent, getStudentMe);
router.post('/student/logout', noStoreStudentAuth, asyncHandler(logoutStudent));

export default router;
