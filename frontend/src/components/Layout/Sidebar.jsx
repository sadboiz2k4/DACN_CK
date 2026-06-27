import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, ArrowLeftRight, Wallet, BarChart3,
  Bot, LogOut, ShieldCheck, UserCircle, Tag, PiggyBank, TrendingUp, Receipt,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import NotificationBell from '../common/NotificationBell'
import clsx from 'clsx'

const navItems = [
  { to: '/',             icon: LayoutDashboard, label: 'Tổng quan', end: true },
  { to: '/transactions', icon: ArrowLeftRight,  label: 'Giao dịch'  },
  { to: '/wallets',      icon: Wallet,          label: 'Ví tiền'    },
  { to: '/reports',      icon: BarChart3,       label: 'Báo cáo'    },
  { to: '/ai',           icon: Bot,             label: 'Trợ lý AI'  },
  { to: '/budget',       icon: PiggyBank,       label: 'Ngân sách'  },
  { to: '/forecast',     icon: TrendingUp,      label: 'Dự báo'     },
  { to: '/debts',        icon: Receipt,         label: 'Sổ nợ'      },
  { to: '/categories',   icon: Tag,             label: 'Danh mục'   },
]

function NavItem({ to, icon: Icon, label, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary-50 text-primary-700'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        )
      }
    >
      <Icon size={18} />
      {label}
    </NavLink>
  )
}

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth()

  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-sm">SS</span>
            </div>
            <span className="font-bold text-gray-900 text-lg">SmartSpend</span>
          </div>
          {/* Notification Bell in header */}
          <NotificationBell />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-0.5 overflow-y-auto">
        {navItems.map(item => <NavItem key={item.to} {...item} />)}

        {isAdmin && (
          <NavItem to="/admin" icon={ShieldCheck} label="Admin" />
        )}

        <div className="pt-2 mt-2 border-t border-gray-50">
          <NavItem to="/profile" icon={UserCircle} label="Tài khoản" />
        </div>
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 mb-3 px-1">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-primary-700 font-semibold text-xs">
              {user?.fullName?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.fullName}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 transition-colors w-full px-2 py-1.5 rounded-lg hover:bg-red-50"
        >
          <LogOut size={15} />
          Đăng xuất
        </button>
      </div>
    </aside>
  )
}
