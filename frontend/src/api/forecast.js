import api from './axios'

export const getForecast = () => api.get('/ai/forecast')
export const getAnomalies = () => api.get('/ai/anomalies')
export const getMonthlyTrend = () => api.get('/reports/monthly-trend')
