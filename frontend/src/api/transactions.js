import api from './axios'

const authHeaders = () => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const getTransactions = (page = 0, size = 20) =>
  api.get(`/transactions?page=${page}&size=${size}`)

export const createTransaction = (data) => api.post('/transactions', data, { headers: authHeaders() })
export const updateTransaction = (id, data) => api.put(`/transactions/${id}`, data, { headers: authHeaders() })
export const deleteTransaction = (id) => api.delete(`/transactions/${id}`, { headers: authHeaders() })
