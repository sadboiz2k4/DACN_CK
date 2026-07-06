import api from './axios'

// Lấy danh sách dịch vụ định kỳ / trả góp (có phân trang và bộ lọc)
export const getRecurring = (params = {}) => {
  const q = new URLSearchParams()
  if (params.paymentType) q.append('paymentType', params.paymentType)
  if (params.status)      q.append('status', params.status)
  if (params.page !== undefined) q.append('page', params.page)
  if (params.size !== undefined) q.append('size', params.size)
  return api.get(`/recurring?${q.toString()}`)
}

// Tạo mới dịch vụ hoặc khoản trả góp
export const createRecurring = (data) => api.post('/recurring', data)

// Cập nhật số tiền, ví, danh mục, trạng thái (ACTIVE/PAUSED)
export const updateRecurring = (id, data) => api.put(`/recurring/${id}`, data)

// Xóa dịch vụ khỏi hệ thống
export const deleteRecurring = (id) => api.delete(`/recurring/${id}`)

// Lấy lịch sử các lần tự động gia hạn
export const getRecurringHistory = (id, page = 0, size = 20) =>
  api.get(`/recurring/${id}/history?page=${page}&size=${size}`)
