import { Router } from 'express';
import { adminLogin, adminLogout, adminLogoutAll, getAdminMe } from '../controllers/adminAuthController.js';
import { deleteAdminAccount, createAdmin, getAdmins, resetAdminPassword, updateAdminAccount } from '../controllers/adminManagementController.js';
import { getActivityLogs, getHiddenActivityLogs, hideSelectedActivityLogs, restoreSelectedActivityLogs } from '../controllers/adminActivityController.js';
import { createAdminBlogPost, deleteAdminBlogPost, getAdminBlogPost, getAdminBlogPosts, updateAdminBlogPost } from '../controllers/adminBlogController.js';
import { createAdminTestimonial, deleteAdminTestimonial, getAdminTestimonial, getAdminTestimonials, updateAdminTestimonial } from '../controllers/adminTestimonialController.js';
import { deleteAdminStudent, getAdminStudentDocument, getAdminStudents, updateAdminStudent } from '../controllers/adminStudentController.js';
import { getAdminDashboardData } from '../controllers/adminDashboardController.js';
import { getAdminSettings, updateAdminPassword, updateAdminProfile } from '../controllers/adminSettingsController.js';
import { createAdminService, deleteAdminService, getAdminService, getAdminServices, updateAdminService } from '../controllers/adminServiceController.js';
import {
  deleteAdminEnquiry,
  getAdminEnquiries,
  getAdminEnquiry,
  updateAdminEnquiry,
} from '../controllers/enquiryController.js';
import { deleteTrashItemPermanently, emptyTrashBin, getTrash, restoreTrashItem } from '../controllers/trashController.js';
import { requireAdmin, requireRole, requireSuperAdmin } from '../middleware/adminAuth.js';
import { asyncHandler } from '../middleware/http.js';
import { adminLoginLimiter, adminProfileLimiter, adminRecoveryConfirmLimiter, adminRecoveryRequestLimiter, adminSessionLimiter } from '../middleware/rateLimit.js';
import { confirmAdminPasswordReset, requestAdminPasswordReset } from '../controllers/adminPasswordResetController.js';
import { ADMIN_ROLE } from '../models/adminModel.js';

const router = Router();

router.post('/login', adminLoginLimiter, asyncHandler(adminLogin));
router.post('/forgot-password', adminRecoveryRequestLimiter, asyncHandler(requestAdminPasswordReset));
router.post('/reset-password', adminRecoveryConfirmLimiter, asyncHandler(confirmAdminPasswordReset));
router.post('/logout', requireAdmin, asyncHandler(adminLogout));
router.post('/logout-all', requireAdmin, adminSessionLimiter, asyncHandler(adminLogoutAll));
router.get('/me', requireAdmin, getAdminMe);
router.get('/dashboard', requireAdmin, asyncHandler(getAdminDashboardData));
router.get('/settings', requireAdmin, asyncHandler(getAdminSettings));
router.patch('/profile', requireAdmin, adminProfileLimiter, asyncHandler(updateAdminProfile));
router.patch('/password', requireAdmin, adminProfileLimiter, asyncHandler(updateAdminPassword));

router.get('/admins', requireAdmin, requireSuperAdmin, asyncHandler(getAdmins));
router.post('/admins', requireAdmin, requireSuperAdmin, asyncHandler(createAdmin));
router.patch('/admins/:id', requireAdmin, requireSuperAdmin, asyncHandler(updateAdminAccount));
router.delete('/admins/:id', requireAdmin, requireSuperAdmin, asyncHandler(deleteAdminAccount));
router.post('/admins/:id/reset-password', requireAdmin, requireSuperAdmin, asyncHandler(resetAdminPassword));
router.get('/activity-logs', requireAdmin, requireSuperAdmin, asyncHandler(getActivityLogs));
router.get('/activity-logs/hidden', requireAdmin, requireSuperAdmin, asyncHandler(getHiddenActivityLogs));
router.post('/activity-logs/hide', requireAdmin, requireSuperAdmin, asyncHandler(hideSelectedActivityLogs));
router.post('/activity-logs/restore', requireAdmin, requireSuperAdmin, asyncHandler(restoreSelectedActivityLogs));

