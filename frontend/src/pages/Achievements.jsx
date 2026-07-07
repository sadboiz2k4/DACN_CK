import { useEffect, useState } from 'react'
import {
  Trophy, Flame, Star, Medal, RefreshCw, CheckCircle2,
  Clock3, Gift, History, Target,
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { getGamification, refreshGamification } from '../api/gamification'

const actionLabel = {
  TRANSACTION_CREATED: 'Giao dịch',
  BUDGET_CREATED: 'Ngân sách',
  BANK_IMPORT_COMPLETED: 'Import sao kê',
  SPLIT_BILL_CREATED: 'Chia bill',
  SPLIT_BILL_SETTLED: 'Tất toán bill',
  BADGE_UNLOCKED: 'Huy hiệu',
}

function ProgressBar({ value }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
      <div className="h-full rounded-full bg-primary-600 transition-all" style={{ width: `${Math.min(100, value || 0)}%` }} />
    </div>
  )
}

function Stat({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{label}</p>
        <div className={clsx('flex h-9 w-9 items-center justify-center rounded-lg', tone)}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function BadgeCard({ badge }) {
  return (
    <div className={clsx(
      'rounded-lg border p-4 transition-colors',
      badge.earned ? 'border-primary-100 bg-primary-50/40' : 'border-gray-100 bg-white opacity-70'
    )}>
      <div className="flex items-start gap-3">
        <div className={clsx(
          'flex h-11 w-11 items-center justify-center rounded-lg',
          badge.earned ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-400'
        )}>
          <Medal size={20} />
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-gray-900">{badge.name}</p>
            <span className={clsx(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              badge.earned ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
            )}>
              +{badge.bonusPoints}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">{badge.description}</p>
          {badge.earned && <p className="mt-2 text-xs text-primary-600">Đã đạt</p>}
        </div>
      </div>
    </div>
  )
}

function MissionCard({ mission }) {
  const pct = mission.target > 0 ? Math.round(mission.progress / mission.target * 100) : 0
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-gray-900">{mission.title}</p>
          <p className="mt-1 text-sm text-gray-500">{mission.description}</p>
        </div>
        <div className={clsx(
          'flex h-9 w-9 items-center justify-center rounded-lg',
          mission.completed ? 'bg-emerald-500' : 'bg-amber-500'
        )}>
          {mission.completed ? <CheckCircle2 size={18} className="text-white" /> : <Clock3 size={18} className="text-white" />}
        </div>
      </div>
      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs text-gray-500">
          <span>{mission.progress}/{mission.target}</span>
          <span>+{mission.rewardPoints} điểm</span>
        </div>
        <ProgressBar value={pct} />
      </div>
    </div>
  )
}

export default function Achievements() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await getGamification()
      setData(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const refresh = async () => {
    try {
      const { data } = await refreshGamification()
      setData(data)
      toast.success('Đã cập nhật thành tích')
    } catch {
      toast.error('Không cập nhật được')
    }
  }

  if (loading) return <div className="p-6 text-sm text-gray-500">Đang tải...</div>
  const profile = data?.profile || {}
  const earned = data?.badges?.filter(b => b.earned).length || 0
  const totalBadges = data?.badges?.length || 0

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Thành tích</h1>
          <p className="text-sm text-gray-500">Điểm, level, streak, nhiệm vụ và huy hiệu của bạn.</p>
        </div>
        <button className="btn-secondary flex items-center gap-2" onClick={refresh}>
          <RefreshCw size={16} /> Làm mới
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <Stat icon={Star} label="Tổng điểm" value={profile.totalPoints || 0} tone="bg-primary-600" />
        <Stat icon={Trophy} label="Level" value={profile.level || 1} tone="bg-violet-500" />
        <Stat icon={Flame} label="Streak hiện tại" value={`${profile.currentStreak || 0} ngày`} tone="bg-orange-500" />
        <Stat icon={Medal} label="Huy hiệu" value={`${earned}/${totalBadges}`} tone="bg-emerald-500" />
      </div>

      <div className="card mb-6 p-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">Tiến độ level {profile.level}</span>
          <span className="text-gray-500">{profile.totalPoints || 0}/{profile.pointsForNextLevel || 0}</span>
        </div>
        <ProgressBar value={profile.levelProgress || 0} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Target size={18} className="text-primary-600" />
            <h2 className="font-semibold text-gray-900">Nhiệm vụ</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {data?.missions?.map(mission => <MissionCard key={mission.code} mission={mission} />)}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <History size={18} className="text-primary-600" />
            <h2 className="font-semibold text-gray-900">Lịch sử điểm</h2>
          </div>
          <div className="card max-h-[360px] overflow-y-auto p-0">
            {data?.recentEvents?.length ? data.recentEvents.map(event => (
              <div key={event.id} className="flex items-center justify-between border-b border-gray-50 px-4 py-3 last:border-0">
                <div>
                  <p className="font-medium text-gray-900">{event.title}</p>
                  <p className="text-xs text-gray-400">{actionLabel[event.action] || event.action}</p>
                </div>
                <span className="rounded-full bg-primary-50 px-2 py-1 text-xs font-semibold text-primary-700">
                  +{event.points}
                </span>
              </div>
            )) : (
              <p className="p-6 text-center text-sm text-gray-400">Chưa có lịch sử điểm</p>
            )}
          </div>
        </section>
      </div>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Gift size={18} className="text-primary-600" />
          <h2 className="font-semibold text-gray-900">Huy hiệu</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data?.badges?.map(badge => <BadgeCard key={badge.code} badge={badge} />)}
        </div>
      </section>
    </div>
  )
}
