import axios from 'axios'

const aiApi = axios.create({
  baseURL: '/api/ai',
  headers: { 'Content-Type': 'application/json' },
})

aiApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config;
}, (error) => {
  return Promise.reject(error);
})

export const parseTransaction = (text) => {
  return aiApi.post('/parse-transaction', { text });
};

export const parseVoiceTransaction = (formData) => {
  return aiApi.post('/parse-voice', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const scanReceipt = (formData) => {
  return aiApi.post('/scan-receipt', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const getForecast = (userId) => aiApi.get(`/forecast/${userId}`)
export const getAnomalies = (userId) => aiApi.get(`/anomalies/${userId}`)