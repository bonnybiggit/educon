import { Router } from 'express';
import { adminLogin, adminLogout, getAdminMe } from '../controllers/adminAuthController.js';
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
import { requireAdmin } from '../middleware/adminAuth.js';
import { asyncHandler } from '../middleware/http.js';

const router = Router();

router.post('/login', asyncHandler(adminLogin));
router.post('/logout', requireAdmin, asyncHandler(adminLogout));
router.get('/me', requireAdmin, getAdminMe);
router.get('/dashboard', requireAdmin, asyncHandler(getAdminDashboardData));
router.get('/settings', requireAdmin, asyncHandler(getAdminSettings));
router.patch('/profile', requireAdmin, asyncHandler(updateAdminProfile));
router.patch('/password', requireAdmin, asyncHandler(updateAdminPassword));

router.get('/students', requireAdmin, asyncHandler(getAdminStudents));
router.patch('/students/:id', requireAdmin, asyncHandler(updateAdminStudent));

router.get('/enquiries', requireAdmin, asyncHandler(getAdminEnquiries));
router.get('/enquiries/:id', requireAdmin, asyncHandler(getAdminEnquiry));
router.patch('/enquiries/:id', requireAdmin, asyncHandler(updateAdminEnquiry));
router.delete('/enquiries/:id', requireAdmin, asyncHandler(deleteAdminEnquiry));

router.get('/services', requireAdmin, asyncHandler(getAdminServices));
router.get('/services/:id', requireAdmin, asyncHandler(getAdminService));
router.post('/services', requireAdmin, asyncHandler(createAdminService));
router.patch('/services/:id', requireAdmin, asyncHandler(updateAdminService));
router.delete('/services/:id', requireAdmin, asyncHandler(deleteAdminService));

router.get('/testimonials', requireAdmin, asyncHandler(getAdminTestimonials));
router.get('/testimonials/:id', requireAdmin, asyncHandler(getAdminTestimonial));
router.post('/testimonials', requireAdmin, asyncHandler(createAdminTestimonial));
router.patch('/testimonials/:id', requireAdmin, asyncHandler(updateAdminTestimonial));
router.delete('/testimonials/:id', requireAdmin, asyncHandler(deleteAdminTestimonial));

router.get('/blog', requireAdmin, asyncHandler(getAdminBlogPosts));
router.get('/blog/:id', requireAdmin, asyncHandler(getAdminBlogPost));
router.post('/blog', requireAdmin, asyncHandler(createAdminBlogPost));
router.patch('/blog/:id', requireAdmin, asyncHandler(updateAdminBlogPost));
router.delete('/blog/:id', requireAdmin, asyncHandler(deleteAdminBlogPost));

export default router;
