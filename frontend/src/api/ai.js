import axios from 'axios'

const aiApi = axios.create({
  baseURL: '/ai',
  headers: { 'Content-Type': 'application/json' },
})

export const parseTransaction = (text) => aiApi.post('/parse-transaction', { text })
export const scanReceipt = (formData) =>
  aiApi.post('/scan-receipt', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
export const getForecast = (userId) => aiApi.get(`/forecast/${userId}`)
export const getAnomalies = (userId) => aiApi.get(`/anomalies/${userId}`)
