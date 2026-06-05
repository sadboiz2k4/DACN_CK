import api from './axios'

export const getSummary = (period = 'month') => api.get(`/reports/summary?period=${period}`)
export const getCategoryBreakdown = (period = 'month') => api.get(`/reports/categories?period=${period}`)
export const getTimeline = (period = 'month') => api.get(`/reports/timeline?period=${period}`)