router.get('/students', requireAdmin, requireRole(ADMIN_ROLE.ADMIN, ADMIN_ROLE.SUPER_ADMIN), asyncHandler(getAdminStudents));
router.get('/students/:id/documents/:field', requireAdmin, requireRole(ADMIN_ROLE.ADMIN, ADMIN_ROLE.SUPER_ADMIN), asyncHandler(getAdminStudentDocument));
router.patch('/students/:id', requireAdmin, requireRole(ADMIN_ROLE.ADMIN, ADMIN_ROLE.SUPER_ADMIN), asyncHandler(updateAdminStudent));
router.delete('/students/:id', requireAdmin, requireSuperAdmin, asyncHandler(deleteAdminStudent));

router.get('/enquiries', requireAdmin, requireSuperAdmin, asyncHandler(getAdminEnquiries));
router.get('/enquiries/:id', requireAdmin, requireSuperAdmin, asyncHandler(getAdminEnquiry));
router.patch('/enquiries/:id', requireAdmin, requireSuperAdmin, asyncHandler(updateAdminEnquiry));
router.delete('/enquiries/:id', requireAdmin, requireSuperAdmin, asyncHandler(deleteAdminEnquiry));

router.get('/services', requireAdmin, requireSuperAdmin, asyncHandler(getAdminServices));
router.get('/services/:id', requireAdmin, requireSuperAdmin, asyncHandler(getAdminService));
router.post('/services', requireAdmin, requireSuperAdmin, asyncHandler(createAdminService));
router.patch('/services/:id', requireAdmin, requireSuperAdmin, asyncHandler(updateAdminService));
router.delete('/services/:id', requireAdmin, requireSuperAdmin, asyncHandler(deleteAdminService));

router.get('/testimonials', requireAdmin, requireRole(ADMIN_ROLE.ADMIN, ADMIN_ROLE.SUPER_ADMIN), asyncHandler(getAdminTestimonials));
router.get('/testimonials/:id', requireAdmin, requireRole(ADMIN_ROLE.ADMIN, ADMIN_ROLE.SUPER_ADMIN), asyncHandler(getAdminTestimonial));
router.post('/testimonials', requireAdmin, requireRole(ADMIN_ROLE.ADMIN, ADMIN_ROLE.SUPER_ADMIN), asyncHandler(createAdminTestimonial));
router.patch('/testimonials/:id', requireAdmin, requireRole(ADMIN_ROLE.ADMIN, ADMIN_ROLE.SUPER_ADMIN), asyncHandler(updateAdminTestimonial));
router.delete('/testimonials/:id', requireAdmin, requireRole(ADMIN_ROLE.ADMIN, ADMIN_ROLE.SUPER_ADMIN), asyncHandler(deleteAdminTestimonial));

router.get('/blog', requireAdmin, requireRole(ADMIN_ROLE.ADMIN, ADMIN_ROLE.SUPER_ADMIN), asyncHandler(getAdminBlogPosts));
router.get('/blog/:id', requireAdmin, requireRole(ADMIN_ROLE.ADMIN, ADMIN_ROLE.SUPER_ADMIN), asyncHandler(getAdminBlogPost));
router.post('/blog', requireAdmin, requireRole(ADMIN_ROLE.ADMIN, ADMIN_ROLE.SUPER_ADMIN), asyncHandler(createAdminBlogPost));
router.patch('/blog/:id', requireAdmin, requireRole(ADMIN_ROLE.ADMIN, ADMIN_ROLE.SUPER_ADMIN), asyncHandler(updateAdminBlogPost));
router.delete('/blog/:id', requireAdmin, requireRole(ADMIN_ROLE.ADMIN, ADMIN_ROLE.SUPER_ADMIN), asyncHandler(deleteAdminBlogPost));

router.get('/trash', requireAdmin, requireRole(ADMIN_ROLE.ADMIN, ADMIN_ROLE.SUPER_ADMIN), asyncHandler(getTrash));
router.post('/trash/empty', requireAdmin, requireSuperAdmin, asyncHandler(emptyTrashBin));
router.post('/trash/:id/restore', requireAdmin, requireRole(ADMIN_ROLE.ADMIN, ADMIN_ROLE.SUPER_ADMIN), asyncHandler(restoreTrashItem));
router.delete('/trash/:id', requireAdmin, requireSuperAdmin, asyncHandler(deleteTrashItemPermanently));

export default router;
