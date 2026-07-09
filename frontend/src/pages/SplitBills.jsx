import { useEffect, useMemo, useState } from 'react'
import {
  Plus, Users, Receipt, QrCode, CheckCircle2, Clock3,
  Pencil, X, Copy, Search, UserPlus,
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { formatCurrency } from '../utils/format'
import { useAuth } from '../context/AuthContext'
import { getWallets } from '../api/wallets'
import {
  getSplitGroups, getSplitGroup, createSplitGroup, addSplitMember,
  updateSplitMember, createSplitBill, markSettlementPaid, confirmSettlementReceived,
} from '../api/splitBills'
import { searchUsers } from '../api/user'

const BANKS = [
  { code: 'VCB', name: 'Vietcombank' },
  { code: 'TCB', name: 'Techcombank' },
  { code: 'MB', name: 'MB Bank' },
  { code: 'ACB', name: 'ACB' },
  { code: 'BIDV', name: 'BIDV' },
  { code: 'CTG', name: 'VietinBank' },
  { code: 'VPB', name: 'VPBank' },
  { code: 'TPB', name: 'TPBank' },
  { code: 'VIB', name: 'VIB' },
  { code: 'MSB', name: 'MSB' },
  { code: 'STB', name: 'Sacombank' },
  { code: 'HDB', name: 'HDBank' },
  { code: 'OCB', name: 'OCB' },
  { code: 'SHB', name: 'SHB' },
]

const emptyMember = {
  displayName: '',
  email: '',
  linkedUser: false,
  bankCode: '',
  bankAccountNumber: '',
  bankAccountName: '',
}

const asNumber = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const normalized = String(value || '')
    .trim()
    .replace(/\s/g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '')
  const parsed = Number(normalized || 0)
  return Number.isFinite(parsed) ? parsed : 0
}
const money = (value) => {
  if (typeof value === 'number') return Math.max(0, Math.round(value))
  const digits = String(value || '').replace(/[^\d-]/g, '')
  const parsed = Number(digits || 0)
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0
}
const percentValue = (value) => Math.max(0, asNumber(value))
const nonNegativeInput = (value) => value.trim().startsWith('-') ? '0' : value
const cleanPercent = (value) => String(Number(value || 0).toFixed(2)).replace(/\.?0+$/, '')
const formatMoneyInput = (value) => money(value).toLocaleString('vi-VN')
const apiError = (error, fallback = 'Có lỗi xảy ra') => (
  error?.response?.data?.message || error?.response?.data?.errors?.[0] || fallback
)

