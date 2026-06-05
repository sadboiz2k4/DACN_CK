import api from './axios'

export const getAdminUsers = (page = 0, size = 10, search = '') =>
  api.get(`/admin/users?page=${page}&size=${size}${search ? `&search=${encodeURIComponent(search)}` : ''}`)

export const toggleUserStatus = (id) => api.put(`/admin/users/${id}/toggle-status`)

export const getAdminStats = () => api.get('/admin/stats')
