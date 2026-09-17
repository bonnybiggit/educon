import { apiRequest } from './api';

export const getStudentMe = () => apiRequest('/api/student/me', { cache: 'no-store' });

export const logoutStudent = () => apiRequest('/api/student/logout', { method: 'POST' });

export const registerStudent = (studentData) => apiRequest('/api/register', {
  method: 'POST',
  body: studentData,
});

export const loginStudent = (credentials) => apiRequest('/api/login', {
  method: 'POST',
  body: JSON.stringify(credentials),
});
