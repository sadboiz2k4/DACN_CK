import { useState, useEffect, useCallback } from 'react'
import {
  Receipt, Plus, ArrowUpRight, ArrowDownLeft,
  AlertTriangle, CheckCircle, Clock, Loader2,
  ChevronLeft, ChevronRight, Pencil, Trash2, X,
  TrendingDown, TrendingUp, Wallet, Calendar, User, FileText,
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { getDebts, getDebtById, createDebt, updateDebt, addPayment, updatePayment, deletePayment } from '../api/debts'
import { getWallets } from '../api/wallets'
import { formatCurrency, formatDate } from '../utils/format'

// ─── helpers ──────────────────────────────────────────────────────────────────

const STATUS_MAP = {
  PARTIAL:  { label: 'Đang nợ',   cls: 'bg-amber-100 text-amber-700'   },
  PAID:     { label: 'Đã xong',   cls: 'bg-emerald-100 text-emerald-700' },
  OVERDUE:  { label: 'Quá hạn',   cls: 'bg-red-100 text-red-700'       },
}

function StatusBadge({ status, overdue }) {
  const s = overdue && status !== 'PAID' ? 'OVERDUE' : status
  const { label, cls } = STATUS_MAP[s] || STATUS_MAP.PARTIAL
  return (
    <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1', cls)}>
      {s === 'OVERDUE' && <AlertTriangle size={10} />}
      {s === 'PAID'    && <CheckCircle   size={10} />}
      {s === 'PARTIAL' && <Clock         size={10} />}
      {label}
    </span>
  )
}

function ProgressBar({ pct }) {
  const safe = Math.min(Math.max(pct, 0), 100)
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
      <div
        className={clsx('h-1.5 rounded-full transition-all duration-500',
          safe >= 100 ? 'bg-emerald-500' : safe > 60 ? 'bg-amber-400' : 'bg-primary-500')}
        style={{ width: `${safe}%` }}
      />
    </div>
  )
}

// ─── Modal sửa thông tin khoản nợ ────────────────────────────────────────────

function EditDebtModal({ debt, onClose, onUpdated }) {
  const [form, setForm] = useState({
    lenderBorrowerName: debt.lenderBorrowerName,
    amount: String(debt.amount),
    dueDate: debt.dueDate,        // yyyy-MM-dd từ API
    note: debt.note ?? '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Số tiền đã trả — không thể đặt amount mới nhỏ hơn con số này
  const paidAmount = Number(debt.amount) - Number(debt.remainAmount)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const amt = Number(form.amount)
    if (isNaN(amt) || amt < 1000) return toast.error('Số tiền tối thiểu 1,000 VND')
    if (amt < paidAmount) {
      return toast.error(`Số tiền gốc không thể nhỏ hơn số đã ${debt.type === 'DEBT' ? 'trả' : 'thu'} (${formatCurrency(paidAmount)})`)
    }
    setSaving(true)
    try {
      await updateDebt(debt.id, { ...form, amount: amt })
      toast.success('Đã cập nhật khoản nợ!')
      onUpdated()
      onClose()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Không cập nhật được')
    } finally {
      setSaving(false)
    }
  }

  const typeLabel = debt.type === 'DEBT' ? 'Người cho bạn vay' : 'Người bạn cho vay'

  return (
    <ModalWrapper onClose={onClose} title="Sửa thông tin khoản nợ">
      {/* Gợi nhắc: loại nợ không thể đổi */}
      <div className={clsx(
        'mb-4 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium',
        debt.type === 'DEBT'
          ? 'bg-rose-50 text-rose-700'
          : 'bg-emerald-50 text-emerald-700'
      )}>
        {debt.type === 'DEBT' ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
        Loại: {debt.type === 'DEBT' ? 'Mình đi vay' : 'Cho người khác vay'} · Ví gốc: {debt.walletName}
        <span className="ml-auto opacity-60">(không thể thay đổi)</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tên */}
        <div>
          <label className="label">{typeLabel}</label>
          <input required className="input" placeholder="Nhập tên..."
            value={form.lenderBorrowerName}
            onChange={e => set('lenderBorrowerName', e.target.value)} />
        </div>

        {/* Số tiền gốc */}
        <div>
          <label className="label">Số tiền gốc (VND)</label>
          <input required type="number" min={Math.max(1000, paidAmount)} className="input"
            value={form.amount}
            onChange={e => set('amount', e.target.value)} />
          {paidAmount > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              Tối thiểu: {formatCurrency(paidAmount)} (đã {debt.type === 'DEBT' ? 'trả' : 'thu'})
            </p>
          )}
        </div>

        {/* Ngày hẹn trả */}
        <div>
          <label className="label">Ngày hẹn trả</label>
          <input required type="date" className="input"
            value={form.dueDate}
            onChange={e => set('dueDate', e.target.value)} />
        </div>

        {/* Ghi chú */}
        <div>
          <label className="label">Ghi chú (tuỳ chọn)</label>
          <textarea rows={2} className="input resize-none"
            placeholder="Lý do, chi tiết..."
            value={form.note}
            onChange={e => set('note', e.target.value)} />
        </div>

        <div className="flex gap-2 pt-1">
          <button type="submit" disabled={saving}
            className="btn-primary flex-1 flex items-center justify-center gap-2">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Pencil size={15} />}
            Lưu thay đổi
          </button>
          <button type="button" onClick={onClose} className="btn-secondary">Hủy</button>
        </div>
      </form>
    </ModalWrapper>
  )
}

