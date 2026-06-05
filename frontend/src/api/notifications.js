import api from './axios'

export const getNotifications = () => api.get('/notifications')