function UserSearchPicker({ selectedEmails = [], onPick }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const selectedEmailKey = selectedEmails.filter(Boolean).map(email => email.toLowerCase()).sort().join('|')

  useEffect(() => {
    const keyword = query.trim()
    if (keyword.length < 2) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const { data } = await searchUsers(keyword)
        const existing = new Set(selectedEmailKey ? selectedEmailKey.split('|') : [])
        setResults(data.filter(item => !existing.has(item.email?.toLowerCase())))
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [query, selectedEmailKey])

  const pickUser = (item) => {
    onPick({
      ...emptyMember,
      displayName: item.fullName,
      email: item.email,
      linkedUser: true,
    })
    setQuery('')
    setResults([])
  }

  return (
    <div className="rounded-lg border border-primary-100 bg-primary-50/40 p-3">
      <label className="label">Tìm người dùng app</label>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-9"
          placeholder="Nhập tên hoặc email"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>
      {query.trim().length >= 2 && (
        <div className="mt-2 max-h-52 overflow-y-auto rounded-lg border border-gray-100 bg-white shadow-sm">
          {loading ? (
            <p className="px-3 py-2 text-sm text-gray-400">Đang tìm...</p>
          ) : results.length ? (
            results.map(item => (
              <button
                key={item.id}
                type="button"
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-50"
                onClick={() => pickUser(item)}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
                  {(item.fullName || item.email || '?').slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{item.fullName}</p>
                  <p className="truncate text-xs text-gray-500">{item.email}</p>
                </div>
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-sm text-gray-400">Không tìm thấy user app</p>
          )}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    PENDING: 'bg-amber-50 text-amber-700 border-amber-100',
    MARKED_AS_PAID: 'bg-blue-50 text-blue-700 border-blue-100',
    CONFIRMED: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    OPEN: 'bg-amber-50 text-amber-700 border-amber-100',
    SETTLED: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  }
  const label = {
    PENDING: 'Chưa trả',
    MARKED_AS_PAID: 'Đã báo trả',
    CONFIRMED: 'Đã nhận',
    OPEN: 'Đang mở',
    SETTLED: 'Đã tất toán',
  }[status] || status

  return (
    <span className={clsx('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', map[status])}>
      {label}
    </span>
  )
}

function GroupModal({ user, onClose, onSaved }) {
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [members, setMembers] = useState([])
  const [showAddMember, setShowAddMember] = useState(false)
  const [saving, setSaving] = useState(false)

  const updateMember = (idx, patch) => {
    setMembers(prev => prev.map((m, i) => i === idx ? { ...m, ...patch } : m))
  }

  const removeMember = (idx) => {
    setMembers(prev => prev.filter((_, i) => i !== idx))
  }

  const addManualMember = () => {
    setMembers(prev => [...prev, { ...emptyMember }])
    setShowAddMember(false)
  }

  const addAppUser = (member) => {
    const email = member.email?.toLowerCase()
    if (email && members.some(item => item.email?.toLowerCase() === email)) {
      toast.error('Người này đã có trong nhóm')
      return
    }
    setMembers(prev => [...prev, member])
    setShowAddMember(false)
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        name,
        note,
        members: members
          .filter(m => m.displayName.trim())
          .map(({ currentUser, linkedUser, active, id, userId, note, ...m }) => ({ ...m, bankCode: m.bankCode?.trim().toUpperCase() })),
      }
      await createSplitGroup(payload)
      toast.success('Đã tạo nhóm')
      onSaved()
    } catch (error) {
      toast.error(apiError(error, 'Không tạo được nhóm'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <h2 className="text-lg font-semibold">Tạo nhóm chia tiền</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={submit} className="max-h-[78vh] overflow-y-auto p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="label">Tên nhóm</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div>
              <label className="label">Ghi chú</label>
              <input className="input" value={note} onChange={e => setNote(e.target.value)} />
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Thành viên</h3>
              <button
                type="button"
                className="btn-secondary flex items-center gap-2 py-1.5 text-sm"
                onClick={() => setShowAddMember(prev => !prev)}
              >
                <Plus size={15} /> Thêm
              </button>
            </div>

            {showAddMember && (
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <UserSearchPicker
                  selectedEmails={members.map(member => member.email)}
                  onPick={addAppUser}
                />
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    className="btn-secondary flex items-center gap-2 py-1.5 text-sm"
                    onClick={addManualMember}
                  >
                    <UserPlus size={15} /> Nhập khách thủ công
                  </button>
                </div>
              </div>
            )}

            {members.map((member, idx) => (
              <div key={idx} className="relative rounded-lg border border-gray-100 p-3 pr-11">
                <button
                  type="button"
                  className="absolute right-3 top-3 rounded-lg p-1 text-gray-400 hover:bg-gray-50 hover:text-red-600"
                  onClick={() => removeMember(idx)}
                  title="Xóa thành viên"
                >
                  <X size={16} />
                </button>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <input
                    className="input"
                    placeholder="Tên"
                    required
                    value={member.displayName}
                    onChange={e => updateMember(idx, { displayName: e.target.value })}
                  />
                  <select
                    className="input"
                    value={member.bankCode}
                    onChange={e => updateMember(idx, { bankCode: e.target.value })}
                  >
                    <option value="">Ngân hàng</option>
                    {BANKS.map(bank => <option key={bank.code} value={bank.code}>{bank.code} - {bank.name}</option>)}
                  </select>
                  <input
                    className="input"
                    placeholder="Số tài khoản"
                    value={member.bankAccountNumber}
                    onChange={e => updateMember(idx, { bankAccountNumber: e.target.value })}
                  />
                </div>
                {member.email && (
                  <div className="mt-3 rounded-lg bg-primary-50 px-3 py-2 text-sm text-primary-700">
                    User app: {member.email}
                  </div>
                )}
                <input
                  className="input mt-3"
                  placeholder="Tên chủ tài khoản"
                  value={member.bankAccountName}
                  onChange={e => updateMember(idx, { bankAccountName: e.target.value })}
                />
              </div>
            ))}
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Đang lưu...' : 'Tạo nhóm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function MemberModal({ group, member, onClose, onSaved }) {
  const [form, setForm] = useState(member || emptyMember)
  const [saving, setSaving] = useState(false)

  const pickAppUser = (picked) => {
    setForm(prev => ({
      ...prev,
      displayName: picked.displayName,
      email: picked.email,
    }))
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { id, userId, currentUser, linkedUser, active, note, ...memberForm } = form
      const payload = { ...memberForm, bankCode: memberForm.bankCode?.trim().toUpperCase() }
      if (member?.id) await updateSplitMember(group.id, member.id, payload)
      else await addSplitMember(group.id, payload)
      toast.success('Đã lưu thành viên')
      onSaved()
    } catch (error) {
      toast.error(apiError(error, 'Không lưu được thành viên'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{member ? 'Sửa thành viên' : 'Thêm thành viên'}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
        </div>
        <div className="space-y-3">
          {!member && (
            <UserSearchPicker
              selectedEmails={group.members?.map(item => item.email) || []}
              onPick={pickAppUser}
            />
          )}
          <div>
            <label className="label">Tên</label>
            <input className="input" value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} required />
          </div>
          {form.email && (
            <div className="rounded-lg bg-primary-50 px-3 py-2 text-sm text-primary-700">
              User app: {form.email}
            </div>
          )}
          <div>
            <label className="label">Ngân hàng</label>
            <select className="input" value={form.bankCode || ''} onChange={e => setForm(f => ({ ...f, bankCode: e.target.value }))}>
              <option value="">Chưa chọn</option>
              {BANKS.map(bank => <option key={bank.code} value={bank.code}>{bank.code} - {bank.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Số tài khoản</label>
            <input className="input" value={form.bankAccountNumber || ''} onChange={e => setForm(f => ({ ...f, bankAccountNumber: e.target.value }))} />
          </div>
          <div>
            <label className="label">Tên chủ tài khoản</label>
            <input className="input" value={form.bankAccountName || ''} onChange={e => setForm(f => ({ ...f, bankAccountName: e.target.value }))} />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onClose}>Hủy</button>
          <button className="btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</button>
        </div>
      </form>
    </div>
  )
}

function buildPreview(rows) {
  const creditors = []
  const debtors = []
  rows.filter(r => r.included).forEach(row => {
    const net = money(row.paidAmount) - money(row.shareAmount)
    if (net > 0) creditors.push({ ...row, amount: net })
    if (net < 0) debtors.push({ ...row, amount: Math.abs(net) })
  })

  const result = []
  let c = 0
  debtors.forEach(debtor => {
    let debtLeft = debtor.amount
    while (debtLeft > 0 && c < creditors.length) {
      const creditor = creditors[c]
      const amount = Math.min(debtLeft, creditor.amount)
      result.push({ from: debtor, to: creditor, amount })
      debtLeft -= amount
      creditor.amount -= amount
      if (creditor.amount === 0) c += 1
    }
  })
  return result
}

function BillModal({ group, wallets, selectedWalletId, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: '',
    totalAmount: '',
    billDate: new Date().toISOString().slice(0, 10),
    note: '',
    walletId: selectedWalletId || '',
  })
  const [splitMode, setSplitMode] = useState('AMOUNT')
  const [rows, setRows] = useState(() => group.members.map(member => ({
    memberId: member.id,
    name: member.displayName,
    currentUser: member.currentUser,
    included: true,
    paidAmount: '0',
    shareAmount: '0',
    sharePercent: '0',
  })))
  const [saving, setSaving] = useState(false)

  const total = money(form.totalAmount)
  const includedRows = rows.filter(row => row.included)
  const paidTotal = rows.reduce((sum, row) => sum + money(row.paidAmount), 0)
  const shareTotal = rows.reduce((sum, row) => sum + (row.included ? money(row.shareAmount) : 0), 0)
  const preview = useMemo(() => buildPreview(rows), [rows])

  const updateRow = (memberId, patch) => {
    setRows(prev => prev.map(row => row.memberId === memberId ? { ...row, ...patch } : row))
  }

  const applyEqual = () => {
    if (!total || includedRows.length === 0) return
    setRows(prev => {
      const active = prev.filter(row => row.included)
      const base = Math.floor(total / active.length)
      let used = 0
      return prev.map(row => {
        if (!row.included) return { ...row, shareAmount: '0', sharePercent: '0' }
        const isLast = active[active.length - 1].memberId === row.memberId
        const share = isLast ? total - used : base
        used += share
        return { ...row, shareAmount: String(share), sharePercent: cleanPercent(share / total * 100) }
      })
    })
    setSplitMode('EQUAL')
  }

  const calculateAmountsFromPercent = () => {
    if (!total) return
    const active = rows.filter(row => row.included)
    const lastId = active[active.length - 1]?.memberId
    const percentBeforeLast = active
      .filter(row => row.memberId !== lastId)
      .reduce((sum, row) => sum + percentValue(row.sharePercent), 0)
    if (percentBeforeLast > 100) {
      toast.error('Tong % truoc dong cuoi khong duoc vuot 100%')
      return
    }

    setRows(prev => {
      let usedAmount = 0
      let usedPercent = 0
      return prev.map(row => {
        if (!row.included) return { ...row, shareAmount: '0' }
        const isLast = lastId === row.memberId
        const percent = isLast ? Number((100 - usedPercent).toFixed(2)) : percentValue(row.sharePercent)
        const share = isLast ? total - usedAmount : Math.round(total * percent / 100)
        usedAmount += share
        usedPercent = Number((usedPercent + percent).toFixed(2))
        return { ...row, shareAmount: String(Math.max(0, share)), sharePercent: String(Math.max(0, percent)) }
      })
    })
    setSplitMode('PERCENT')
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await createSplitBill(group.id, {
        ...form,
        totalAmount: total,
        walletId: form.walletId ? Number(form.walletId) : null,
        splitMode,
        participants: rows.map(row => ({
          memberId: row.memberId,
          included: row.included,
          paidAmount: money(row.paidAmount),
          shareAmount: row.included ? money(row.shareAmount) : 0,
          sharePercent: row.sharePercent ? percentValue(row.sharePercent) : null,
        })),
      })
      toast.success('Đã tạo bill')
      onSaved()
    } catch (error) {
      toast.error(apiError(error, 'Không tạo được bill'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-6xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <h2 className="text-lg font-semibold">Tạo bill</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submit} className="max-h-[80vh] overflow-y-auto p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <div className="md:col-span-2">
              <label className="label">Tên bill</label>
              <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Tổng tiền</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  className="input pr-14"
                  value={formatMoneyInput(form.totalAmount)}
                  onChange={e => setForm(f => ({ ...f, totalAmount: String(money(e.target.value)) }))}
                  required
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">VND</span>
              </div>
            </div>
            <div>
              <label className="label">Ngày</label>
              <input type="date" className="input" value={form.billDate} onChange={e => setForm(f => ({ ...f, billDate: e.target.value }))} />
            </div>
            <div>
              <label className="label">Ví ghi nhận</label>
              <select className="input" value={form.walletId} onChange={e => setForm(f => ({ ...f, walletId: e.target.value }))}>
                <option value="">Không ghi ví</option>
                {wallets.map(wallet => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="button" className="btn-secondary flex items-center gap-2 py-1.5 text-sm" onClick={applyEqual}>
              <Users size={15} /> Chia đều
            </button>
            <span className={clsx('ml-auto rounded-lg px-3 py-1.5 text-sm font-medium', paidTotal === total && shareTotal === total ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>
              Đã trả {formatCurrency(paidTotal)} / Chịu {formatCurrency(shareTotal)}
            </span>
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-gray-100">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Tham gia</th>
                  <th className="px-3 py-2">Thành viên</th>
                  <th className="px-3 py-2">Đã trả trước</th>
                  <th className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span>%</span>
                      <button type="button" className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium normal-case text-gray-600 hover:border-primary-200 hover:text-primary-600" onClick={calculateAmountsFromPercent}>
                        Tính
                      </button>
                    </div>
                  </th>
                  <th className="px-3 py-2">Phần phải chịu</th>
                  <th className="px-3 py-2">Kết quả</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map(row => {
                  const net = money(row.paidAmount) - (row.included ? money(row.shareAmount) : 0)
                  return (
                    <tr key={row.memberId}>
                      <td className="px-3 py-2">
                        <input type="checkbox" checked={row.included} onChange={e => updateRow(row.memberId, { included: e.target.checked })} />
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-900">
                        {row.name} {row.currentUser && <span className="ml-1 text-xs text-primary-600">(tôi)</span>}
                      </td>
                      <td className="px-3 py-2">
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="numeric"
                            className="input pr-14"
                            value={formatMoneyInput(row.paidAmount)}
                            onChange={e => updateRow(row.memberId, { paidAmount: String(money(e.target.value)) })}
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">VND</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" className="input" value={row.sharePercent} onChange={e => updateRow(row.memberId, { sharePercent: nonNegativeInput(e.target.value) })} min="0" step="0.01" disabled={!row.included} />
                      </td>
                      <td className="px-3 py-2">
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="numeric"
                            className="input pr-14"
                            value={formatMoneyInput(row.shareAmount)}
                            onChange={e => { updateRow(row.memberId, { shareAmount: String(money(e.target.value)) }); setSplitMode('AMOUNT') }}
                            disabled={!row.included}
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">VND</span>
                        </div>
                      </td>
                      <td className={clsx('px-3 py-2 font-semibold', net > 0 ? 'text-emerald-600' : net < 0 ? 'text-red-600' : 'text-gray-500')}>
                        {net > 0 ? '+' : ''}{formatCurrency(net)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="border-t border-gray-100 bg-gray-50 text-sm">
                <tr>
                  <td className="px-3 py-3 text-right font-medium text-gray-500" colSpan={4}>
                    Tổng phần phải chịu
                  </td>
                  <td className={clsx(
                    'px-3 py-3 font-semibold',
                    shareTotal === total ? 'text-emerald-600' : 'text-amber-600'
                  )}>
                    {formatCurrency(shareTotal)}
                  </td>
                  <td className={clsx(
                    'px-3 py-3 text-xs font-medium',
                    shareTotal === total ? 'text-emerald-600' : 'text-amber-600'
                  )}>
                    {shareTotal === total ? 'OK' : `Lệch ${formatCurrency(Math.abs(total - shareTotal))}`}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-gray-100 p-4">
              <h3 className="mb-3 font-semibold text-gray-900">Preview thanh toán</h3>
              {preview.length === 0 ? (
                <p className="text-sm text-gray-400">Chưa có khoản cần thanh toán</p>
              ) : (
                <div className="space-y-2">
                  {preview.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                      <span className="text-sm text-gray-700">{item.from.name} trả {item.to.name}</span>
                      <span className="font-semibold">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="label">Ghi chú</label>
              <textarea className="input min-h-[120px]" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={onClose}>Hủy</button>
            <button className="btn-primary" disabled={saving || paidTotal !== total || shareTotal !== total}>
              {saving ? 'Đang lưu...' : 'Lưu bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SettlementCard({ settlement, selectedWalletId, onChanged }) {
  const [showQr, setShowQr] = useState(false)
  const canMarkPaid = settlement.fromCurrentUser && settlement.status === 'PENDING'
  const canConfirm = settlement.toCurrentUser && settlement.status !== 'CONFIRMED'

  const copyContent = async () => {
    await navigator.clipboard.writeText(`${settlement.amount} ${settlement.paymentContent}`)
    toast.success('Đã copy')
  }

  const markPaid = async () => {
    try {
      await markSettlementPaid(settlement.id, { walletId: selectedWalletId || null })
      toast.success('Đã báo trả')
      onChanged()
    } catch (error) {
      toast.error(apiError(error, 'Không cập nhật được'))
    }
  }

  const confirm = async () => {
    try {
      await confirmSettlementReceived(settlement.id, { walletId: selectedWalletId || null })
      toast.success('Đã xác nhận')
      onChanged()
    } catch (error) {
      toast.error(apiError(error, 'Không xác nhận được'))
    }
  }

  return (
    <div className="rounded-lg border border-gray-100 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-gray-900">{settlement.fromMemberName} trả {settlement.toMemberName}</p>
          <p className="text-sm text-gray-500">{formatCurrency(settlement.amount)}</p>
        </div>
        <StatusBadge status={settlement.status} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn-secondary flex items-center gap-2 py-1.5 text-sm" onClick={() => setShowQr(v => !v)} disabled={!settlement.qrUrl}>
          <QrCode size={15} /> QR
        </button>
        <button type="button" className="btn-secondary flex items-center gap-2 py-1.5 text-sm" onClick={copyContent}>
          <Copy size={15} /> Copy
        </button>
        {canMarkPaid && (
          <button type="button" className="btn-secondary flex items-center gap-2 py-1.5 text-sm" onClick={markPaid}>
            <Clock3 size={15} /> Tôi đã trả
          </button>
        )}
        {canConfirm && (
          <button type="button" className="btn-primary flex items-center gap-2 py-1.5 text-sm" onClick={confirm}>
            <CheckCircle2 size={15} /> Đã nhận
          </button>
        )}
      </div>
      {showQr && settlement.qrUrl && (
        <div className="mt-3 flex items-center gap-4 rounded-lg bg-gray-50 p-3">
          <img src={settlement.qrUrl} alt="QR thanh toán" className="h-36 w-36 rounded-lg bg-white object-contain" />
          <div className="text-sm text-gray-600">
            <p className="font-medium text-gray-900">{settlement.toBankCode} - {settlement.toBankAccountNumber}</p>
            <p>{settlement.toBankAccountName}</p>
            <p className="mt-2">{settlement.paymentContent}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function BillCard({ bill, selectedWalletId, onChanged }) {
  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Receipt size={18} className="text-primary-600" />
            <h3 className="font-semibold text-gray-900">{bill.title}</h3>
          </div>
          <p className="mt-1 text-sm text-gray-500">{bill.billDate} · {formatCurrency(bill.totalAmount)}</p>
        </div>
        <StatusBadge status={bill.status} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">Phần tham gia</p>
          <div className="space-y-2">
            {bill.participants?.map(participant => (
              <div key={participant.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                <span>{participant.memberName}{participant.currentUser ? ' (tôi)' : ''}</span>
                <span className="text-gray-500">
                  trả {formatCurrency(participant.paidAmount)} · chịu {formatCurrency(participant.shareAmount)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">Thanh toán</p>
          <div className="space-y-2">
            {bill.settlements?.length ? bill.settlements.map(settlement => (
              <SettlementCard key={settlement.id} settlement={settlement} selectedWalletId={selectedWalletId} onChanged={onChanged} />
            )) : (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Không có khoản cần thanh toán</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SplitBills() {
  const { user } = useAuth()
  const [groups, setGroups] = useState([])
  const [selectedGroupId, setSelectedGroupId] = useState(null)
  const [group, setGroup] = useState(null)
  const [wallets, setWallets] = useState([])
  const [selectedWalletId, setSelectedWalletId] = useState('')
  const [loading, setLoading] = useState(true)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [showBillModal, setShowBillModal] = useState(false)
  const [memberModal, setMemberModal] = useState(null)

  const fetchGroups = async () => {
    const { data } = await getSplitGroups()
    setGroups(data)
    if (!selectedGroupId && data.length) setSelectedGroupId(data[0].id)
    return data
  }

  const fetchGroup = async (id = selectedGroupId) => {
    if (!id) {
      setGroup(null)
      return
    }
    const { data } = await getSplitGroup(id)
    setGroup(data)
  }

  const reload = async () => {
    const data = await fetchGroups()
    const id = selectedGroupId || data[0]?.id
    if (id) {
      setSelectedGroupId(id)
      await fetchGroup(id)
    }
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [groupRes, walletRes] = await Promise.all([getSplitGroups(), getWallets()])
        setGroups(groupRes.data)
        setWallets(walletRes.data)
        setSelectedWalletId(walletRes.data[0]?.id || '')
        const firstId = groupRes.data[0]?.id
        setSelectedGroupId(firstId || null)
        if (firstId) {
          const { data } = await getSplitGroup(firstId)
          setGroup(data)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (selectedGroupId) fetchGroup(selectedGroupId)
  }, [selectedGroupId])

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Đang tải...</div>
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chia tiền nhóm</h1>
          <p className="text-sm text-gray-500">Split bill, QR và xác nhận thanh toán</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="input w-56" value={selectedWalletId} onChange={e => setSelectedWalletId(e.target.value)}>
            <option value="">Chọn ví ghi nhận</option>
            {wallets.map(wallet => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}
          </select>
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowGroupModal(true)}>
            <Plus size={16} /> Tạo nhóm
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_1fr]">
        <aside className="space-y-3">
          {groups.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedGroupId(item.id)}
              className={clsx(
                'w-full rounded-lg border bg-white p-4 text-left transition-colors',
                selectedGroupId === item.id ? 'border-primary-200 ring-2 ring-primary-100' : 'border-gray-100 hover:border-gray-200'
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-gray-900">{item.name}</p>
                <StatusBadge status={item.openBillCount > 0 ? 'OPEN' : 'SETTLED'} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-red-50 p-2 text-red-700">
                  <p>Cần trả</p>
                  <p className="font-semibold">{formatCurrency(item.amountToPay || 0)}</p>
                </div>
                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                  <p>Cần nhận</p>
                  <p className="font-semibold">{formatCurrency(item.amountToReceive || 0)}</p>
                </div>
              </div>
            </button>
          ))}
          {groups.length === 0 && (
            <div className="rounded-lg border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
              Chưa có nhóm
            </div>
          )}
        </aside>

        <main className="space-y-5">
          {group ? (
            <>
              <div className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{group.name}</h2>
                    <p className="mt-1 text-sm text-gray-500">{group.note || 'Không có ghi chú'}</p>
                  </div>
                  <button className="btn-primary flex items-center gap-2" onClick={() => setShowBillModal(true)}>
                    <Receipt size={16} /> Tạo bill
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Thành viên</p>
                    <p className="text-xl font-bold">{group.members?.length || 0}</p>
                  </div>
                  <div className="rounded-lg bg-red-50 p-3 text-red-700">
                    <p className="text-xs">Tôi cần trả</p>
                    <p className="text-xl font-bold">{formatCurrency(group.amountToPay || 0)}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-3 text-emerald-700">
                    <p className="text-xs">Tôi cần nhận</p>
                    <p className="text-xl font-bold">{formatCurrency(group.amountToReceive || 0)}</p>
                  </div>
                </div>
              </div>

              <div className="card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Thành viên</h3>
                  <button className="btn-secondary flex items-center gap-2 py-1.5 text-sm" onClick={() => setMemberModal({})}>
                    <Plus size={15} /> Thêm
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {group.members?.map(member => (
                    <div key={member.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-gray-900">{member.displayName}{member.currentUser ? ' (tôi)' : ''}</p>
                          <span className={clsx(
                            'rounded-full px-2 py-0.5 text-[11px] font-medium',
                            member.linkedUser ? 'bg-primary-50 text-primary-700' : 'bg-gray-100 text-gray-500'
                          )}>
                            {member.linkedUser ? 'User app' : 'Khach'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {member.bankCode && member.bankAccountNumber ? `${member.bankCode} · ${member.bankAccountNumber}` : 'Chưa có tài khoản nhận QR'}
                        </p>
                        {member.email && <p className="text-xs text-gray-400">{member.email}</p>}
                      </div>
                      <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-primary-600" onClick={() => setMemberModal(member)}>
                        <Pencil size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {group.bills?.map(bill => (
                  <BillCard key={bill.id} bill={bill} selectedWalletId={selectedWalletId} onChanged={reload} />
                ))}
                {group.bills?.length === 0 && (
                  <div className="rounded-lg border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
                    Nhóm này chưa có bill
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-200 bg-white p-10 text-center">
              <Users className="mx-auto mb-3 text-gray-300" size={40} />
              <p className="text-gray-500">Tạo nhóm đầu tiên để bắt đầu chia tiền</p>
            </div>
          )}
        </main>
      </div>

      {showGroupModal && (
        <GroupModal
          user={user}
          onClose={() => setShowGroupModal(false)}
          onSaved={() => { setShowGroupModal(false); reload() }}
        />
      )}

      {memberModal && group && (
        <MemberModal
          group={group}
          member={memberModal.id ? memberModal : null}
          onClose={() => setMemberModal(null)}
          onSaved={() => { setMemberModal(null); reload() }}
        />
      )}

      {showBillModal && group && (
        <BillModal
          group={group}
          wallets={wallets}
          selectedWalletId={selectedWalletId}
          onClose={() => setShowBillModal(false)}
          onSaved={() => { setShowBillModal(false); reload() }}
        />
      )}
    </div>
  )
}
