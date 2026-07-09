import { useState, useEffect } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import api from '../api/axios'
import { CategoryIcon } from '../utils/icons'
import ConfirmModal from '../components/common/ConfirmModal'
import Spinner from '../components/common/Spinner'
import toast from 'react-hot-toast'

const ICON_OPTIONS = [
  'utensils','shopping-bag','car','heart','book','coffee','music','gift',
  'home','phone','tv','gamepad','scissors','film','dumbbell','bike',
  'bus','plane','shirt','briefcase','piggy-bank','trending-up','zap','star',
]
const COLORS = ['#6366f1','#ef4444','#f97316','#10b981','#f59e0b','#8b5cf6','#ec4899','#3b82f6','#14b8a6','#6b7280']

function CategoryModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ name: '', type: 'EXPENSE', icon: 'tag', color: '#6366f1' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/categories', form)
      toast.success('Đã thêm danh mục!')
      onSuccess()
    } catch {
      toast.error('Không thể thêm danh mục')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Thêm danh mục</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Loại */}
          <div className="flex gap-2">
            {['EXPENSE','INCOME'].map(t => (
              <button key={t} type="button"
                onClick={() => setForm(f => ({ ...f, type: t }))}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors
                  ${form.type === t
                    ? t === 'INCOME' ? 'bg-green-500 text-white border-green-500' : 'bg-red-500 text-white border-red-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                {t === 'INCOME' ? '↑ Thu nhập' : '↓ Chi tiêu'}
              </button>
            ))}
          </div>

          {/* Tên */}
          <div>
            <label className="label">Tên danh mục</label>
            <input className="input" placeholder="VD: Ăn uống, Du lịch..."
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>

          {/* Icon */}
          <div>
            <label className="label">Icon</label>
            <div className="grid grid-cols-8 gap-1.5">
              {ICON_OPTIONS.map(icon => (
                <button key={icon} type="button"
                  onClick={() => setForm(f => ({ ...f, icon }))}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-colors
                    ${form.icon === icon ? 'bg-primary-50 border-primary-400' : 'border-gray-100 hover:border-gray-300'}`}>
                  <CategoryIcon name={icon} type={form.type} size={16}
                    className={form.icon === icon ? 'text-primary-600' : 'text-gray-500'} />
                </button>
              ))}
            </div>
          </div>

          {/* Màu */}
          <div>
            <label className="label">Màu</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} type="button"
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${form.color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? 'Đang lưu...' : 'Tạo danh mục'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [confirmId, setConfirmId] = useState(null)
  const [tab, setTab] = useState('EXPENSE')

  const fetchCategories = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/categories')
      setCategories(data)
    } catch (error) {
      toast.error(error?.response?.status === 403 ? 'Bạn chưa đăng nhập hoặc phiên đã hết hạn' : 'Không tải được danh mục')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCategories() }, [])

  const handleDelete = async () => {
    await api.delete(`/categories/${confirmId}`)
    toast.success('Đã xóa danh mục')
    setConfirmId(null)
    fetchCategories()
  }

  const filtered = categories.filter(c => c.type === tab)
  const defaults = filtered.filter(c => c.default || c.isDefault)
  const customs  = filtered.filter(c => !c.default && !c.isDefault)

  if (loading) return <Spinner />

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Danh mục</h1>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Thêm danh mục
        </button>
      </div>

      {/* Tab */}
      <div className="flex gap-2 mb-5">
        {[
          { key: 'EXPENSE', label: '↓ Chi tiêu' },
          { key: 'INCOME',  label: '↑ Thu nhập' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors
              ${tab === key
                ? key === 'INCOME' ? 'bg-green-500 text-white border-green-500' : 'bg-red-500 text-white border-red-500'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Danh mục mặc định */}
      {defaults.length > 0 && (
        <div className="card mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Mặc định</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {defaults.map(c => (
              <div key={c.id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: (c.color || '#6366f1') + '20' }}>
                  <CategoryIcon name={c.icon} type={c.type} size={16}
                    style={{ color: c.color || '#6366f1' }} />
                </div>
                <span className="text-sm font-medium text-gray-700 truncate">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Danh mục tuỳ chỉnh */}
      <div className="card">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Tuỳ chỉnh của bạn</p>
        {customs.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <p className="text-3xl mb-2">📂</p>
            <p className="text-sm">Chưa có danh mục tuỳ chỉnh</p>
            <button className="mt-3 text-sm text-primary-600 hover:underline" onClick={() => setShowModal(true)}>
              + Tạo danh mục đầu tiên
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {customs.map(c => (
              <div key={c.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: (c.color || '#6366f1') + '20' }}>
                    <CategoryIcon name={c.icon} type={c.type} size={16}
                      style={{ color: c.color || '#6366f1' }} />
                  </div>
                  <span className="text-sm font-medium text-gray-800">{c.name}</span>
                </div>
                <button onClick={() => setConfirmId(c.id)}
                  className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <CategoryModal onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); fetchCategories() }} />
      )}
      {confirmId && (
        <ConfirmModal
          title="Xóa danh mục"
          message="Xóa danh mục này? Các giao dịch đã dùng sẽ không bị ảnh hưởng."
          onConfirm={handleDelete}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  )
}
