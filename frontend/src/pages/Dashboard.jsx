import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Wallet, ArrowLeftRight, ChevronRight, X } from 'lucide-react'
import Spinner from '../components/common/Spinner'
import { CategoryIcon } from '../utils/icons'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getSummary, getTimeline, getCategoryBreakdown } from '../api/reports'
import { getTransactions } from '../api/transactions'
import { formatCurrency, formatDate, formatShortDate } from '../utils/format'
import { useAuth } from '../context/AuthContext'

const COLORS = ['#6366f1','#ef4444','#f97316','#10b981','#f59e0b','#8b5cf6','#ec4899','#3b82f6','#14b8a6','#f43f5e']

function StatCard({ title, value, icon: Icon, color }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">{title}</p>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{formatCurrency(value || 0)}</p>
    </div>
  )
}

// ── Panel chi tiết danh mục ───────────────────────────────────────────────────
function CategoryDetail({ cat, allTx, color, onClose }) {
  const txList = allTx
    .filter(tx => tx.categoryName === cat.category && tx.type === 'EXPENSE')
    .sort((a, b) => String(b.transactionDate).localeCompare(String(a.transactionDate)))

  return (
    <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-end"
      onClick={onClose}>
      <div className="h-full w-full max-w-sm bg-white shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
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

        <div className="px-5 py-4 border-b border-gray-50" style={{ backgroundColor: color + '15' }}>
          <p className="text-xs text-gray-500 mb-1">Tổng chi tiêu</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(cat.total)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{cat.pct.toFixed(1)}% tổng chi tiêu tháng này</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {txList.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">Không có giao dịch</div>
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

export default function Dashboard() {
  const { user } = useAuth()
  const [summary, setSummary] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [recentTx, setRecentTx] = useState([])
  const [categories, setCategories] = useState([])
  const [allTx, setAllTx] = useState([])
  const [period, setPeriod] = useState('month')
  const [loading, setLoading] = useState(true)
  const [selectedCat, setSelectedCat] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [s, t, txRecent, cats, txAll] = await Promise.all([
          getSummary(period),
          getTimeline(period),
          getTransactions(0, 5),
          getCategoryBreakdown(period),
          getTransactions(0, 500),
        ])
        setSummary(s.data)
        setTimeline(t.data.map(d => ({
          ...d,
          date: formatShortDate(d.date),
          income: Number(d.income),
          expense: Number(d.expense),
        })))
        setRecentTx(txRecent.data.content || [])
        setCategories(cats.data)
        setAllTx(txAll.data.content || [])
      } catch {}
      setLoading(false)
    }
    fetchData()
  }, [period])

  if (loading) return <Spinner />

  const totalExpense = categories.reduce((s, c) => s + Number(c.total), 0)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Xin chào, {user?.fullName}!</h1>
          <p className="text-gray-500 text-sm mt-1">Đây là tình hình tài chính của bạn</p>
        </div>
        <select className="input w-auto" value={period} onChange={e => { setPeriod(e.target.value); setSelectedCat(null) }}>
          <option value="week">Tuần này</option>
          <option value="month">Tháng này</option>
          <option value="year">Năm nay</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Số dư tổng"  value={summary?.totalWalletBalance} icon={Wallet}        color="bg-primary-600" />
        <StatCard title="Tổng thu"    value={summary?.totalIncome}         icon={TrendingUp}    color="bg-green-500" />
        <StatCard title="Tổng chi"    value={summary?.totalExpense}        icon={TrendingDown}  color="bg-red-500" />
        <StatCard title="Tiết kiệm"   value={summary?.netBalance}          icon={ArrowLeftRight} color="bg-blue-500" />
      </div>

      {/* Chart + Category breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Chart — chiếm 2/3 */}
        <div className="card lg:col-span-2">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Dòng tiền</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={timeline}>
              <defs>
                <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v => formatCurrency(v)} />
              <Area type="monotone" dataKey="income"  stroke="#10b981" fill="url(#gIncome)"  name="Thu" strokeWidth={2} />
              <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="url(#gExpense)" name="Chi" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category breakdown — chiếm 1/3 */}
        <div className="card flex flex-col">
          <h2 className="text-base font-semibold text-gray-900 mb-3">Chi tiêu theo danh mục</h2>
          {categories.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Không có dữ liệu</p>
          ) : (
            <div className="space-y-2 flex-1 overflow-y-auto max-h-[220px]">
              {categories.map((c, i) => {
                const pct = totalExpense > 0 ? (Number(c.total) / totalExpense * 100) : 0
                const color = COLORS[i % COLORS.length]
                return (
                  <button key={i}
                    onClick={() => setSelectedCat({ ...c, pct, color, icon: c.icon })}
                    className="w-full text-left hover:bg-gray-50 rounded-xl p-2 transition-colors group">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-xs font-medium text-gray-700 truncate max-w-[100px]">{c.category}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-400">{pct.toFixed(0)}%</span>
                        <ChevronRight size={11} className="text-gray-300 group-hover:text-gray-500" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                      <span className="text-xs text-red-500 font-medium whitespace-nowrap">
                        {formatCurrency(c.total)}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Giao dịch gần đây</h2>
        {recentTx.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">Chưa có giao dịch nào</p>
        ) : (
          <div className="space-y-1">
            {recentTx.map(tx => (
              <div key={tx.id} className="flex items-center justify-between py-2.5 px-2 hover:bg-gray-50 rounded-xl transition-colors border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0
                    ${tx.type === 'INCOME' ? 'bg-green-50' : tx.type === 'EXPENSE' ? 'bg-red-50' : 'bg-blue-50'}`}>
                    <CategoryIcon name={tx.categoryIcon} type={tx.type} size={16}
                      className={tx.type === 'INCOME' ? 'text-green-600' : tx.type === 'EXPENSE' ? 'text-red-500' : 'text-blue-500'} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{tx.categoryName || 'Khác'}</p>
                    <p className="text-xs text-gray-400">{formatDate(tx.transactionDate)} · {tx.walletName}</p>
                  </div>
                </div>
                <span className={`font-semibold text-sm ${tx.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Category detail panel */}
      {selectedCat && (
        <CategoryDetail
          cat={selectedCat}
          allTx={allTx}
          color={selectedCat.color}
          onClose={() => setSelectedCat(null)}
        />
      )}
    </div>
  )
}
