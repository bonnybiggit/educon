import { Router } from 'express';
import { getStudentMe, loginStudent, logoutStudent, registerStudent } from '../controllers/studentAuthController.js';
import { noStoreStudentAuth, requireStudent } from '../middleware/studentAuth.js';
import { studentUploads } from '../middleware/studentUploads.js';
import { asyncHandler } from '../middleware/http.js';
import { studentLoginLimiter, studentPasswordResetConfirmLimiter, studentPasswordResetRequestLimiter, studentRegisterLimiter } from '../middleware/rateLimit.js';
import { confirmStudentPasswordReset, requestStudentPasswordReset } from '../controllers/studentPasswordResetController.js';
import { resendStudentEmailVerification, verificationRateLimit, verifyStudentEmail } from '../controllers/studentEmailVerificationController.js';
import { getStudentProfile, submitStudentApplication, updateStudentProfile } from '../controllers/studentProfileController.js';

const router = Router();

router.get('/student/profile', noStoreStudentAuth, requireStudent, getStudentProfile);
router.patch('/student/profile', noStoreStudentAuth, requireStudent, studentUploads, updateStudentProfile);
router.post('/student/profile/submit', noStoreStudentAuth, requireStudent, submitStudentApplication);
router.post('/student/verify-email', verificationRateLimit, verifyStudentEmail);
router.post('/student/verify-email/resend', verificationRateLimit, resendStudentEmailVerification);
router.post('/register', studentRegisterLimiter, asyncHandler(registerStudent));
router.post('/login', noStoreStudentAuth, studentLoginLimiter, asyncHandler(loginStudent));
router.post('/student/password-reset/request', noStoreStudentAuth, studentPasswordResetRequestLimiter, requestStudentPasswordReset);
router.post('/student/password-reset/confirm', noStoreStudentAuth, studentPasswordResetConfirmLimiter, confirmStudentPasswordReset);
router.get('/student/me', noStoreStudentAuth, requireStudent, getStudentMe);
router.post('/student/logout', noStoreStudentAuth, asyncHandler(logoutStudent));

export default router;
