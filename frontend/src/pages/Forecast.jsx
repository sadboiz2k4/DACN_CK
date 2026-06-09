import { useState, useEffect } from 'react'
import { getForecast, getAnomalies, getMonthlyTrend } from '../api/forecast'
import { formatCurrency } from '../utils/format'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { TrendingUp, AlertTriangle, BrainCircuit, Activity } from 'lucide-react'
import clsx from 'clsx'

function StatCard({ title, value, sub, icon: Icon, color }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-gray-500">{title}</p>
        <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center', color)}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name === 'expense' ? 'Chi tiêu' : 'Thu nhập'}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  )
}

export default function Forecast() {
  const [trend, setTrend] = useState([])
  const [forecast, setForecast] = useState(null)
  const [anomalies, setAnomalies] = useState([])
  const [loading, setLoading] = useState(true)
  const [aiAvailable, setAiAvailable] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [trendRes, forecastRes, anomalyRes] = await Promise.allSettled([
          getMonthlyTrend(),
          getForecast(),
          getAnomalies(),
        ])

        if (trendRes.status === 'fulfilled') setTrend(trendRes.value.data)

        if (forecastRes.status === 'fulfilled') {
          const d = forecastRes.value.data
          if (d.success === false) setAiAvailable(false)
          else setForecast(d)
        } else {
          setAiAvailable(false)
        }

        if (anomalyRes.status === 'fulfilled') {
          const d = anomalyRes.value.data
          setAnomalies(d.anomalies || [])
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Tính dự báo đơn giản từ dữ liệu trend nếu AI service không khả dụng
  const simpleForecast = (() => {
    if (trend.length < 2) return null
    const last3 = trend.slice(-3)
    const avg = last3.reduce((s, m) => s + Number(m.expense || 0), 0) / last3.length
    return avg
  })()

  const predictedAmount = forecast?.predicted_expense ?? simpleForecast
  const avgAmount = forecast?.average_expense ?? simpleForecast
  const budgetWarning = forecast?.budget_warning ?? false
  const lastMonth = trend[trend.length - 1]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
          <BrainCircuit size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dự báo & Cảnh báo</h1>
          <p className="text-xs text-gray-400">
            {aiAvailable ? 'AI · LinearRegression · IsolationForest' : 'Dự báo từ lịch sử chi tiêu'}
          </p>
        </div>
      </div>

      {/* Cảnh báo AI service offline */}
      {!aiAvailable && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 flex items-center gap-3">
          <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700">AI service chưa khởi động — đang dùng dự báo đơn giản từ lịch sử 3 tháng gần nhất.</p>
        </div>
      )}

      {/* Cảnh báo ngân sách */}
      {budgetWarning && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 font-medium">{forecast?.warning_message || 'Dự báo chi tiêu tháng tới cao hơn mức trung bình!'}</p>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Dự báo tháng tới"
          value={predictedAmount ? formatCurrency(predictedAmount) : '—'}
          sub={budgetWarning ? '⚠ Cao hơn bình thường' : 'Ổn định'}
          icon={TrendingUp}
          color={budgetWarning ? 'bg-red-500' : 'bg-violet-500'}
        />
        <StatCard
          title="Chi tiêu trung bình/tháng"
          value={avgAmount ? formatCurrency(avgAmount) : '—'}
          sub={`Dựa trên ${trend.length} tháng`}
          icon={Activity}
          color="bg-blue-500"
        />
        <StatCard
          title="Giao dịch bất thường"
          value={anomalies.length}
          sub={anomalies.length > 0 ? 'Cần kiểm tra' : 'Không có'}
          icon={AlertTriangle}
          color={anomalies.length > 0 ? 'bg-amber-500' : 'bg-emerald-500'}
        />
      </div>

      {/* Biểu đồ xu hướng */}
      <div className="card p-5 mb-5">
        <h2 className="font-semibold text-gray-900 mb-4">Xu hướng chi tiêu theo tháng</h2>
        {trend.length === 0 ? (
          <p className="text-center text-gray-400 py-8">Chưa có dữ liệu</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={trend} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={v => `${(v / 1_000_000).toFixed(1)}tr`} tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={name => name === 'expense' ? 'Chi tiêu' : 'Thu nhập'}
                wrapperStyle={{ fontSize: 13 }}
              />
              {predictedAmount && (
                <ReferenceLine
                  y={predictedAmount}
                  stroke="#8b5cf6"
                  strokeDasharray="6 3"
                  label={{ value: 'Dự báo', fill: '#8b5cf6', fontSize: 12 }}
                />
              )}
              <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Giao dịch bất thường */}
      {anomalies.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" />
            Giao dịch bất thường ({anomalies.length})
          </h2>
          <div className="space-y-2">
            {anomalies.map((a, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-900">#{a.transaction_id}</p>
                  <p className="text-xs text-gray-400">{a.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-red-600">{formatCurrency(a.amount)}</p>
                  <p className="text-xs text-gray-400">Score: {a.anomaly_score?.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
