import api from './axios'

export const getWallets = () => api.get('/wallets')
export const createWallet = (data) => api.post('/wallets', data)
export const updateWallet = (id, data) => api.put(`/wallets/${id}`, data)
export const deleteWallet = (id) => api.delete(`/wallets/${id}`)
export const getTotalBalance = () => api.get('/wallets/total-balance')
