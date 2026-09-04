import { apiRequest } from './api';

export const adminLogin = (credentials) => apiRequest('/api/admin/login', {
  method: 'POST',
  body: JSON.stringify(credentials),
});

export const adminLogout = () => apiRequest('/api/admin/logout', {
  method: 'POST',
});

export const getAdminMe = () => apiRequest('/api/admin/me');

export const getAdminSettings = () => apiRequest('/api/admin/settings');

export const getAdmins = () => apiRequest('/api/admin/admins');

export const createAdmin = (admin) => apiRequest('/api/admin/admins', {
  method: 'POST',
  body: JSON.stringify(admin),
});

export const updateAdminAccount = (id, updates) => apiRequest(`/api/admin/admins/${id}`, {
  method: 'PATCH',
  body: JSON.stringify(updates),
});

export const deleteAdminAccount = (id) => apiRequest(`/api/admin/admins/${id}`, {
  method: 'DELETE',
});

export const resetAdminPassword = (id, password) => apiRequest(`/api/admin/admins/${id}/reset-password`, {
  method: 'POST',
  body: JSON.stringify(password),
});

export const getActivityLogs = () => apiRequest('/api/admin/activity-logs');

export const updateAdminProfile = (profile) => apiRequest('/api/admin/profile', {
  method: 'PATCH',
  body: JSON.stringify(profile),
});

export const updateAdminPassword = (passwords) => apiRequest('/api/admin/password', {
  method: 'PATCH',
  body: JSON.stringify(passwords),
});

export const getAdminDashboard = () => apiRequest('/api/admin/dashboard');

export const getAdminStudents = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  return apiRequest(`/api/admin/students${query ? `?${query}` : ''}`);
};

export const updateAdminStudent = (id, updates) => apiRequest(`/api/admin/students/${id}`, {
  method: 'PATCH',
  body: JSON.stringify(updates),
});

export const getAdminEnquiries = () => apiRequest('/api/admin/enquiries');

export const getAdminEnquiry = (id) => apiRequest(`/api/admin/enquiries/${id}`);

export const updateAdminEnquiry = (id, updates) => apiRequest(`/api/admin/enquiries/${id}`, {
  method: 'PATCH',
  body: JSON.stringify(updates),
});

export const deleteAdminEnquiry = (id) => apiRequest(`/api/admin/enquiries/${id}`, {
  method: 'DELETE',
});

export const getAdminServices = () => apiRequest('/api/admin/services');

export const getAdminService = (id) => apiRequest(`/api/admin/services/${id}`);

export const createAdminService = (service) => apiRequest('/api/admin/services', {
  method: 'POST',
  body: JSON.stringify(service),
});

export const updateAdminService = (id, updates) => apiRequest(`/api/admin/services/${id}`, {
  method: 'PATCH',
  body: JSON.stringify(updates),
});

export const deleteAdminService = (id) => apiRequest(`/api/admin/services/${id}`, {
  method: 'DELETE',
});

export const getAdminTestimonials = () => apiRequest('/api/admin/testimonials');

export const getAdminTestimonial = (id) => apiRequest(`/api/admin/testimonials/${id}`);

export const createAdminTestimonial = (testimonial) => apiRequest('/api/admin/testimonials', {
  method: 'POST',
  body: JSON.stringify(testimonial),
});

export const updateAdminTestimonial = (id, updates) => apiRequest(`/api/admin/testimonials/${id}`, {
  method: 'PATCH',
  body: JSON.stringify(updates),
});

export const deleteAdminTestimonial = (id) => apiRequest(`/api/admin/testimonials/${id}`, {
  method: 'DELETE',
});

export const getAdminBlogPosts = () => apiRequest('/api/admin/blog');

export const getAdminBlogPost = (id) => apiRequest(`/api/admin/blog/${id}`);

export const createAdminBlogPost = (post) => apiRequest('/api/admin/blog', {
  method: 'POST',
  body: JSON.stringify(post),
});

export const updateAdminBlogPost = (id, updates) => apiRequest(`/api/admin/blog/${id}`, {
  method: 'PATCH',
  body: JSON.stringify(updates),
});

export const deleteAdminBlogPost = (id) => apiRequest(`/api/admin/blog/${id}`, {
  method: 'DELETE',
});
