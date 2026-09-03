const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  if (import.meta.env.DEV && typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }

  return '';
};

const API_BASE_URL = getApiBaseUrl();

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

export const getPublishedServices = () => apiRequest('/api/services');

export const getPublishedTestimonials = () => apiRequest('/api/testimonials');

export const createEnquiry = (enquiry) => apiRequest('/api/enquiries', {
  method: 'POST',
  body: JSON.stringify(enquiry),
});
