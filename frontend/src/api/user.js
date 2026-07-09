import api from './axios'

export const getProfile = () => api.get('/users/me')
export const searchUsers = (q) => api.get('/users/search', { params: { q } })
export const updateProfile = (data) => api.put('/users/me', data)
export const changePassword = (data) => api.put('/users/me/password', data)
