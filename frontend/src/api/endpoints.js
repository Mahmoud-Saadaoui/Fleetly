import api, { API_URL } from './axios';

// Auth
export const authAPI = {
  register: (data) => api.post('/users/register', data),
  login: (data) => api.post('/users/login', data),
  me: () => api.get('/users/me'),
};

// Vehicles
export const vehiclesAPI = {
  getAll: (params, config) => api.get('/vehicles', { params, ...config }),
  getById: (id) => api.get(`/vehicles/${id}`),
  getAvailability: (id) => api.get(`/vehicles/${id}/availability`),
  create: (data) => api.post('/vehicles', data),
  updateStatus: (id, status) => api.patch(`/vehicles/${id}/status`, { status }),
  update: (id, data) => api.patch(`/admin/vehicles/${id}`, data),
  delete: (id) => api.delete(`/admin/vehicles/${id}`),
};

// Bookings
export const bookingsAPI = {
  quote: (data) => api.post('/bookings/quote', data),
  create: (data) => api.post('/bookings', data),
  getMine: (params) => api.get('/bookings/mine', { params }),
  cancel: (id, data = {}) => api.post(`/bookings/${id}/cancel`, data),
  updateStatus: (id, status) => api.patch(`/bookings/${id}/status`, { status }),
};

// Branches
export const branchesAPI = {
  getAll: (params) => api.get('/branches', { params }),
  getById: (id) => api.get(`/branches/${id}`),
  create: (data) => api.post('/branches', data),
  update: (id, data) => api.patch(`/branches/${id}`, data),
  delete: (id) => api.delete(`/branches/${id}`),
};

// Admin - Users
export const usersAdminAPI = {
  getAll: (params) => api.get('/admin/users', { params }),
  getById: (id) => api.get(`/admin/users/${id}`),
  update: (id, data) => api.patch(`/admin/users/${id}`, data),
  delete: (id) => api.delete(`/admin/users/${id}`),
  invite: (data) => api.post('/admin/users/invite', data),
};

// Agent bookings
export const agentBookingsAPI = {
  getAll: (params) => api.get('/agent/bookings', { params }),
};

// Analytics
export const analyticsAPI = {
  overview: (params) => api.get('/analytics/overview', { params }),
  profitability: (params) => api.get('/analytics/profitability', { params }),
};

// Social auth
// The Google flow is a full-page browser redirect (not an XHR), so we expose
// the backend URL and let the caller navigate to it.
export const socialAuthAPI = {
  google: () => `${API_URL}/auth/google`,
  facebook: () => `${API_URL}/auth/facebook`,
  exchangeCode: (code) => api.post('/auth/exchange', { code }),
  loginWithGoogle: () => {
    window.location.href = `${API_URL}/auth/google`;
  },
};
