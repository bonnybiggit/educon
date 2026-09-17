import { apiRequest } from './api';
import { getApiBaseUrl } from './api';

export const getStudentMe = () => apiRequest('/api/student/me', { cache: 'no-store' });

export const getStudentProfile = () => apiRequest('/api/student/profile', { cache: 'no-store' });

export const updateStudentProfile = (profileData) => apiRequest('/api/student/profile', {
  method: 'PATCH',
  body: profileData,
});

export const logoutStudent = () => apiRequest('/api/student/logout', { method: 'POST' });

export const registerStudent = (studentData) => apiRequest('/api/register', {
  method: 'POST',
  body: studentData,
});

export const loginStudent = (credentials) => apiRequest('/api/login', {
  method: 'POST',
  body: JSON.stringify(credentials),
});

export const verifyStudentEmail = (credentials) => apiRequest('/api/student/verify-email', {
  method: 'POST',
  body: JSON.stringify(credentials),
});

export const resendStudentEmailVerification = (email) => apiRequest('/api/student/verify-email/resend', {
  method: 'POST',
  body: JSON.stringify({ email }),
});

export const completeGoogleStudentProfile = (profileData) => apiRequest('/api/student/auth/google/complete', {
  method: 'POST',
  body: profileData,
});

export const getGoogleStudentAuthUrl = () => `${getApiBaseUrl().replace(/\/+$/, '')}/api/student/auth/google`;
