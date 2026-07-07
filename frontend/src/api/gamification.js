import api from './axios'

export const getGamification = () => api.get('/gamification')
export const refreshGamification = () => api.post('/gamification/refresh')
