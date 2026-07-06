import { useState, useEffect, useCallback } from 'react'
import {
  CalendarClock, Plus, RefreshCw, Trash2, History,
  Pause, Play, Loader2, X, CheckCircle, AlertCircle,
  ChevronLeft, ChevronRight, CreditCard, Repeat,
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { getRecurring, createRecurring, updateRecurring, deleteRecurring, getRecurringHistory } from '../api/recurring'
import { getWallets } from '../api/wallets'
import api from '../api/axios'
import { CategoryIcon } from '../utils/icons'
import { formatCurrency, formatDate } from '../utils/format'

// ─── helpers ──────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  ACTIVE:    { label: 'Đang chạy', cls: 'bg-emerald-100 text-emerald-700' },
  PAUSED:    { label: 'Tạm dừng', cls: 'bg-gray-100 text-gray-600'       },
  COMPLETED: { label: 'Đã xong',  cls: 'bg-blue-100 text-blue-700'       },
}

const CYCLE_LABEL = { MONTHLY: '/ Tháng', YEARLY: '/ Năm' }

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.ACTIVE
  return (
    <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full', cfg.cls)}>
      {cfg.label}
    </span>
  )
}

function ProgressBar({ pct }) {
  const safe = Math.min(Math.max(pct ?? 0, 0), 100)
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
      <div
        className={clsx('h-1.5 rounded-full transition-all duration-500',
          safe >= 100 ? 'bg-blue-500' : safe > 60 ? 'bg-amber-400' : 'bg-primary-500')}
        style={{ width: `${safe}%` }}
      />
    </div>
  )
}

// ─── Modal dùng chung ─────────────────────────────────────────────────────────

