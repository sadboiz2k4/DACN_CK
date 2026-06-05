import { useState, useEffect } from 'react'
import { Users, Activity, Wallet, ArrowLeftRight, ShieldCheck, Search,
         ToggleLeft, ToggleRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { getAdminStats, getAdminUsers, toggleUserStatus } from '../../api/admin'
import { formatDate } from '../../utils/format'
import toast from 'react-hot-toast'

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-500">{label}</p>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value ?? '—'}</p>
    </div>
  )
}

const ROLE_BADGE = {
  ADMIN: 'bg-purple-100 text-purple-700',
  USER: 'bg-gray-100 text-gray-600',
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getAdminStats().then(r => setStats(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    getAdminUsers(page, 10, search)
      .then(r => {
        setUsers(r.data.content || [])
        setTotalPages(r.data.totalPages || 0)
        setTotalElements(r.data.totalElements || 0)
      })
      .catch(() => toast.error('Không thể tải danh sách người dùng'))
      .finally(() => setLoading(false))
  }, [page, search])

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(0)
    setSearch(searchInput)
  }

  const handleToggle = async (id) => {
    try {
      const { data } = await toggleUserStatus(id)
      setUsers(prev => prev.map(u => u.id === id ? { ...u, active: data.active } : u))
      toast.success(data.active ? 'Đã kích hoạt tài khoản' : 'Đã khóa tài khoản')
    } catch {
      toast.error('Có lỗi xảy ra')
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
          <ShieldCheck size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500">Quản lý hệ thống SmartSpend</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Tổng người dùng" value={stats?.totalUsers} icon={Users} color="bg-primary-600" />
        <StatCard label="Đang hoạt động" value={stats?.activeUsers} icon={Activity} color="bg-green-500" />
        <StatCard label="Tổng giao dịch" value={stats?.totalTransactions} icon={ArrowLeftRight} color="bg-blue-500" />
        <StatCard label="Tổng ví" value={stats?.totalWallets} icon={Wallet} color="bg-orange-500" />
      </div>

      {/* User Table */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Danh sách người dùng</h2>
            <p className="text-xs text-gray-400 mt-0.5">{totalElements} người dùng</p>
          </div>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative">
              <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="input pl-8 w-56 text-sm"
                placeholder="Tìm theo email, tên..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary text-sm px-3">Tìm</button>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-2 text-xs font-medium text-gray-400 uppercase">Người dùng</th>
                <th className="text-left py-3 px-2 text-xs font-medium text-gray-400 uppercase">Vai trò</th>
                <th className="text-center py-3 px-2 text-xs font-medium text-gray-400 uppercase">Ví</th>
                <th className="text-center py-3 px-2 text-xs font-medium text-gray-400 uppercase">Giao dịch</th>
                <th className="text-left py-3 px-2 text-xs font-medium text-gray-400 uppercase">Ngày tạo</th>
                <th className="text-center py-3 px-2 text-xs font-medium text-gray-400 uppercase">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Đang tải...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Không có người dùng</td></tr>
              ) : users.map(user => (
                <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-700 text-xs font-semibold">
                          {user.fullName?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.fullName}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${ROLE_BADGE[user.role]}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center text-gray-600">{user.walletCount}</td>
                  <td className="py-3 px-2 text-center text-gray-600">{user.transactionCount}</td>
                  <td className="py-3 px-2 text-gray-500 text-xs">{formatDate(user.createdAt)}</td>
                  <td className="py-3 px-2 text-center">
                    <button
                      onClick={() => handleToggle(user.id)}
                      title={user.active ? 'Khóa tài khoản' : 'Kích hoạt'}
                      className={`transition-colors ${user.active ? 'text-green-500 hover:text-red-500' : 'text-gray-300 hover:text-green-500'}`}
                    >
                      {user.active
                        ? <ToggleRight size={24} />
                        : <ToggleLeft size={24} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
            <p className="text-xs text-gray-400">Trang {page + 1} / {totalPages}</p>
            <div className="flex gap-1">
              <button
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
                disabled={page === 0} onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
                disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
