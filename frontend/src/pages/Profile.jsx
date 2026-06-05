import { useState, useEffect } from 'react'
import { User, Lock, Save, Eye, EyeOff } from 'lucide-react'
import { getProfile, updateProfile, changePassword } from '../api/user'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

function AvatarPlaceholder({ name, size = 'lg' }) {
  const s = size === 'lg' ? 'w-20 h-20 text-2xl' : 'w-10 h-10 text-sm'
  return (
    <div className={`${s} rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-700 flex-shrink-0`}>
      {name?.charAt(0).toUpperCase()}
    </div>
  )
}

export default function Profile() {
  const { user: authUser, login } = useAuth()
  const [profile, setProfile] = useState(null)
  const [profileForm, setProfileForm] = useState({ fullName: '', avatarUrl: '' })
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false })
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPw, setSavingPw] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')

  useEffect(() => {
    getProfile().then(r => {
      setProfile(r.data)
      setProfileForm({ fullName: r.data.fullName, avatarUrl: r.data.avatarUrl || '' })
    })
  }, [])

  const handleProfileSave = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      const { data } = await updateProfile(profileForm)
      setProfile(data)
      // Cập nhật lại AuthContext
      login({ ...authUser, fullName: data.fullName, token: localStorage.getItem('token') })
      toast.success('Cập nhật thông tin thành công!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra')
    } finally {
      setSavingProfile(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error('Mật khẩu mới không khớp')
      return
    }
    setSavingPw(true)
    try {
      await changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
      toast.success('Đổi mật khẩu thành công!')
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Mật khẩu hiện tại không đúng')
    } finally {
      setSavingPw(false)
    }
  }

  const PasswordInput = ({ field, label, placeholder }) => (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <input
          type={showPw[field] ? 'text' : 'password'}
          className="input pr-10"
          placeholder={placeholder}
          value={pwForm[field]}
          onChange={e => setPwForm(f => ({ ...f, [field]: e.target.value }))}
          required minLength={field !== 'currentPassword' ? 6 : 1}
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          onClick={() => setShowPw(s => ({ ...s, [field]: !s[field] }))}
        >
          {showPw[field] ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  )

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Tài khoản của tôi</h1>

      {/* Profile card header */}
      <div className="card mb-6 flex items-center gap-4">
        <AvatarPlaceholder name={profile?.fullName} />
        <div>
          <p className="text-lg font-semibold text-gray-900">{profile?.fullName}</p>
          <p className="text-sm text-gray-500">{profile?.email}</p>
          <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full mt-1 inline-block">
            {profile?.role}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {[
          { id: 'profile', label: 'Thông tin', icon: User },
          { id: 'password', label: 'Đổi mật khẩu', icon: Lock },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px
              ${activeTab === id
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Profile */}
      {activeTab === 'profile' && (
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Chỉnh sửa thông tin</h2>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div>
              <label className="label">Họ và tên</label>
              <input
                className="input"
                value={profileForm.fullName}
                onChange={e => setProfileForm(f => ({ ...f, fullName: e.target.value }))}
                required minLength={2}
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input bg-gray-50 cursor-not-allowed" value={profile?.email || ''} disabled />
              <p className="text-xs text-gray-400 mt-1">Email không thể thay đổi</p>
            </div>
            <div>
              <label className="label">URL Avatar (tùy chọn)</label>
              <input
                className="input"
                placeholder="https://example.com/avatar.jpg"
                value={profileForm.avatarUrl}
                onChange={e => setProfileForm(f => ({ ...f, avatarUrl: e.target.value }))}
              />
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" className="btn-primary flex items-center gap-2" disabled={savingProfile}>
                <Save size={16} />
                {savingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab: Password */}
      {activeTab === 'password' && (
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Đổi mật khẩu</h2>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <PasswordInput field="currentPassword" label="Mật khẩu hiện tại" placeholder="Nhập mật khẩu hiện tại" />
            <PasswordInput field="newPassword" label="Mật khẩu mới" placeholder="Tối thiểu 6 ký tự" />
            <PasswordInput field="confirmPassword" label="Xác nhận mật khẩu mới" placeholder="Nhập lại mật khẩu mới" />
            <div className="flex justify-end pt-2">
              <button type="submit" className="btn-primary flex items-center gap-2" disabled={savingPw}>
                <Lock size={16} />
                {savingPw ? 'Đang lưu...' : 'Đổi mật khẩu'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
