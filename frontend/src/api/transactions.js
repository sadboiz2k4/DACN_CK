import api from './axios'

export const getTransactions = (page = 0, size = 20) =>
  api.get(`/transactions?page=${page}&size=${size}`)

export const createTransaction = (data) => api.post('/transactions', data)
export const deleteTransaction = (id) => api.delete(`/transactions/${id}`)
