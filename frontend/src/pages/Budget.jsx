import { useState, useEffect } from 'react'
import { getBudgets, upsertBudget, deleteBudget, getTransactionsByCategory } from '../api/budgets'
import { formatCurrency } from '../utils/format'
import { PiggyBank, Plus, Trash2, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const CATEGORIES = ['Ăn uống', 'Mua sắm', 'Di chuyển', 'Giải trí', 'Sức khỏe', 'Giáo dục', 'Hóa đơn', 'Khác']

function ProgressBar({ percentage, exceeded }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
      <div
        className={clsx(
          'h-2.5 rounded-full transition-all duration-500',
          exceeded ? 'bg-red-500' : percentage > 80 ? 'bg-amber-400' : 'bg-emerald-500'
        )}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  )
}

export default function Budget() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ categoryName: CATEGORIES[0], limitAmount: '' })
  const [expandedId, setExpandedId] = useState(null)
  const [txMap, setTxMap] = useState({})
  const [txLoading, setTxLoading] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await getBudgets(month, year)
      setBudgets(data)
    } catch {
      toast.error('Không tải được ngân sách')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [month, year])

  const handleSave = async () => {
    const amount = parseFloat(form.limitAmount)
    if (!amount || amount <= 0) return toast.error('Nhập số tiền hợp lệ')
    try {
      await upsertBudget({
        categoryName: form.categoryName,
        limitAmount: amount,
        month,
        year,
      })
      toast.success('Đã lưu ngân sách!')
      setShowForm(false)
      setForm({ categoryName: CATEGORIES[0], limitAmount: '' })
      load()
    } catch {
      toast.error('Không lưu được')
    }
  }

  const handleExpand = async (b) => {
    if (expandedId === b.id) { setExpandedId(null); return }
    setExpandedId(b.id)
    if (txMap[b.id]) return
    setTxLoading(b.id)
    try {
      const { data } = await getTransactionsByCategory(b.categoryName, month, year)
      setTxMap(prev => ({ ...prev, [b.id]: data }))
    } catch {
      setTxMap(prev => ({ ...prev, [b.id]: [] }))
    } finally {
      setTxLoading(null)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteBudget(id)
      toast.success('Đã xóa')
      load()
    } catch {
      toast.error('Không xóa được')
    }
  }

  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

  const totalLimit = budgets.reduce((s, b) => s + Number(b.limitAmount), 0)
  const totalSpent = budgets.reduce((s, b) => s + Number(b.spentAmount), 0)
  const exceededCount = budgets.filter(b => b.exceeded).length

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
            <PiggyBank size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Ngân sách</h1>
            <p className="text-xs text-gray-400">Đặt hạn mức chi tiêu theo danh mục</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> Thêm ngân sách
        </button>
      </div>

      {/* Month/year picker */}
      <div className="flex gap-3 mb-5">
        <select value={month} onChange={e => setMonth(Number(e.target.value))} className="input w-36">
          {months.map(m => <option key={m} value={m}>Tháng {m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(Number(e.target.value))} className="input w-28">
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Tổng quan */}
      {budgets.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">Tổng hạn mức</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(totalLimit)}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">Đã chi</p>
            <p className={clsx('text-lg font-bold', totalSpent > totalLimit ? 'text-red-600' : 'text-emerald-600')}>
              {formatCurrency(totalSpent)}
            </p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">Vượt ngân sách</p>
            <p className={clsx('text-lg font-bold', exceededCount > 0 ? 'text-red-600' : 'text-emerald-600')}>
              {exceededCount} danh mục
            </p>
          </div>
        </div>
      )}

      {/* Form thêm ngân sách */}
      {showForm && (
        <div className="card p-5 mb-5 border-2 border-primary-100">
          <h3 className="font-semibold text-gray-900 mb-4">Đặt hạn mức ngân sách</h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Danh mục</label>
              <select
                value={form.categoryName}
                onChange={e => setForm(f => ({ ...f, categoryName: e.target.value }))}
                className="input w-full"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Hạn mức (VND)</label>
              <input
                type="number"
                value={form.limitAmount}
                onChange={e => setForm(f => ({ ...f, limitAmount: e.target.value }))}
                placeholder="VD: 3000000"
                className="input w-full"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="btn-primary text-sm">Lưu</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary text-sm">Hủy</button>
          </div>
        </div>
      )}

      {/* Danh sách ngân sách */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Đang tải...</div>
      ) : budgets.length === 0 ? (
        <div className="card p-10 text-center">
          <PiggyBank size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500 font-medium">Chưa có ngân sách tháng này</p>
          <p className="text-sm text-gray-400 mt-1">Bấm "Thêm ngân sách" để đặt hạn mức chi tiêu</p>
        </div>
      ) : (
        <div className="space-y-4">
          {budgets.map(b => {
            const remaining = Number(b.limitAmount) - Number(b.spentAmount)
            const isExpanded = expandedId === b.id
            const txList = txMap[b.id] || []
            const isLoadingTx = txLoading === b.id
            return (
              <div key={b.id} className={clsx('card overflow-hidden', b.exceeded && 'border border-red-100')}>
                {/* Header — click để expand */}
                <div
                  className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleExpand(b)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {b.exceeded
                        ? <AlertTriangle size={16} className="text-red-500" />
                        : <CheckCircle size={16} className="text-emerald-500" />
                      }
                      <span className="font-semibold text-gray-900">{b.categoryName}</span>
                      {b.exceeded && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Vượt hạn mức</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(b.id) }}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                      {isExpanded
                        ? <ChevronUp size={16} className="text-gray-400" />
                        : <ChevronDown size={16} className="text-gray-400" />
                      }
                    </div>
                  </div>

                  <ProgressBar percentage={b.percentage} exceeded={b.exceeded} />

                  <div className="flex justify-between mt-2.5 text-sm">
                    <span className="text-gray-500">
                      Đã chi: <span className={clsx('font-semibold', b.exceeded ? 'text-red-600' : 'text-gray-900')}>
                        {formatCurrency(b.spentAmount)}
                      </span>
                    </span>
                    <span className="text-gray-500">
                      {b.exceeded
                        ? <span className="text-red-500 font-semibold">Vượt {formatCurrency(Math.abs(remaining))}</span>
                        : <span>Còn lại: <span className="font-semibold text-emerald-600">{formatCurrency(remaining)}</span></span>
                      }
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Hạn mức: {formatCurrency(b.limitAmount)} · {Math.round(b.percentage)}% đã dùng · Bấm để xem chi tiết</p>
                </div>

                {/* Panel chi tiết giao dịch */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      Giao dịch tháng {month}/{year}
                    </p>
                    {isLoadingTx ? (
                      <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
                        <Loader2 size={14} className="animate-spin" /> Đang tải...
                      </div>
                    ) : txList.length === 0 ? (
                      <p className="text-sm text-gray-400 py-2">Chưa có giao dịch nào trong tháng này</p>
                    ) : (
                      <div className="space-y-2">
                        {txList.map(tx => (
                          <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                            <div>
                              <p className="text-sm text-gray-800">{tx.note || b.categoryName}</p>
                              <p className="text-xs text-gray-400">{tx.transactionDate} · {tx.walletName}</p>
                            </div>
                            <span className="text-sm font-semibold text-red-600">
                              -{formatCurrency(tx.amount)}
                            </span>
                          </div>
                        ))}
                        <p className="text-xs text-gray-400 pt-1">{txList.length} giao dịch</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
