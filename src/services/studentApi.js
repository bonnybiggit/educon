import { apiRequest } from './api';

export const registerStudent = (studentData) => apiRequest('/api/register', {
  method: 'POST',
  body: JSON.stringify(studentData),
});

export const loginStudent = (credentials) => apiRequest('/api/login', {
  method: 'POST',
  body: JSON.stringify(credentials),
});
