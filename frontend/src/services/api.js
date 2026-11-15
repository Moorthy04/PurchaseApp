import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export const itemTypesApi = {
  getAll: () => api.get('/item-types/'),
  getById: (id) => api.get(`/item-types/${id}/`),
  create: (data) => api.post('/item-types/', data),
  update: (id, data) => api.put(`/item-types/${id}/`, data),
  delete: (id) => api.delete(`/item-types/${id}/`),
};

export const itemsApi = {
  getAll: (params) => api.get('/items/', { params }),
  getById: (id) => api.get(`/items/${id}/`),
  create: (data) => api.post('/items/', data),
  update: (id, data) => api.put(`/items/${id}/`, data),
  delete: (id) => api.delete(`/items/${id}/`),
};

export const purchasesApi = {
  getAll: () => api.get('/purchases/'),
  getById: (id) => api.get(`/purchases/${id}/`),
  getNextOrderId: () => api.get('/purchases/next-order-id/'),
  create: (data) => api.post('/purchases/', data),
  update: (id, data) => api.put(`/purchases/${id}/`, data),
};

export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats/'),
};

export default api;
