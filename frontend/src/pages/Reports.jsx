import { useState, useEffect } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts'
import { getSummary, getCategoryBreakdown, getTimeline } from '../api/reports'
import { getTransactions } from '../api/transactions'
import { formatCurrency, formatShortDate, formatDate } from '../utils/format'
import { CategoryIcon } from '../utils/icons'
import { X, ChevronRight } from 'lucide-react'

const COLORS = ['#6366f1','#ef4444','#f97316','#10b981','#f59e0b','#8b5cf6','#ec4899','#3b82f6','#14b8a6','#f43f5e']

// ── Panel chi tiết danh mục ───────────────────────────────────────────────────
function CategoryDetail({ cat, transactions, color, onClose }) {
  const txList = transactions.filter(tx =>
    tx.categoryName === cat.category && tx.type === 'EXPENSE'
  ).sort((a, b) => b.transactionDate?.localeCompare(a.transactionDate))

  return (
    <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-end"
      onClick={onClose}>
      <div className="h-full w-full max-w-md bg-white shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-50">
              <CategoryIcon name={cat.icon} type="EXPENSE" size={18} className="text-red-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{cat.category}</p>
              <p className="text-xs text-gray-400">{txList.length} giao dịch</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={20} />
          </button>
        </div>

        {/* Tổng */}
        <div className="px-5 py-4 border-b border-gray-50" style={{ backgroundColor: color + '10' }}>
          <p className="text-xs text-gray-500 mb-1">Tổng chi tiêu</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(cat.total)}</p>
        </div>

        {/* Danh sách giao dịch */}
        <div className="flex-1 overflow-y-auto">
          {txList.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p>Không có giao dịch nào</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {txList.map(tx => (
                <div key={tx.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{formatDate(tx.transactionDate)}</p>
                    {tx.note && <p className="text-xs text-gray-400 italic mt-0.5">"{tx.note}"</p>}
                    <p className="text-xs text-gray-400 mt-0.5">{tx.walletName}</p>
                  </div>
                  <span className="font-semibold text-red-600 text-sm">
                    -{formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Reports() {
  const [period, setPeriod] = useState('month')
  const [summary, setSummary] = useState(null)
  const [categories, setCategories] = useState([])
  const [timeline, setTimeline] = useState([])
  const [allTx, setAllTx] = useState([])
  const [selected, setSelected] = useState(null)   // danh mục đang xem chi tiết

  useEffect(() => {
    const fetchAll = async () => {
      const [s, c, t, tx] = await Promise.all([
        getSummary(period),
        getCategoryBreakdown(period),
        getTimeline(period),
        getTransactions(0, 500),
      ])
      setSummary(s.data)
      setCategories(c.data)
      setTimeline(t.data.map(d => ({
        date: formatShortDate(d.date),
        income: Number(d.income),
        expense: Number(d.expense),
      })))
      setAllTx(tx.data.content || [])
      setSelected(null)
    }
    fetchAll()
  }, [period])

  const totalExpense = categories.reduce((s, c) => s + Number(c.total), 0)
  const pieData = categories.map(c => ({ name: c.category, value: Number(c.total) }))

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Báo cáo & Thống kê</h1>
        <select className="input w-auto" value={period} onChange={e => setPeriod(e.target.value)}>
          <option value="week">Tuần này</option>
          <option value="month">Tháng này</option>
          <option value="year">Năm nay</option>
        </select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Tổng thu', value: summary?.totalIncome,  color: 'text-green-600' },
          { label: 'Tổng chi', value: summary?.totalExpense, color: 'text-red-600'   },
          { label: 'Tiết kiệm', value: summary?.netBalance,  color: 'text-blue-600'  },
        ].map(item => (
          <div key={item.label} className="card text-center">
            <p className="text-sm text-gray-500 mb-1">{item.label}</p>
            <p className={`text-xl font-bold ${item.color}`}>{formatCurrency(item.value || 0)}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Bar chart */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Thu/Chi theo ngày</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="income"  name="Thu" fill="#10b981" radius={[4,4,0,0]} />
              <Bar dataKey="expense" name="Chi" fill="#ef4444" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Chi tiêu theo danh mục</h2>
          {pieData.length === 0 ? (
            <p className="text-center text-gray-400 py-16">Không có dữ liệu</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Category table với % và click */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Chi tiết theo danh mục</h2>
        <div className="divide-y divide-gray-50">
          {categories.map((c, i) => {
            const pct = totalExpense > 0 ? (Number(c.total) / totalExpense * 100) : 0
            const color = COLORS[i % COLORS.length]
            return (
              <button key={i} onClick={() => setSelected({ ...c, color })}
                className="w-full flex items-center gap-3 py-3 hover:bg-gray-50 rounded-lg px-2 transition-colors group text-left">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700 font-medium">{c.category}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 font-medium">{pct.toFixed(1)}%</span>
                      <span className="font-semibold text-sm text-red-600">{formatCurrency(c.total)}</span>
                      <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Panel chi tiết */}
      {selected && (
        <CategoryDetail
          cat={selected}
          color={selected.color}
          transactions={allTx}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
