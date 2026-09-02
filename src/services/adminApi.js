import { apiRequest } from './api';

export const adminLogin = (credentials) => apiRequest('/api/admin/login', {
  method: 'POST',
  body: JSON.stringify(credentials),
});

export const adminLogout = () => apiRequest('/api/admin/logout', {
  method: 'POST',
});

export const getAdminMe = () => apiRequest('/api/admin/me');

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
