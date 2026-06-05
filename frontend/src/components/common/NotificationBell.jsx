import { useState, useEffect, useRef } from 'react'
import { Bell, AlertTriangle, TrendingUp, PiggyBank, X, Check } from 'lucide-react'
import { getNotifications } from '../../api/notifications'
import clsx from 'clsx'

const TYPE_CONFIG = {
  WARNING: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' },
  INFO:    { icon: TrendingUp,    color: 'text-blue-500',  bg: 'bg-blue-50',  border: 'border-blue-100' },
}

const ICON_MAP = {
  'piggy-bank':    PiggyBank,
  'alert-triangle': AlertTriangle,
  'trending-up':   TrendingUp,
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([])
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dismissed_notifs') || '[]') }
    catch { return [] }
  })
  const [open, setOpen] = useState(false)
  const [btnRect, setBtnRect] = useState(null)
  const dropdownRef = useRef()
  const btnRef = useRef()

  useEffect(() => {
    getNotifications()
      .then(r => setNotifications(r.data || []))
      .catch(() => {})
  }, [])

  // close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const visible = notifications.filter(n => !dismissed.includes(n.id))
  const unread = visible.length

  const dismiss = (id) => {
    const next = [...dismissed, id]
    setDismissed(next)
    localStorage.setItem('dismissed_notifs', JSON.stringify(next))
  }

  const dismissAll = () => {
    const next = [...dismissed, ...visible.map(n => n.id)]
    setDismissed(next)
    localStorage.setItem('dismissed_notifs', JSON.stringify(next))
    setOpen(false)
  }

  const handleToggle = () => {
    if (!open && btnRef.current) {
      setBtnRect(btnRef.current.getBoundingClientRect())
    }
    setOpen(o => !o)
  }

  return (
    <div ref={dropdownRef}>
      {/* Bell button */}
      <button
        ref={btnRef}
        onClick={handleToggle}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
        title="Thông báo"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown — fixed để thoát ra ngoài sidebar */}
      {open && btnRect && (
        <div className="fixed w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-[200] overflow-hidden"
          style={{ top: btnRect.bottom + 8, left: btnRect.left }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-gray-600" />
              <span className="text-sm font-semibold text-gray-900">Thông báo</span>
              {unread > 0 && (
                <span className="bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded-full font-medium">
                  {unread}
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={dismissAll}
                className="text-xs text-primary-600 hover:underline flex items-center gap-1"
              >
                <Check size={12} /> Đánh dấu đã đọc
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {visible.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <Bell size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Không có thông báo mới</p>
              </div>
            ) : visible.map(notif => {
              const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.INFO
              const IconComp = ICON_MAP[notif.icon] || AlertTriangle
              return (
                <div
                  key={notif.id}
                  className={clsx(
                    'flex gap-3 px-4 py-3 border-b border-gray-50 last:border-0',
                    cfg.bg
                  )}
                >
                  <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', cfg.border, 'border', 'bg-white')}>
                    <IconComp size={15} className={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{notif.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{notif.createdAt}</p>
                  </div>
                  <button
                    onClick={() => dismiss(notif.id)}
                    className="text-gray-300 hover:text-gray-500 flex-shrink-0 mt-0.5"
                  >
                    <X size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
