import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api/axios'
import toast from 'react-hot-toast'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()

  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (form.newPassword !== form.confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp')
      return
    }

    if (!token) {
      toast.error('Link đặt lại mật khẩu không hợp lệ')
      return
    }

    setLoading(true)
    try {
      const { data } = await api.post('/auth/reset-password', {
        token,
        newPassword: form.newPassword,
      })
      toast.success(data.message)
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Đặt lại mật khẩu thất bại')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link không hợp lệ</h1>
          <p className="text-gray-500 mb-6">Link đặt lại mật khẩu thiếu hoặc không đúng định dạng.</p>
          <Link to="/forgot-password" className="text-primary-600 hover:underline font-medium">
            Yêu cầu link mới
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">SS</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Đặt lại mật khẩu</h1>
          <p className="text-gray-500 mt-1">Nhập mật khẩu mới cho tài khoản của bạn</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Mật khẩu mới</label>
            <input
              type="password"
              className="input"
              placeholder="Tối thiểu 6 ký tự"
              value={form.newPassword}
              onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="label">Xác nhận mật khẩu</label>
            <input
              type="password"
              className="input"
              placeholder="Nhập lại mật khẩu"
              value={form.confirmPassword}
              onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
              required
              minLength={6}
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Đang cập nhật...' : 'Đặt lại mật khẩu'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link to="/login" className="text-primary-600 hover:underline font-medium">
            Quay lại đăng nhập
          </Link>
        </p>
      </div>
    </div>
  )
}
