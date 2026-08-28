const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const apiRequest = async (path, options = {}) => {
  const { headers, ...requestOptions } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestOptions,
    credentials: 'include',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
  });

  const result = await response.json().catch(() => ({
    success: false,
    message: 'Invalid server response',
  }));

  if (!response.ok) {
    return {
      success: false,
      message: result.message || result.error || 'Request failed',
      data: result.data || {},
    };
  }

  return result;
};
