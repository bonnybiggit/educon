import { Router } from 'express';
import { adminLogin, adminLogout, getAdminMe } from '../controllers/adminAuthController.js';
import { deleteAdminAccount, createAdmin, getAdmins, resetAdminPassword, updateAdminAccount } from '../controllers/adminManagementController.js';
import { getActivityLogs } from '../controllers/adminActivityController.js';
import { createAdminBlogPost, deleteAdminBlogPost, getAdminBlogPost, getAdminBlogPosts, updateAdminBlogPost } from '../controllers/adminBlogController.js';
import { createAdminTestimonial, deleteAdminTestimonial, getAdminTestimonial, getAdminTestimonials, updateAdminTestimonial } from '../controllers/adminTestimonialController.js';
import { getAdminStudents, updateAdminStudent } from '../controllers/adminStudentController.js';
import { getAdminDashboardData } from '../controllers/adminDashboardController.js';
import { getAdminSettings, updateAdminPassword, updateAdminProfile } from '../controllers/adminSettingsController.js';
import { createAdminService, deleteAdminService, getAdminService, getAdminServices, updateAdminService } from '../controllers/adminServiceController.js';
import {
  deleteAdminEnquiry,
  getAdminEnquiries,
  getAdminEnquiry,
  updateAdminEnquiry,
} from '../controllers/enquiryController.js';
import { requireAdmin, requireRole, requireSuperAdmin } from '../middleware/adminAuth.js';
import { asyncHandler } from '../middleware/http.js';
import { ADMIN_ROLE } from '../models/adminModel.js';

const router = Router();

router.post('/login', asyncHandler(adminLogin));
router.post('/logout', requireAdmin, asyncHandler(adminLogout));
router.get('/me', requireAdmin, getAdminMe);
router.get('/dashboard', requireAdmin, asyncHandler(getAdminDashboardData));
router.get('/settings', requireAdmin, asyncHandler(getAdminSettings));
router.patch('/profile', requireAdmin, asyncHandler(updateAdminProfile));
router.patch('/password', requireAdmin, asyncHandler(updateAdminPassword));

router.get('/admins', requireAdmin, requireSuperAdmin, asyncHandler(getAdmins));
router.post('/admins', requireAdmin, requireSuperAdmin, asyncHandler(createAdmin));
router.patch('/admins/:id', requireAdmin, requireSuperAdmin, asyncHandler(updateAdminAccount));
router.delete('/admins/:id', requireAdmin, requireSuperAdmin, asyncHandler(deleteAdminAccount));
router.post('/admins/:id/reset-password', requireAdmin, requireSuperAdmin, asyncHandler(resetAdminPassword));
router.get('/activity-logs', requireAdmin, requireSuperAdmin, asyncHandler(getActivityLogs));

router.get('/students', requireAdmin, requireRole(ADMIN_ROLE.ADMIN, ADMIN_ROLE.SUPER_ADMIN), asyncHandler(getAdminStudents));
router.patch('/students/:id', requireAdmin, requireRole(ADMIN_ROLE.ADMIN, ADMIN_ROLE.SUPER_ADMIN), asyncHandler(updateAdminStudent));

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

export default router;
