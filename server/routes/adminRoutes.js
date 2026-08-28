import { Router } from 'express';
import { adminLogin, adminLogout, getAdminMe } from '../controllers/adminAuthController.js';
import { getAdminStudents, updateAdminStudent } from '../controllers/adminStudentController.js';
import { getAdminDashboardData } from '../controllers/adminDashboardController.js';
import {
  deleteAdminEnquiry,
  getAdminEnquiries,
  getAdminEnquiry,
  updateAdminEnquiry,
} from '../controllers/enquiryController.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { asyncHandler } from '../middleware/http.js';

const router = Router();

router.post('/login', asyncHandler(adminLogin));
router.post('/logout', requireAdmin, asyncHandler(adminLogout));
router.get('/me', requireAdmin, getAdminMe);
router.get('/dashboard', requireAdmin, asyncHandler(getAdminDashboardData));

router.get('/students', requireAdmin, asyncHandler(getAdminStudents));
router.patch('/students/:id', requireAdmin, asyncHandler(updateAdminStudent));

router.get('/enquiries', requireAdmin, asyncHandler(getAdminEnquiries));
router.get('/enquiries/:id', requireAdmin, asyncHandler(getAdminEnquiry));
router.patch('/enquiries/:id', requireAdmin, asyncHandler(updateAdminEnquiry));
router.delete('/enquiries/:id', requireAdmin, asyncHandler(deleteAdminEnquiry));

export default router;