// ─── Modal tạo khoản nợ mới ───────────────────────────────────────────────────

function CreateDebtModal({ wallets, onClose, onCreated }) {
  const [form, setForm] = useState({
    type: 'DEBT', lenderBorrowerName: '', walletId: '',
    amount: '', dueDate: '', note: '',
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.walletId) return toast.error('Vui lòng chọn ví')
    setSaving(true)
    try {
      await createDebt({ ...form, walletId: Number(form.walletId), amount: Number(form.amount) })
      toast.success('Đã tạo khoản nợ!')
      onCreated()
      onClose()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Không tạo được khoản nợ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalWrapper onClose={onClose} title="Thêm khoản nợ mới">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Loại */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { v: 'DEBT', label: 'Mình đi vay', icon: TrendingDown, color: 'text-red-600 bg-red-50 border-red-200' },
            { v: 'LOAN', label: 'Cho người vay', icon: TrendingUp,  color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
          ].map(({ v, label, icon: Icon, color }) => (
            <button type="button" key={v}
              onClick={() => set('type', v)}
              className={clsx('flex items-center gap-2 px-3 py-3 rounded-lg border-2 text-sm font-medium transition-all',
                form.type === v ? color : 'border-gray-200 text-gray-500 hover:bg-gray-50')}>
              <Icon size={16} />{label}
            </button>
          ))}
        </div>
        {/* Tên */}
        <div>
          <label className="label">
            {form.type === 'DEBT' ? 'Người cho bạn vay' : 'Người bạn cho vay'}
          </label>
          <input required className="input" placeholder="Nhập tên..."
            value={form.lenderBorrowerName} onChange={e => set('lenderBorrowerName', e.target.value)} />
        </div>
        {/* Số tiền + ví */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Số tiền (VND)</label>
            <input required type="number" min="1000" className="input" placeholder="VD: 5000000"
              value={form.amount} onChange={e => set('amount', e.target.value)} />
          </div>
          <div>
            <label className="label">Ví liên quan</label>
            <select required className="input" value={form.walletId} onChange={e => set('walletId', e.target.value)}>
              <option value="">-- Chọn ví --</option>
              {wallets.map(w => <option key={w.id} value={w.id}>{w.name} ({formatCurrency(w.balance)})</option>)}
            </select>
          </div>
        </div>
        {/* Ngày hẹn */}
        <div>
          <label className="label">Ngày hẹn trả</label>
          <input required type="date" className="input"
            value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
        </div>
        {/* Ghi chú */}
        <div>
          <label className="label">Ghi chú (tuỳ chọn)</label>
          <textarea rows={2} className="input resize-none" placeholder="Lý do, chi tiết..."
            value={form.note} onChange={e => set('note', e.target.value)} />
        </div>
        <div className="flex gap-2 pt-1">
          <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Tạo khoản nợ
          </button>
          <button type="button" onClick={onClose} className="btn-secondary">Hủy</button>
        </div>
      </form>
    </ModalWrapper>
  )
}

// ─── Modal thêm / sửa đợt trả nợ ─────────────────────────────────────────────

function PaymentModal({ wallets, debt, editingDetail, onClose, onSaved }) {
  const isEdit = !!editingDetail
  const [form, setForm] = useState({
    walletId: editingDetail?.walletId ?? '',
    payAmount: editingDetail?.payAmount ?? '',
    note: editingDetail?.note ?? '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const maxAmount = isEdit
    ? Number(debt.remainAmount) + Number(editingDetail.payAmount)
    : Number(debt.remainAmount)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.walletId) return toast.error('Vui lòng chọn ví')
    const amt = Number(form.payAmount)
    if (amt > maxAmount) return toast.error(`Số tiền tối đa là ${formatCurrency(maxAmount)}`)
    setSaving(true)
    try {
      if (isEdit) {
        await updatePayment(editingDetail.id, { ...form, walletId: Number(form.walletId), payAmount: amt })
        toast.success('Đã cập nhật đợt trả!')
      } else {
        await addPayment(debt.id, { ...form, walletId: Number(form.walletId), payAmount: amt })
        toast.success(debt.type === 'DEBT' ? 'Đã ghi nhận trả nợ!' : 'Đã ghi nhận thu nợ!')
      }
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Có lỗi xảy ra')
    } finally {
      setSaving(false)
    }
  }

  const title = isEdit ? 'Sửa đợt trả nợ' : debt.type === 'DEBT' ? 'Ghi nhận trả nợ' : 'Ghi nhận thu nợ'

  return (
    <ModalWrapper onClose={onClose} title={title}>
      {!isEdit && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
          <p className="text-gray-500">Còn lại cần {debt.type === 'DEBT' ? 'trả' : 'thu'}:</p>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(debt.remainAmount)}</p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Số tiền</label>
          <input required type="number" min="1000" max={maxAmount} className="input"
            placeholder={`Tối đa ${formatCurrency(maxAmount)}`}
            value={form.payAmount} onChange={e => set('payAmount', e.target.value)} />
        </div>
        <div>
          <label className="label">Ví thực hiện</label>
          <select required className="input" value={form.walletId} onChange={e => set('walletId', e.target.value)}>
            <option value="">-- Chọn ví --</option>
            {wallets.map(w => <option key={w.id} value={w.id}>{w.name} ({formatCurrency(w.balance)})</option>)}
          </select>
        </div>
        <div>
          <label className="label">Ghi chú (tuỳ chọn)</label>
          <input type="text" className="input" placeholder='VD: "Trả đợt 1", "Tất toán"'
            value={form.note} onChange={e => set('note', e.target.value)} />
        </div>
        <div className="flex gap-2 pt-1">
          <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {saving ? <Loader2 size={15} className="animate-spin" /> : null}
            {isEdit ? 'Cập nhật' : 'Xác nhận'}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary">Hủy</button>
        </div>
      </form>
    </ModalWrapper>
  )
}

// ─── Modal wrapper dùng chung ─────────────────────────────────────────────────

function ModalWrapper({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
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

// ─── Confirm xóa ──────────────────────────────────────────────────────────────

function ConfirmDeleteModal({ onClose, onConfirm, loading }) {
  return (
    <ModalWrapper title="Xác nhận xóa" onClose={onClose}>
      <p className="text-gray-600 text-sm mb-5">
        Bạn có chắc muốn xóa đợt trả này không? Tiền sẽ được hoàn lại vào ví và khoản nợ sẽ được cập nhật lại.
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

// ─── Timeline một đợt trả ─────────────────────────────────────────────────────

function TimelineItem({ detail, debtType, onEdit, onDelete }) {
  const isExpense = detail.transactionType === 'EXPENSE'
  return (
    <div className="flex gap-3 group">
      {/* Dot + line */}
      <div className="flex flex-col items-center pt-1">
        <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
          isExpense ? 'bg-orange-100' : 'bg-emerald-100')}>
          {isExpense
            ? <ArrowUpRight size={15} className="text-orange-600" />
            : <ArrowDownLeft size={15} className="text-emerald-600" />}
        </div>
        <div className="w-px flex-1 bg-gray-100 mt-1" />
      </div>
      {/* Content */}
      <div className="flex-1 pb-5">
        <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className={clsx('font-bold text-sm', isExpense ? 'text-orange-600' : 'text-emerald-600')}>
                {isExpense ? '−' : '+'}{formatCurrency(detail.payAmount)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {detail.walletName} · {detail.paymentDate ? formatDate(detail.paymentDate) : '—'}
              </p>
              {detail.note && <p className="text-xs text-gray-500 mt-1 italic">"{detail.note}"</p>}
            </div>
            {/* Edit / delete */}
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onEdit(detail)}
                className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600">
                <Pencil size={13} />
              </button>
              <button onClick={() => onDelete(detail.id)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Panel chi tiết khoản nợ (slide-in từ phải) ───────────────────────────────

function DebtDetailPanel({ debtId, wallets, onClose, onUpdated }) {
  const [debt, setDebt]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [showPayModal, setShowPayModal]   = useState(false)
  const [editingDetail, setEditingDetail] = useState(null)
  const [deleteId, setDeleteId]           = useState(null)
  const [deleting, setDeleting]           = useState(false)
  const [showEditDebt, setShowEditDebt]   = useState(false)   // ← MỚI: modal sửa khoản nợ

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getDebtById(debtId)
      setDebt(data)
    } catch { toast.error('Không tải được chi tiết') }
    finally { setLoading(false) }
  }, [debtId])

  useEffect(() => { load() }, [load])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deletePayment(deleteId)
      toast.success('Đã xóa đợt trả')
      setDeleteId(null)
      load()
      onUpdated()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Không xóa được')
    } finally { setDeleting(false) }
  }

  const paidPct = debt ? Math.round(((Number(debt.amount) - Number(debt.remainAmount)) / Number(debt.amount)) * 100) : 0

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className={clsx('p-5 text-white flex items-center justify-between flex-shrink-0',
          debt?.type === 'DEBT' ? 'bg-gradient-to-r from-rose-500 to-orange-500'
                                : 'bg-gradient-to-r from-emerald-500 to-teal-500')}>
          <div>
            <p className="text-xs opacity-75 mb-1">
              {debt?.type === 'DEBT' ? 'Mình đang nợ' : 'Cho vay'}
            </p>
            <h2 className="font-bold text-lg truncate max-w-[220px]">
              {debt?.lenderBorrowerName ?? '...'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Nút sửa khoản nợ — chỉ hiện khi đã load xong */}
            {debt && (
              <button onClick={() => setShowEditDebt(true)}
                className="p-2 rounded-xl bg-white/20 hover:bg-white/30 flex items-center gap-1.5 text-xs font-medium">
                <Pencil size={14} /> Sửa
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-xl bg-white/20 hover:bg-white/30">
              <X size={18} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-gray-300" />
          </div>
        ) : !debt ? null : (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Tóm tắt */}
            <div className="card p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Số tiền gốc</span>
                <span className="font-semibold">{formatCurrency(debt.amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Đã {debt.type === 'DEBT' ? 'trả' : 'thu'}</span>
                <span className="font-semibold text-emerald-600">{formatCurrency(debt.paidAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Còn lại</span>
                <span className="font-bold text-gray-900">{formatCurrency(debt.remainAmount)}</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Tiến độ</span><span>{paidPct}%</span>
                </div>
                <ProgressBar pct={paidPct} />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-1"><Calendar size={13} />Hẹn trả</span>
                <span className={clsx('font-medium', debt.overdue ? 'text-red-600' : 'text-gray-700')}>
                  {formatDate(debt.dueDate)} {debt.overdue && '⚠️'}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Trạng thái</span>
                <StatusBadge status={debt.status} overdue={debt.overdue} />
              </div>
              {debt.note && (
                <p className="text-xs text-gray-400 italic border-t border-gray-50 pt-2">"{debt.note}"</p>
              )}
            </div>

            {/* Nút hành động */}
            {debt.status !== 'PAID' && (
              <button onClick={() => setShowPayModal(true)}
                className={clsx('w-full py-2.5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2',
                  debt.type === 'DEBT'
                    ? 'bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600')}>
                <Plus size={16} />
                {debt.type === 'DEBT' ? 'Ghi nhận trả nợ' : 'Ghi nhận thu nợ'}
              </button>
            )}

            {/* Timeline */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
                Lịch sử thanh toán ({debt.debtDetails?.length ?? 0} đợt)
              </p>
              {!debt.debtDetails?.length ? (
                <div className="text-center py-8 text-gray-400 text-sm">Chưa có đợt trả nào</div>
              ) : (
                <div>
                  {[...debt.debtDetails].reverse().map(d => (
                    <TimelineItem key={d.id} detail={d} debtType={debt.type}
                      onEdit={setEditingDetail}
                      onDelete={setDeleteId} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals con */}
      {(showPayModal || editingDetail) && debt && (
        <PaymentModal wallets={wallets} debt={debt}
          editingDetail={editingDetail}
          onClose={() => { setShowPayModal(false); setEditingDetail(null) }}
          onSaved={() => { load(); onUpdated() }} />
      )}
      {deleteId && (
        <ConfirmDeleteModal loading={deleting} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
      )}
      {/* Modal sửa khoản nợ */}
      {showEditDebt && debt && (
        <EditDebtModal
          debt={debt}
          onClose={() => setShowEditDebt(false)}
          onUpdated={() => { load(); onUpdated() }} />
      )}
    </div>
  )
}

// ─── Bảng danh sách nợ theo tab ───────────────────────────────────────────────

function DebtTable({ debts, loading, onRowClick }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Loader2 size={28} className="animate-spin" />
      </div>
    )
  }
  if (!debts.length) {
    return (
      <div className="text-center py-16">
        <Receipt size={40} className="mx-auto text-gray-200 mb-3" />
        <p className="text-gray-500 font-medium">Không có khoản nào</p>
        <p className="text-sm text-gray-400 mt-1">Bấm "Thêm khoản nợ mới" để bắt đầu</p>
      </div>
    )
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left">
            <th className="pb-3 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Người</th>
            <th className="pb-3 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Số tiền gốc</th>
            <th className="pb-3 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Còn lại</th>
            <th className="pb-3 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Tiến độ</th>
            <th className="pb-3 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Hẹn trả</th>
            <th className="pb-3     text-xs font-semibold text-gray-400 uppercase tracking-wide">Trạng thái</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {debts.map(d => {
            const paidPct = Math.round(((Number(d.amount) - Number(d.remainAmount)) / Number(d.amount)) * 100)
            return (
              <tr key={d.id} onClick={() => onRowClick(d.id)}
                className="hover:bg-gray-50 cursor-pointer transition-colors group">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <User size={14} className="text-gray-500" />
                    </div>
                    <span className="font-medium text-gray-900 group-hover:text-primary-700 transition-colors truncate max-w-[140px]">
                      {d.lenderBorrowerName}
                    </span>
                  </div>
                </td>
                <td className="py-3 pr-4 text-gray-600">{formatCurrency(d.amount)}</td>
                <td className="py-3 pr-4 font-semibold text-gray-900">{formatCurrency(d.remainAmount)}</td>
                <td className="py-3 pr-4 w-32">
                  <div className="space-y-1">
                    <ProgressBar pct={paidPct} />
                    <span className="text-xs text-gray-400">{paidPct}%</span>
                  </div>
                </td>
                <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">
                  <span className={clsx(d.overdue && d.status !== 'PAID' ? 'text-red-600 font-medium' : '')}>
                    {formatDate(d.dueDate)}
                  </span>
                </td>
                <td className="py-3">
                  <StatusBadge status={d.status} overdue={d.overdue} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
      <p className="text-xs text-gray-400">Trang {page + 1} / {totalPages}</p>
      <div className="flex gap-1">
        <button disabled={page === 0}
          onClick={() => onChange(page - 1)}
          className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronLeft size={16} className="text-gray-600" />
        </button>
        <button disabled={page >= totalPages - 1}
          onClick={() => onChange(page + 1)}
          className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronRight size={16} className="text-gray-600" />
        </button>
      </div>
    </div>
  )
}

// ─── Summary cards ────────────────────────────────────────────────────────────

function SummaryCard({ label, amount, sub, colorCls, icon: Icon }) {
  return (
    <div className={clsx('rounded-2xl p-4 flex items-center gap-4', colorCls)}>
      <div className="w-10 h-10 rounded-xl bg-white/40 flex items-center justify-center flex-shrink-0">
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

export default function Debts() {
  const [activeTab, setActiveTab] = useState('LOAN')   // LOAN = cho vay | DEBT = đi vay
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage]       = useState(0)
  const [pageData, setPageData] = useState({ content: [], totalPages: 0 })
  const [loading, setLoading]   = useState(false)

  const [wallets, setWallets] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [selectedDebtId, setSelectedDebtId] = useState(null)

  // Tổng hợp cho summary cards
  const [summary, setSummary] = useState({ totalDebt: 0, totalLoan: 0 })

  // Load ví
  useEffect(() => {
    getWallets().then(({ data }) => setWallets(data)).catch(() => {})
  }, [])

  // Load danh sách theo tab + filter
  const loadDebts = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getDebts({ type: activeTab, status: statusFilter || undefined, page, size: 10 })
      setPageData(data)
    } catch { toast.error('Không tải được danh sách') }
    finally { setLoading(false) }
  }, [activeTab, statusFilter, page])

  // Load tổng quan (cả 2 loại không filter status)
  const loadSummary = useCallback(async () => {
    try {
      const [{ data: debtData }, { data: loanData }] = await Promise.all([
        getDebts({ type: 'DEBT', status: 'PARTIAL', size: 100 }),
        getDebts({ type: 'LOAN', status: 'PARTIAL', size: 100 }),
      ])
      const sumRemain = (arr) => arr.content.reduce((s, d) => s + Number(d.remainAmount), 0)
      setSummary({ totalDebt: sumRemain(debtData), totalLoan: sumRemain(loanData) })
    } catch {}
  }, [])

  useEffect(() => { loadDebts() }, [loadDebts])
  useEffect(() => { loadSummary() }, [loadSummary])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setPage(0)
    setStatusFilter('')
  }

  const handleCreated = () => { loadDebts(); loadSummary() }
  const handleUpdated = () => { loadDebts(); loadSummary() }

  const TABS = [
    { key: 'LOAN', label: 'Người ta nợ mình', icon: TrendingUp,  color: 'text-emerald-600' },
    { key: 'DEBT', label: 'Mình nợ người ta', icon: TrendingDown, color: 'text-rose-600' },
  ]
  const STATUS_FILTERS = [
    { v: '',        label: 'Tất cả'    },
    { v: 'PARTIAL', label: 'Đang nợ'  },
    { v: 'PAID',    label: 'Đã xong'  },
    { v: 'OVERDUE', label: 'Quá hạn'  },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Receipt size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Sổ nợ</h1>
            <p className="text-xs text-gray-400">Quản lý các khoản vay và cho vay</p>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> Thêm khoản nợ
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <SummaryCard label="Người ta đang nợ mình (Cho vay)" amount={summary.totalLoan}
          sub="Tổng còn lại chưa thu" icon={TrendingUp}
          colorCls="bg-gradient-to-r from-emerald-500 to-teal-500" />
        <SummaryCard label="Mình đang nợ người ta (Đi vay)" amount={summary.totalDebt}
          sub="Tổng còn lại chưa trả" icon={TrendingDown}
          colorCls="bg-gradient-to-r from-rose-500 to-orange-500" />
      </div>

      {/* Tabs */}
      <div className="card p-0 overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-gray-100">
          {TABS.map(t => (
            <button key={t.key} onClick={() => handleTabChange(t.key)}
              className={clsx('flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium transition-colors',
                activeTab === t.key
                  ? `border-b-2 border-current ${t.color} bg-gray-50/50`
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50')}>
              <t.icon size={15} />{t.label}
            </button>
          ))}
        </div>

        {/* Bộ lọc trạng thái */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-50 flex-wrap">
          {STATUS_FILTERS.map(f => (
            <button key={f.v} onClick={() => { setStatusFilter(f.v); setPage(0) }}
              className={clsx('px-3 py-1 rounded-full text-xs font-medium transition-colors',
                statusFilter === f.v
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Bảng */}
        <div className="p-5">
          <DebtTable
            debts={pageData.content}
            loading={loading}
            onRowClick={setSelectedDebtId} />
          <Pagination page={page} totalPages={pageData.totalPages} onChange={setPage} />
        </div>
      </div>

      {/* Modals / Panels */}
      {showCreate && (
        <CreateDebtModal wallets={wallets} onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}
      {selectedDebtId && (
        <DebtDetailPanel
          debtId={selectedDebtId}
          wallets={wallets}
          onClose={() => setSelectedDebtId(null)}
          onUpdated={handleUpdated} />
      )}
    </div>
  )
}
