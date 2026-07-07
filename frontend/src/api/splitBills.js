import api from './axios'

export const getSplitGroups = () => api.get('/split-groups')
export const getSplitGroup = (id) => api.get(`/split-groups/${id}`)
export const createSplitGroup = (data) => api.post('/split-groups', data)
export const updateSplitGroup = (id, data) => api.put(`/split-groups/${id}`, data)
export const addSplitMember = (groupId, data) => api.post(`/split-groups/${groupId}/members`, data)
export const updateSplitMember = (groupId, memberId, data) => api.put(`/split-groups/${groupId}/members/${memberId}`, data)
export const deleteSplitMember = (groupId, memberId) => api.delete(`/split-groups/${groupId}/members/${memberId}`)
export const createSplitBill = (groupId, data) => api.post(`/split-groups/${groupId}/bills`, data)
export const getSplitBill = (id) => api.get(`/split-bills/${id}`)
export const markSettlementPaid = (id, data = {}) => api.post(`/split-settlements/${id}/mark-paid`, data)
export const confirmSettlementReceived = (id, data = {}) => api.post(`/split-settlements/${id}/confirm`, data)
