import api from './axios'

export const getBudgets = (month, year) =>
  api.get('/budgets', { params: { month, year } })

export const upsertBudget = (data) =>
  api.post('/budgets', data)

export const deleteBudget = (id) =>
  api.delete(`/budgets/${id}`)

export const getTransactionsByCategory = (categoryName, month, year) =>
  api.get('/transactions/by-category', { params: { categoryName, month, year } })
