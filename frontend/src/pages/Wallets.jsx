import { useState, useEffect } from 'react'
import { Plus, Trash2, Pencil, X } from 'lucide-react'
import { getWallets, createWallet, updateWallet, deleteWallet } from '../api/wallets'
import { formatCurrency } from '../utils/format'
import ConfirmModal from '../components/common/ConfirmModal'
import Spinner from '../components/common/Spinner'
import toast from 'react-hot-toast'

const TYPE_LABELS = { CASH: 'Tiền mặt', BANK: 'Ngân hàng', E_WALLET: 'Ví điện tử' }
const TYPE_ICONS  = { CASH: '💵', BANK: '🏦', E_WALLET: '📱' }

const BALANCE_PRESETS = [0, 100000, 500000, 1000000, 2000000, 5000000, 10000000, 20000000]

// ── Modal tạo / sửa ví ───────────────────────────────────────────────────────
function WalletModal({ onClose, onSuccess, editWallet = null }) {
  const isEdit = !!editWallet
  const [form, setForm] = useState({
    name:           editWallet?.name    ?? '',
    type:           editWallet?.type    ?? 'CASH',
    initialBalance: editWallet?.balance ?? 0,
    color:          editWallet?.color   ?? '#4F46E5',
    icon:           editWallet?.icon    ?? 'wallet',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (isEdit) {
        await updateWallet(editWallet.id, form)
        toast.success('Cập nhật ví thành công!')
      } else {
        await createWallet(form)
        toast.success('Tạo ví thành công!')
      }
      onSuccess()
    } catch {
      toast.error('Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Chỉnh sửa ví' : 'Thêm ví mới'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Tên */}
          <div>
            <label className="label">Tên ví</label>
            <input className="input" placeholder="VD: Ví tiền mặt"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>

          {/* Loại — chỉ cho đổi khi tạo mới */}
          <div>
            <label className="label">Loại ví</label>
            <select className="input" value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              disabled={isEdit}>
              <option value="CASH">Tiền mặt</option>
              <option value="BANK">Ngân hàng</option>
              <option value="E_WALLET">Ví điện tử</option>
            </select>
          </div>

          {/* Số dư */}
          <div>
            <label className="label">{isEdit ? 'Số dư hiện tại' : 'Số dư ban đầu'}</label>
            <input type="number" className="input" placeholder="0"
              value={form.initialBalance}
              onChange={e => setForm(f => ({ ...f, initialBalance: Number(e.target.value) }))} min="0" />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {BALANCE_PRESETS.map(amt => (
                <button key={amt} type="button"
                  onClick={() => setForm(f => ({ ...f, initialBalance: amt }))}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors
                    ${form.initialBalance === amt
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-primary-300 hover:text-primary-600'}`}>
                  {amt === 0 ? '0đ' : amt >= 1000000 ? `${amt / 1000000}tr` : `${amt / 1000}k`}
                </button>
              ))}
            </div>
          </div>

          {/* Màu */}
          <div>
            <label className="label">Màu sắc</label>
            <div className="flex items-center gap-3">
              <input type="color"
                className="h-10 w-16 rounded-lg border border-gray-300 cursor-pointer p-1"
                value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
              <div className="flex gap-2">
                {['#4F46E5','#10B981','#EF4444','#F59E0B','#3B82F6','#8B5CF6','#EC4899','#6B7280'].map(c => (
                  <button key={c} type="button"
                    onClick={() => setForm(f => ({ ...f, color: c }))}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo ví'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function Wallets() {
  const [wallets, setWallets] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [confirmId, setConfirmId] = useState(null)

  const fetchWallets = async () => {
    setLoading(true)
    const { data } = await getWallets()
    setWallets(data)
    setLoading(false)
  }

  useEffect(() => { fetchWallets() }, [])

  const handleDelete = async () => {
    await deleteWallet(confirmId)
    toast.success('Đã xóa ví')
    setConfirmId(null)
    fetchWallets()
  }

  const openCreate = () => { setEditTarget(null); setShowModal(true) }
  const openEdit   = (w)  => { setEditTarget(w);  setShowModal(true) }
  const closeModal = ()   => { setShowModal(false); setEditTarget(null) }

  const totalBalance = wallets.reduce((s, w) => s + Number(w.balance), 0)

  if (loading) return <Spinner />

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ví tiền</h1>
        <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
          <Plus size={16} /> Thêm ví
        </button>
      </div>

      {/* Tổng số dư */}
      <div className="card mb-6 bg-gradient-to-r from-primary-600 to-indigo-600 text-white">
        <p className="text-sm opacity-80 mb-1">Tổng số dư tất cả ví</p>
        <p className="text-3xl font-bold">{formatCurrency(totalBalance)}</p>
        <p className="text-xs opacity-60 mt-1">{wallets.length} ví đang hoạt động</p>
      </div>

      {/* Danh sách ví */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {wallets.map(w => (
          <div key={w.id} className="card hover:shadow-md transition-shadow group">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ backgroundColor: w.color + '20' }}>
                  {TYPE_ICONS[w.type]}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{w.name}</p>
                  <p className="text-xs text-gray-400">{TYPE_LABELS[w.type]}</p>
                </div>
              </div>

              {/* Actions — hiện khi hover */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(w)}
                  title="Sửa ví"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                  <Pencil size={15} />
                </button>
                <button onClick={() => setConfirmId(w.id)}
                  title="Xóa ví"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-50">
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(w.balance)}</p>
              <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{
                    backgroundColor: w.color,
                    width: `${Math.min(100, (Number(w.balance) / totalBalance) * 100)}%`
                  }} />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {totalBalance > 0 ? ((Number(w.balance) / totalBalance) * 100).toFixed(1) : 0}% tổng số dư
              </p>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <WalletModal
          editWallet={editTarget}
          onClose={closeModal}
          onSuccess={() => { closeModal(); fetchWallets() }}
        />
      )}

      {confirmId && (
        <ConfirmModal
          title="Xóa ví"
          message="Bạn có chắc muốn xóa ví này? Hành động không thể hoàn tác."
          onConfirm={handleDelete}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  )
}
