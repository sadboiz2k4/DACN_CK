import api from './axios'

export const uploadBankImportPreview = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/bank-imports/preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const previewBankImportMapping = (importId, mapping) => {
  return api.post(`/bank-imports/${importId}/preview`, mapping)
}

export const confirmBankImport = (importId, data) => {
  return api.post(`/bank-imports/${importId}/confirm`, data)
}

export const getBankImportHistory = () => api.get('/bank-imports')
export const rollbackBankImport = (importId) => api.post(`/bank-imports/${importId}/rollback`)
