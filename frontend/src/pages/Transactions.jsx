import { useState, useEffect } from 'react'
import { Plus, Trash2, X, Tag, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { getTransactions, createTransaction, deleteTransaction } from '../api/transactions'
import { getWallets } from '../api/wallets'
import api from '../api/axios'
import { formatCurrency } from '../utils/format'
import { CategoryIcon } from '../utils/icons'
import ConfirmModal from '../components/common/ConfirmModal'
import toast from 'react-hot-toast'

const TYPE_LABELS = { INCOME: 'Thu', EXPENSE: 'Chi', TRANSFER: 'Chuyển khoản' }
const TYPE_COLORS = { INCOME: 'text-green-600', EXPENSE: 'text-red-600', TRANSFER: 'text-blue-600' }
const TYPE_BG    = { INCOME: 'bg-green-50', EXPENSE: 'bg-red-50', TRANSFER: 'bg-blue-50' }
const AMOUNT_PRESETS = [10000, 20000, 50000, 100000, 200000, 500000, 1000000, 2000000]
const VI_MONTHS = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
                   'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12']
const VI_DAYS = ['CN','T2','T3','T4','T5','T6','T7']

const shortAmount = (n) => {
  if (n >= 1000000) return `${(n/1000000).toFixed(n%1000000===0?0:1)}tr`
  if (n >= 1000)    return `${Math.round(n/1000)}k`
  return `${n}`
}

const pad2 = n => String(n).padStart(2,'0')

const formatDayLabel = (dateStr) => {
  const d = new Date(dateStr+'T00:00:00')
  const today = new Date(); today.setHours(0,0,0,0)
  const yest  = new Date(today); yest.setDate(today.getDate()-1)
  if (d.getTime()===today.getTime()) return 'Hôm nay'
  if (d.getTime()===yest.getTime())  return 'Hôm qua'
  return d.toLocaleDateString('vi-VN',{weekday:'long',day:'2-digit',month:'2-digit'})
}

function groupByDate(txList) {
  const map = {}
  txList.forEach(tx => { const d=tx.transactionDate; if(!map[d])map[d]=[]; map[d].push(tx) })
  return Object.entries(map).sort(([a],[b])=>b.localeCompare(a))
}

// ── Mini calendar ─────────────────────────────────────────────────────────────
function MiniCalendar({ year, month, transactions, selectedDay, onSelectDay }) {
  const todayStr = new Date().toISOString().split('T')[0]
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDow = new Date(year, month-1, 1).getDay() // 0=Sun

  // tổng chi theo ngày để hiện màu
  const dayData = {}
  transactions.forEach(tx => {
    const day = parseInt(tx.transactionDate?.split('-')[2])
    if (!dayData[day]) dayData[day] = { income: 0, expense: 0 }
    if (tx.type==='INCOME')  dayData[day].income  += Number(tx.amount)
    if (tx.type==='EXPENSE') dayData[day].expense += Number(tx.amount)
  })

  const cells = []
  // ô trống đầu tháng
  for (let i=0;i<firstDow;i++) cells.push(null)
  for (let d=1;d<=daysInMonth;d++) cells.push(d)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
      {/* Header tháng */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {VI_DAYS.map(d=>(
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
        ))}
      </div>
      {/* Ô ngày */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />
          const dateStr = `${year}-${pad2(month)}-${pad2(day)}`
          const isToday    = dateStr===todayStr
          const isSelected = selectedDay===day
          const data = dayData[day]
          const hasIncome  = data?.income  > 0
          const hasExpense = data?.expense > 0

          return (
            <button key={day}
              onClick={()=>onSelectDay(isSelected ? null : day)}
              className={`relative flex flex-col items-center py-1.5 px-0.5 rounded-xl transition-all
                ${isSelected ? 'bg-primary-600 text-white shadow-md scale-105'
                : isToday    ? 'bg-primary-50 text-primary-700'
                :              'hover:bg-gray-50 text-gray-700'}`}>
              <span className={`text-xs font-bold leading-none ${isToday&&!isSelected?'text-primary-600':''}`}>{day}</span>
              <div className="flex flex-col items-center mt-0.5 gap-px">
                {hasIncome && (
                  <span className={`text-[9px] leading-tight font-medium ${isSelected?'text-green-200':'text-green-500'}`}>
                    +{shortAmount(data.income)}
                  </span>
                )}
                {hasExpense && (
                  <span className={`text-[9px] leading-tight font-medium ${isSelected?'text-red-200':'text-red-400'}`}>
                    -{shortAmount(data.expense)}
                  </span>
                )}
                {!hasIncome && !hasExpense && <span className="h-3"/>}
              </div>
            </button>
          )
        })}
      </div>
      {selectedDay && (
        <button onClick={()=>onSelectDay(null)}
          className="mt-3 w-full text-xs text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1">
          <X size={12}/> Xem tất cả các ngày
        </button>
      )}
    </div>
  )
}

