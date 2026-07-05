import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import toast from 'react-hot-toast'

const GOOGLE_CLIENT_ID = '1070878898814-svtnq77h0q7drqf9lt1803se85kj1487.apps.googleusercontent.com'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', form)
      login(data)
      toast.success(`Chào mừng, ${data.fullName}!`)
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Email hoặc mật khẩu không đúng')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">SS</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Đăng nhập</h1>
          <p className="text-gray-500 mt-1">Quản lý tài chính thông minh</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              placeholder="your@email.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">Mật khẩu</label>
              <Link to="/forgot-password" className="text-sm text-primary-600 hover:underline">
                Quên mật khẩu?
              </Link>
            </div>
            <input
              type="password"
              className="input"
              placeholder="••••••"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <div className="flex items-center my-5">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="px-3 text-sm text-gray-400">hoặc</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <GoogleLoginButton login={login} navigate={navigate} />

        <p className="text-center text-sm text-gray-500 mt-6">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="text-primary-600 hover:underline font-medium">
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  )
}

function GoogleLoginButton({ login, navigate }) {
  const [loading, setLoading] = useState(false)
  const [gsiReady, setGsiReady] = useState(false)
  // Hidden container mà Google renderButton sẽ render vào
  const hiddenRef = useRef(null)
  const callbackRef = useRef(null)

  // Callback nhận credential từ Google popup
  callbackRef.current = async (response) => {
    setLoading(true)
    try {
      const { data } = await api.post('/auth/google', { idToken: response.credential })
      login(data)
      toast.success(`Chào mừng, ${data.fullName}!`)
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Đăng nhập Google thất bại')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const initGSI = () => {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (res) => callbackRef.current(res),
        cancel_on_tap_outside: true,
      })
      // Render nút ẩn — dùng popup OAuth, không cần third-party cookies
      window.google.accounts.id.renderButton(hiddenRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
      })
      setGsiReady(true)
    }

    if (window.google?.accounts?.id) {
      initGSI()
      return
    }

    // Load GSI script nếu chưa có
    if (!document.getElementById('gsi-script')) {
      const script = document.createElement('script')
      script.id = 'gsi-script'
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.onload = initGSI
      document.head.appendChild(script)
    } else {
      // Script đang load — chờ
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval)
          initGSI()
        }
      }, 100)
      return () => clearInterval(interval)
    }
  }, [])

  // Click nút custom → kích hoạt click vào nút ẩn của Google (mở popup)
  const handleClick = () => {
    if (loading) return
    const googleBtn = hiddenRef.current?.querySelector('div[role="button"]')
    if (googleBtn) {
      googleBtn.click()
    } else {
      toast.error('Google chưa sẵn sàng, vui lòng thử lại')
    }
  }

  return (
    <>
      {/* Nút Google ẩn — Google renderButton render vào đây, dùng để mở popup */}
      <div
        ref={hiddenRef}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', zIndex: -1 }}
        aria-hidden="true"
      />

      {/* Nút hiển thị — custom style, khi click trigger nút ẩn bên trên */}
      <button
        id="google-login-btn"
        type="button"
        onClick={handleClick}
        disabled={loading || !gsiReady}
        className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 rounded-xl bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors duration-150 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        )}
        <span className="text-sm font-medium text-gray-700">
          {loading ? 'Đang xử lý...' : !gsiReady ? 'Đang tải...' : 'Đăng nhập bằng Google'}
        </span>
      </button>
    </>
  )
}