function ModalWrapper({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ─── Modal Tạo mới ────────────────────────────────────────────────────────────

function CreateRecurringModal({ wallets, categories, onClose, onCreated }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    name: '', amount: '', walletId: '', categoryId: '',
    paymentType: 'RECURRING', cycleType: 'MONTHLY',
    startDate: today, totalMonths: '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.walletId)   return toast.error('Vui lòng chọn ví')
    if (!form.categoryId) return toast.error('Vui lòng chọn danh mục')
    if (form.paymentType === 'INSTALLMENT' && (!form.totalMonths || Number(form.totalMonths) < 1))
      return toast.error('Trả góp cần nhập tổng số kỳ (≥ 1)')

    setSaving(true)
    try {
      const payload = {
        name: form.name, amount: Number(form.amount),
        walletId: Number(form.walletId), categoryId: Number(form.categoryId),
        paymentType: form.paymentType, cycleType: form.cycleType,
        startDate: form.startDate,
        totalMonths: form.paymentType === 'INSTALLMENT' ? Number(form.totalMonths) : undefined,
      }
      await createRecurring(payload)
      toast.success('Đã thêm thành công!')
      onCreated(); onClose()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Có lỗi xảy ra')
    } finally { setSaving(false) }
  }

  return (
    <ModalWrapper onClose={onClose} title="Thêm hóa đơn / Trả góp">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Loại */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { v: 'RECURRING',    label: 'Định kỳ',  desc: 'Netflix, Spotify...',      icon: RefreshCw  },
            { v: 'INSTALLMENT',  label: 'Trả góp',  desc: 'Điện thoại, Xe máy...',   icon: CreditCard },
          ].map(({ v, label, desc, icon: Icon }) => (
            <button type="button" key={v} onClick={() => set('paymentType', v)}
              className={clsx('flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-sm transition-all',
                form.paymentType === v
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50')}>
              <Icon size={18} />
              <span className="font-semibold">{label}</span>
              <span className="text-xs opacity-70">{desc}</span>
            </button>
          ))}
        </div>

        {/* Tên */}
        <div>
          <label className="label">Tên dịch vụ</label>
          <input required className="input" placeholder={form.paymentType === 'RECURRING' ? 'VD: Netflix' : 'VD: Trả góp iPhone'}
            value={form.name} onChange={e => set('name', e.target.value)} />
        </div>

        {/* Số tiền + Chu kỳ */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Số tiền (VND)</label>
            <input required type="number" min="1000" className="input" placeholder="VD: 179000"
              value={form.amount} onChange={e => set('amount', e.target.value)} />
          </div>
          <div>
            <label className="label">Chu kỳ</label>
            <select className="input" value={form.cycleType} onChange={e => set('cycleType', e.target.value)}>
              <option value="MONTHLY">Hàng tháng</option>
              <option value="YEARLY">Hàng năm</option>
            </select>
          </div>
        </div>

        {/* Ví + Danh mục */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Ví thanh toán</label>
            <select required className="input" value={form.walletId} onChange={e => set('walletId', e.target.value)}>
              <option value="">-- Chọn ví --</option>
              {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Danh mục</label>
            <select required className="input" value={form.categoryId} onChange={e => set('categoryId', e.target.value)}>
              <option value="">-- Chọn --</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {/* Ngày bắt đầu */}
        <div>
          <label className="label">Ngày bắt đầu</label>
          <input required type="date" className="input"
            value={form.startDate} onChange={e => set('startDate', e.target.value)} />
        </div>

        {/* Tổng kỳ — chỉ hiện khi INSTALLMENT */}
        {form.paymentType === 'INSTALLMENT' && (
          <div>
            <label className="label">Tổng số kỳ trả góp</label>
            <input required type="number" min="1" className="input" placeholder="VD: 12"
              value={form.totalMonths} onChange={e => set('totalMonths', e.target.value)} />
            <p className="text-xs text-gray-400 mt-1">
              {form.totalMonths && form.amount
                ? `Tổng: ${formatCurrency(Number(form.amount) * Number(form.totalMonths))}`
                : 'Nhập tổng số tháng/kỳ cần trả'}
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button type="submit" disabled={saving}
            className="btn-primary flex-1 flex items-center justify-center gap-2">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            Thêm
          </button>
          <button type="button" onClick={onClose} className="btn-secondary">Hủy</button>
        </div>
      </form>
    </ModalWrapper>
  )
}

// ─── Modal Sửa ────────────────────────────────────────────────────────────────

function EditRecurringModal({ item, wallets, categories, onClose, onUpdated }) {
  const [form, setForm] = useState({
    amount: String(item.amount),
    walletId: String(item.walletId),
    categoryId: String(item.categoryId),
    status: item.status === 'COMPLETED' ? 'ACTIVE' : item.status,
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateRecurring(item.id, {
        amount: Number(form.amount),
        walletId: Number(form.walletId),
        categoryId: Number(form.categoryId),
        status: form.status,
      })
      toast.success('Đã cập nhật!')
      onUpdated(); onClose()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Có lỗi xảy ra')
    } finally { setSaving(false) }
  }

  return (
    <ModalWrapper onClose={onClose} title={`Sửa: ${item.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Số tiền (VND)</label>
          <input required type="number" min="1000" className="input"
            value={form.amount} onChange={e => set('amount', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Ví thanh toán</label>
            <select required className="input" value={form.walletId} onChange={e => set('walletId', e.target.value)}>
              {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Danh mục</label>
            <select required className="input" value={form.categoryId} onChange={e => set('categoryId', e.target.value)}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        {item.status !== 'COMPLETED' && (
          <div>
            <label className="label">Trạng thái</label>
            <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="ACTIVE">Đang chạy</option>
              <option value="PAUSED">Tạm dừng</option>
            </select>
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <button type="submit" disabled={saving}
            className="btn-primary flex-1 flex items-center justify-center gap-2">
            {saving && <Loader2 size={15} className="animate-spin" />} Lưu
          </button>
          <button type="button" onClick={onClose} className="btn-secondary">Hủy</button>
        </div>
      </form>
    </ModalWrapper>
  )
}

// ─── Modal Lịch sử ────────────────────────────────────────────────────────────

function HistoryModal({ item, onClose }) {
  const [histories, setHistories] = useState([])
  const [loading, setLoading]     = useState(true)
  const [page, setPage]           = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const load = useCallback(async (p = 0) => {
    setLoading(true)
    try {
      const { data } = await getRecurringHistory(item.id, p, 10)
      setHistories(data.content)
      setTotalPages(data.totalPages)
      setPage(p)
    } catch { toast.error('Không tải được lịch sử') }
    finally { setLoading(false) }
  }, [item.id])

  useEffect(() => { load(0) }, [load])

  return (
    <ModalWrapper onClose={onClose} title={`Lịch sử: ${item.name}`}>
      <p className="text-xs text-gray-400 mb-4">
        {item.paymentType === 'INSTALLMENT'
          ? `Trả góp — Đã ${item.paidMonths}/${item.totalMonths} kỳ`
          : `Định kỳ ${item.cycleType === 'MONTHLY' ? 'hàng tháng' : 'hàng năm'}`}
      </p>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 size={24} className="animate-spin text-gray-300" />
        </div>
      ) : !histories.length ? (
        <div className="text-center py-10 text-gray-400 text-sm">
          Chưa có lịch sử thanh toán tự động
        </div>
      ) : (
        <div className="space-y-0">
          {histories.map((h, idx) => (
            <div key={h.id} className="flex gap-3 group">
              {/* Dot + line */}
              <div className="flex flex-col items-center pt-1">
                <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0',
                  h.status === 'SUCCESS' ? 'bg-emerald-100' : 'bg-red-100')}>
                  {h.status === 'SUCCESS'
                    ? <CheckCircle size={14} className="text-emerald-600" />
                    : <AlertCircle size={14} className="text-red-500" />}
                </div>
                {idx < histories.length - 1 && (
                  <div className="w-px flex-1 bg-gray-100 mt-1" />
                )}
              </div>
              {/* Content */}
              <div className={clsx('flex-1 pb-4', idx === histories.length - 1 && 'pb-0')}>
                <div className={clsx('rounded-xl p-3 border',
                  h.status === 'SUCCESS' ? 'border-gray-100 bg-white' : 'border-red-100 bg-red-50/50')}>
                  <div className="flex items-center justify-between">
                    <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full',
                      h.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}>
                      {h.status === 'SUCCESS' ? '✓ Thành công' : '✗ Thất bại'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {h.paymentDate ? formatDate(h.paymentDate) : '—'}
                    </span>
                  </div>
                  {h.status === 'FAILED' && h.failureReason && (
                    <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                      ❌ {h.failureReason}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100">
          <span className="text-xs text-gray-400">Trang {page + 1}/{totalPages}</span>
          <div className="flex gap-1">
            <button disabled={page === 0} onClick={() => load(page - 1)}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30">
              <ChevronLeft size={15} />
            </button>
            <button disabled={page >= totalPages - 1} onClick={() => load(page + 1)}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30">
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </ModalWrapper>
  )
}

// ─── Card một dịch vụ ─────────────────────────────────────────────────────────

function RecurringCard({ item, onToggle, onEdit, onHistory, onDelete, toggling }) {
  const isCompleted = item.status === 'COMPLETED'
  const daysUntil = item.nextPaymentDate
    ? Math.ceil((new Date(item.nextPaymentDate) - new Date()) / 86400000)
    : null

  return (
    <div className={clsx(
      'card p-0 overflow-hidden transition-all hover:shadow-md',
      isCompleted && 'opacity-75'
    )}>
      {/* Stripe màu top */}
      <div className={clsx('h-1 w-full',
        item.status === 'ACTIVE'    ? 'bg-gradient-to-r from-emerald-400 to-teal-500' :
        item.status === 'PAUSED'    ? 'bg-gray-200' :
        'bg-gradient-to-r from-blue-400 to-indigo-500')} />

      <div className="p-4">
        {/* Row 1: Icon + Name + Badge */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: item.categoryColor + '20' }}>
              <CategoryIcon name={item.categoryIcon} size={17}
                className="opacity-80" style={{ color: item.categoryColor }} />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm leading-tight">{item.name}</p>
              <p className="text-xs text-gray-400">{item.categoryName}</p>
            </div>
          </div>
          <StatusBadge status={item.status} />
        </div>

        {/* Row 2: Giá + chu kỳ */}
        <div className="flex items-baseline gap-1 mb-3">
          <span className="text-lg font-bold text-gray-900">{formatCurrency(item.amount)}</span>
          <span className="text-xs text-gray-400">{CYCLE_LABEL[item.cycleType]}</span>
        </div>

        {/* Row 3: Ngày hẹn / Tiến độ */}
        {item.paymentType === 'INSTALLMENT' ? (
          <div className="space-y-1.5 mb-3">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Tiến độ: <strong>{item.paidMonths}/{item.totalMonths} kỳ</strong></span>
              <span>{item.progressPercent ?? 0}%</span>
            </div>
            <ProgressBar pct={item.progressPercent} />
            {!isCompleted && item.remainingMonths != null && (
              <p className="text-xs text-gray-400">Còn {item.remainingMonths} kỳ · {formatCurrency(item.amount * item.remainingMonths)}</p>
            )}
          </div>
        ) : (
          <div className="mb-3">
            {item.nextPaymentDate && !isCompleted && (
              <p className={clsx('text-xs font-medium',
                daysUntil <= 3 ? 'text-orange-600' : daysUntil <= 7 ? 'text-amber-600' : 'text-gray-500')}>
                {daysUntil === 0 ? '⚡ Hôm nay gia hạn'
                  : daysUntil < 0 ? `⚠️ Quá hạn ${Math.abs(daysUntil)} ngày`
                  : daysUntil <= 7 ? `⏰ Còn ${daysUntil} ngày`
                  : `Gia hạn: ${formatDate(item.nextPaymentDate)}`}
              </p>
            )}
            {isCompleted && <p className="text-xs text-blue-500">Hoàn tất</p>}
          </div>
        )}

        {/* Ví */}
        <p className="text-xs text-gray-400 mb-3 flex items-center gap-1">
          <span>💳</span> {item.walletName}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-1.5 border-t border-gray-50 pt-3">
          {/* Toggle ACTIVE/PAUSED */}
          {!isCompleted && (
            <button
              onClick={() => onToggle(item)}
              disabled={toggling === item.id}
              className={clsx(
                'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50',
                item.status === 'ACTIVE'
                  ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              )}>
              {toggling === item.id ? <Loader2 size={12} className="animate-spin" />
                : item.status === 'ACTIVE' ? <Pause size={12} /> : <Play size={12} />}
              {item.status === 'ACTIVE' ? 'Tạm dừng' : 'Bật lại'}
            </button>
          )}
          {/* Sửa */}
          {!isCompleted && (
            <button onClick={() => onEdit(item)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors">
              ✏️ Sửa
            </button>
          )}
          {/* Lịch sử */}
          <button onClick={() => onHistory(item)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
            <History size={12} /> Lịch sử
          </button>
          {/* Xóa */}
          <button onClick={() => onDelete(item)}
            className="ml-auto p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Confirm xóa ──────────────────────────────────────────────────────────────

function ConfirmDeleteModal({ item, onClose, onConfirm, loading }) {
  return (
    <ModalWrapper title="Xác nhận xóa" onClose={onClose}>
      <p className="text-gray-600 text-sm mb-5">
        Bạn có chắc muốn xóa <strong>"{item.name}"</strong>? Toàn bộ lịch sử gia hạn sẽ bị xóa theo.
      </p>
      <div className="flex gap-2">
        <button onClick={onConfirm} disabled={loading}
          className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50">
          {loading && <Loader2 size={14} className="animate-spin" />} Xóa
        </button>
        <button onClick={onClose} className="btn-secondary">Hủy</button>
      </div>
    </ModalWrapper>
  )
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({ label, amount, sub, gradientCls, icon: Icon }) {
  return (
    <div className={clsx('rounded-2xl p-4 flex items-center gap-4', gradientCls)}>
      <div className="w-10 h-10 rounded-xl bg-white/30 flex items-center justify-center flex-shrink-0">
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-white/80 font-medium">{label}</p>
        <p className="text-xl font-bold text-white">{formatCurrency(amount)}</p>
        {sub && <p className="text-xs text-white/70 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── TRANG CHÍNH ──────────────────────────────────────────────────────────────

export default function Recurring() {
  const [activeTab, setActiveTab]       = useState('RECURRING')
  const [items, setItems]               = useState([])
  const [loading, setLoading]           = useState(false)
  const [page, setPage]                 = useState(0)
  const [totalPages, setTotalPages]     = useState(0)

  const [wallets, setWallets]           = useState([])
  const [categories, setCategories]     = useState([])

  // Modal states
  const [showCreate, setShowCreate]     = useState(false)
  const [editItem, setEditItem]         = useState(null)
  const [historyItem, setHistoryItem]   = useState(null)
  const [deleteItem, setDeleteItem]     = useState(null)
  const [deleting, setDeleting]         = useState(false)
  const [toggling, setToggling]         = useState(null)   // id đang toggle

  // Summary — tính trực tiếp từ danh sách ACTIVE
  const [summaryMonthly, setSummaryMonthly]         = useState(0)
  const [summaryInstallmentLeft, setSummaryInstallmentLeft] = useState(0)

  // Load ví và danh mục khi mount
  useEffect(() => {
    getWallets().then(({ data }) => setWallets(data)).catch(() => {})
    // Lấy danh mục EXPENSE
    api.get('/categories').then(({ data }) =>
      setCategories(data.filter(c => c.type === 'EXPENSE'))
    ).catch(() => {})
  }, [])

  // Tính summary từ tất cả item ACTIVE (gọi không phân trang size lớn)
  const loadSummary = useCallback(async () => {
    try {
      const [{ data: monthly }, { data: installment }] = await Promise.all([
        getRecurring({ paymentType: 'RECURRING', status: 'ACTIVE', size: 200 }),
        getRecurring({ paymentType: 'INSTALLMENT', status: 'ACTIVE', size: 200 }),
      ])
      const sumMonthly = monthly.content
        .filter(r => r.cycleType === 'MONTHLY')
        .reduce((s, r) => s + Number(r.amount), 0)
      const sumInstallLeft = installment.content
        .reduce((s, r) => s + (Number(r.amount) * (r.remainingMonths ?? 0)), 0)
      setSummaryMonthly(sumMonthly)
      setSummaryInstallmentLeft(sumInstallLeft)
    } catch {}
  }, [])

  const loadItems = useCallback(async (p = 0) => {
    setLoading(true)
    try {
      const { data } = await getRecurring({ paymentType: activeTab, page: p, size: 12 })
      setItems(data.content)
      setTotalPages(data.totalPages)
      setPage(p)
    } catch { toast.error('Không tải được danh sách') }
    finally { setLoading(false) }
  }, [activeTab])

  useEffect(() => { loadItems(0) }, [loadItems])
  useEffect(() => { loadSummary() }, [loadSummary])

  const handleCreated = () => { loadItems(0); loadSummary() }
  const handleUpdated = () => { loadItems(page); loadSummary() }

  // Toggle ACTIVE <-> PAUSED
  const handleToggle = async (item) => {
    setToggling(item.id)
    const newStatus = item.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    try {
      await updateRecurring(item.id, {
        amount: item.amount,
        walletId: item.walletId,
        categoryId: item.categoryId,
        status: newStatus,
      })
      toast.success(newStatus === 'ACTIVE' ? 'Đã bật lại dịch vụ!' : 'Đã tạm dừng dịch vụ!')
      handleUpdated()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Có lỗi xảy ra')
    } finally { setToggling(null) }
  }

  // Xóa
  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteRecurring(deleteItem.id)
      toast.success('Đã xóa thành công!')
      setDeleteItem(null)
      handleUpdated()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Không xóa được')
    } finally { setDeleting(false) }
  }

  const TABS = [
    { key: 'RECURRING',   label: 'Dịch vụ định kỳ',   icon: RefreshCw,   desc: 'Netflix, Spotify...'           },
    { key: 'INSTALLMENT', label: 'Khoản trả góp',      icon: CreditCard,  desc: 'Điện thoại, Xe máy...'        },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <CalendarClock size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Hóa đơn định kỳ</h1>
            <p className="text-xs text-gray-400">Quản lý dịch vụ và khoản trả góp</p>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> Thêm hóa đơn / Trả góp
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <SummaryCard label="Chi phí định kỳ tháng này (ACTIVE)" amount={summaryMonthly}
          sub="Tổng dịch vụ hàng tháng đang chạy" icon={RefreshCw}
          gradientCls="bg-gradient-to-r from-violet-500 to-indigo-500" />
        <SummaryCard label="Tổng khoản trả góp còn lại" amount={summaryInstallmentLeft}
          sub="Tổng tiền chưa hoàn tất" icon={CreditCard}
          gradientCls="bg-gradient-to-r from-orange-500 to-rose-500" />
      </div>

      {/* Tab bar */}
      <div className="card p-0 overflow-hidden">
        <div className="flex border-b border-gray-100">
          {TABS.map(t => (
            <button key={t.key} onClick={() => { setActiveTab(t.key); setPage(0) }}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium transition-colors',
                activeTab === t.key
                  ? 'border-b-2 border-violet-500 text-violet-700 bg-violet-50/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              )}>
              <t.icon size={15} />{t.label}
              <span className="text-xs opacity-60 hidden sm:inline">({t.desc})</span>
            </button>
          ))}
        </div>

        {/* Grid danh sách */}
        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={28} className="animate-spin text-gray-300" />
            </div>
          ) : !items.length ? (
            <div className="text-center py-16">
              <CalendarClock size={40} className="mx-auto text-gray-200 mb-3" />
              <p className="text-gray-500 font-medium">Chưa có dịch vụ nào</p>
              <p className="text-sm text-gray-400 mt-1">Bấm "Thêm hóa đơn / Trả góp" để bắt đầu</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map(item => (
                <RecurringCard key={item.id} item={item}
                  toggling={toggling}
                  onToggle={handleToggle}
                  onEdit={setEditItem}
                  onHistory={setHistoryItem}
                  onDelete={setDeleteItem} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400">Trang {page + 1} / {totalPages}</p>
              <div className="flex gap-1">
                <button disabled={page === 0} onClick={() => loadItems(page - 1)}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30">
                  <ChevronLeft size={16} />
                </button>
                <button disabled={page >= totalPages - 1} onClick={() => loadItems(page + 1)}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* === Modals === */}
      {showCreate && (
        <CreateRecurringModal
          wallets={wallets} categories={categories}
          onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}
      {editItem && (
        <EditRecurringModal item={editItem} wallets={wallets} categories={categories}
          onClose={() => setEditItem(null)} onUpdated={handleUpdated} />
      )}
      {historyItem && (
        <HistoryModal item={historyItem} onClose={() => setHistoryItem(null)} />
      )}
      {deleteItem && (
        <ConfirmDeleteModal item={deleteItem} loading={deleting}
          onClose={() => setDeleteItem(null)} onConfirm={handleDelete} />
      )}
    </div>
  )
}