// ── Khối ngày ─────────────────────────────────────────────────────────────────
function DayGroup({ date, txList, onDelete }) {
  const [collapsed, setCollapsed] = useState(false)
  const income  = txList.filter(t=>t.type==='INCOME').reduce((s,t)=>s+Number(t.amount),0)
  const expense = txList.filter(t=>t.type==='EXPENSE').reduce((s,t)=>s+Number(t.amount),0)
  const net = income - expense

  return (
    <div className="mb-3">
      <button onClick={()=>setCollapsed(c=>!c)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
        <div className="flex items-center gap-2">
          {collapsed?<ChevronDown size={15} className="text-gray-400"/>:<ChevronUp size={15} className="text-gray-400"/>}
          <span className="text-sm font-semibold text-gray-700">{formatDayLabel(date)}</span>
          <span className="text-xs text-gray-400">{txList.length} giao dịch</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium flex-wrap justify-end">
          {income  > 0 && <span className="text-green-600">+{formatCurrency(income)}</span>}
          {expense > 0 && <span className="text-red-500">-{formatCurrency(expense)}</span>}
          {income > 0 && expense > 0 && (
            <span className={`font-bold ${net >= 0 ? 'text-green-700' : 'text-red-600'}`}>
              = {net >= 0 ? '+' : ''}{formatCurrency(net)}
            </span>
          )}
        </div>
      </button>

      {!collapsed && (
        <div className="mt-1 bg-white rounded-xl border border-gray-100 overflow-hidden">
          {txList.map((tx,i)=>(
            <div key={tx.id}
              className={`flex items-center justify-between py-3 px-4 hover:bg-gray-50 transition-colors
                ${i!==txList.length-1?'border-b border-gray-50':''}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${TYPE_BG[tx.type]}`}>
                  <CategoryIcon name={tx.categoryIcon} type={tx.type} size={18}
                    className={tx.type==='INCOME'?'text-green-600':tx.type==='EXPENSE'?'text-red-500':'text-blue-500'} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{tx.categoryName||'Khác'}</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-gray-400">{tx.walletName}</span>
                    {tx.note && <span className="text-xs text-gray-400 italic">· "{tx.note}"</span>}
                    {tx.source!=='MANUAL' && (
                      <span className="bg-purple-100 text-purple-600 text-xs px-1.5 py-0.5 rounded-full">{tx.source}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`font-semibold text-sm ${TYPE_COLORS[tx.type]}`}>
                  {tx.type==='INCOME'?'+':tx.type==='EXPENSE'?'-':''}
                  {formatCurrency(tx.amount)}
                </span>
                <button onClick={()=>onDelete(tx.id)} className="text-gray-200 hover:text-red-500 transition-colors">
                  <Trash2 size={15}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Modal thêm giao dịch ──────────────────────────────────────────────────────
function TransactionModal({ onClose, onSuccess, wallets, categories: initCats }) {
  const [form, setForm] = useState({
    amount:'', type:'EXPENSE', walletId:wallets[0]?.id||'',
    categoryId:'', note:'', transactionDate:new Date().toISOString().split('T')[0],
  })
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState(initCats)
  const [showNewCat, setShowNewCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [savingCat, setSavingCat] = useState(false)

  const filteredCats = categories.filter(c=>form.type!=='TRANSFER'&&c.type===form.type)

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true)
    try {
      await createTransaction({...form, amount:Number(form.amount)})
      toast.success('Thêm giao dịch thành công!'); onSuccess()
    } catch { toast.error('Có lỗi xảy ra') }
    finally { setLoading(false) }
  }

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return; setSavingCat(true)
    try {
      const {data} = await api.post('/categories',{
        name:newCatName.trim(), type:form.type==='INCOME'?'INCOME':'EXPENSE',
      })
      setCategories(prev=>[...prev,data])
      setForm(f=>({...f,categoryId:data.id}))
      setNewCatName(''); setShowNewCat(false)
      toast.success(`Đã thêm danh mục "${data.name}"`)
    } catch { toast.error('Không thể thêm danh mục') }
    finally { setSavingCat(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Thêm giao dịch</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="flex gap-2">
            {['INCOME','EXPENSE','TRANSFER'].map(t=>(
              <button key={t} type="button"
                onClick={()=>setForm(f=>({...f,type:t,categoryId:''}))}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors
                  ${form.type===t?'bg-primary-600 text-white border-primary-600':'bg-white text-gray-600 border-gray-200 hover:border-primary-300'}`}>
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          <div>
            <label className="label">Số tiền</label>
            <input type="number" className="input" placeholder="0"
              value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} required min="1"/>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {AMOUNT_PRESETS.map(amt=>(
                <button key={amt} type="button" onClick={()=>setForm(f=>({...f,amount:amt}))}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors
                    ${Number(form.amount)===amt?'bg-primary-600 text-white border-primary-600'
                    :'bg-gray-50 text-gray-600 border-gray-200 hover:border-primary-300 hover:text-primary-600'}`}>
                  {amt>=1000000?`${amt/1000000}tr`:`${amt/1000}k`}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Ví</label>
            <select className="input" value={form.walletId} onChange={e=>setForm(f=>({...f,walletId:e.target.value}))}>
              {wallets.map(w=><option key={w.id} value={w.id}>{w.name} ({formatCurrency(w.balance)})</option>)}
            </select>
          </div>
          {form.type!=='TRANSFER' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">Danh mục</label>
                <button type="button" onClick={()=>setShowNewCat(s=>!s)}
                  className="flex items-center gap-1 text-xs text-primary-600 hover:underline">
                  <Plus size={13}/> Thêm danh mục
                </button>
              </div>
              {showNewCat && (
                <div className="flex gap-2 mb-2 p-2.5 bg-primary-50 rounded-lg border border-primary-100">
                  <Tag size={15} className="text-primary-500 mt-2 flex-shrink-0"/>
                  <input autoFocus className="input flex-1 text-sm py-1.5"
                    placeholder={`Tên danh mục ${form.type==='INCOME'?'thu':'chi'}...`}
                    value={newCatName} onChange={e=>setNewCatName(e.target.value)}
                    onKeyDown={e=>e.key==='Enter'&&(e.preventDefault(),handleAddCategory())}/>
                  <button type="button" onClick={handleAddCategory} disabled={savingCat||!newCatName.trim()}
                    className="btn-primary text-xs px-3 py-1.5">{savingCat?'...':'Tạo'}</button>
                  <button type="button" onClick={()=>{setShowNewCat(false);setNewCatName('')}}
                    className="text-gray-400 hover:text-gray-600 px-1"><X size={14}/></button>
                </div>
              )}
              <select className="input" value={form.categoryId} onChange={e=>setForm(f=>({...f,categoryId:e.target.value}))}>
                <option value="">-- Chọn danh mục --</option>
                {filteredCats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="label">Ngày</label>
            <input type="date" className="input" value={form.transactionDate}
              onChange={e=>setForm(f=>({...f,transactionDate:e.target.value}))}/>
          </div>
          <div>
            <label className="label">Ghi chú</label>
            <input type="text" className="input" placeholder="Ghi chú (không bắt buộc)"
              value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))}/>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading?'Đang lưu...':'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [wallets, setWallets] = useState([])
  const [categories, setCategories] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [filterType, setFilterType] = useState('ALL')
  const [selectedDay, setSelectedDay] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()+1)

  const filterMonth = `${year}-${pad2(month)}`

  const fetchData = async () => {
    const [txRes,wRes,cRes] = await Promise.all([
      getTransactions(0, 300),
      getWallets(),
      api.get('/categories'),
    ])
    setTransactions(txRes.data.content||[])
    setWallets(wRes.data)
    setCategories(cRes.data)
  }
  useEffect(()=>{ fetchData() },[])

  const handleDelete = async () => {
    await deleteTransaction(confirmDeleteId)
    toast.success('Đã xóa')
    setConfirmDeleteId(null)
    fetchData()
  }

  const prevMonth = () => {
    if (month===1){setYear(y=>y-1);setMonth(12)}else setMonth(m=>m-1)
    setSelectedDay(null)
  }
  const nextMonth = () => {
    if (month===12){setYear(y=>y+1);setMonth(1)}else setMonth(m=>m+1)
    setSelectedDay(null)
  }

  // Lọc theo tháng + type
  const monthTxs = transactions.filter(tx=>{
    const matchMonth = tx.transactionDate?.startsWith(filterMonth)
    const matchType  = filterType==='ALL'||tx.type===filterType
    return matchMonth && matchType
  })

  // Lọc thêm theo ngày được chọn
  const displayed = selectedDay
    ? monthTxs.filter(tx=>tx.transactionDate===`${filterMonth}-${pad2(selectedDay)}`)
    : monthTxs

  const grouped = groupByDate(displayed)
  const totalIncome  = monthTxs.filter(t=>t.type==='INCOME').reduce((s,t)=>s+Number(t.amount),0)
  const totalExpense = monthTxs.filter(t=>t.type==='EXPENSE').reduce((s,t)=>s+Number(t.amount),0)

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Giao dịch</h1>
        <button className="btn-primary flex items-center gap-2" onClick={()=>setShowModal(true)}>
          <Plus size={16}/> Thêm giao dịch
        </button>
      </div>

      {/* Điều hướng tháng */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ChevronLeft size={18}/>
        </button>
        <h2 className="text-base font-bold text-gray-800">
          {VI_MONTHS[month-1]} {year}
        </h2>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ChevronRight size={18}/>
        </button>
      </div>

      {/* Mini Calendar */}
      <MiniCalendar
        year={year} month={month}
        transactions={monthTxs}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
      />

      {/* Tổng tháng + filter type */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {[
          {key:'ALL',    label:'Tất cả'},
          {key:'INCOME', label:'↑ Thu'},
          {key:'EXPENSE',label:'↓ Chi'},
        ].map(({key,label})=>(
          <button key={key} onClick={()=>setFilterType(key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors
              ${filterType===key
                ? key==='INCOME'  ? 'bg-green-500 text-white border-green-500'
                : key==='EXPENSE' ? 'bg-red-500 text-white border-red-500'
                :                   'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
            {label}
          </button>
        ))}
        <div className="ml-auto flex gap-3 text-sm">
          {totalIncome  > 0 && <span className="text-green-600 font-semibold">+{formatCurrency(totalIncome)}</span>}
          {totalExpense > 0 && <span className="text-red-500 font-semibold">-{formatCurrency(totalExpense)}</span>}
        </div>
      </div>

      {/* Danh sách nhóm theo ngày */}
      {grouped.length===0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">📭</p>
          <p>{selectedDay ? `Ngày ${selectedDay}/${month} không có giao dịch` : 'Không có giao dịch nào trong tháng này'}</p>
        </div>
      ) : (
        grouped.map(([date,txList])=>(
          <DayGroup key={date} date={date} txList={txList} onDelete={id => setConfirmDeleteId(id)}/>
        ))
      )}

      {showModal && (
        <TransactionModal
          wallets={wallets} categories={categories}
          onClose={()=>setShowModal(false)}
          onSuccess={()=>{setShowModal(false);fetchData()}}
        />
      )}

      {confirmDeleteId && (
        <ConfirmModal
          title="Xóa giao dịch"
          message="Bạn có chắc muốn xóa giao dịch này không?"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  )
}
