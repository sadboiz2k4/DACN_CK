import api from './axios'

// Lấy danh sách sổ nợ (có phân trang và bộ lọc)
export const getDebts = (params = {}) => {
  const query = new URLSearchParams()
  if (params.type)   query.append('type', params.type)
  if (params.status) query.append('status', params.status)
  if (params.page !== undefined) query.append('page', params.page)
  if (params.size !== undefined) query.append('size', params.size)
  return api.get(`/debts?${query.toString()}`)
}

// Lấy chi tiết 1 khoản nợ kèm timeline trả nợ
export const getDebtById = (id) => api.get(`/debts/${id}`)

// Tạo khoản nợ/cho vay mới
export const createDebt = (data) => api.post('/debts', data)

// Sửa thông tin khoản nợ (tên, số tiền gốc, ngày hẹn, ghi chú)
export const updateDebt = (id, data) => api.put(`/debts/${id}`, data)

// Thêm đợt trả nợ / thu nợ
export const addPayment = (debtId, data) => api.post(`/debts/${debtId}/payments`, data)

// Sửa đợt trả nợ
export const updatePayment = (detailId, data) => api.put(`/debt-details/${detailId}`, data)

// Xóa đợt trả nợ
export const deletePayment = (detailId) => api.delete(`/debt-details/${detailId}`)
