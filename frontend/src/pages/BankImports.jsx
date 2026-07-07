import { useEffect, useMemo, useState } from 'react'
import { Upload, FileSpreadsheet, RefreshCw, RotateCcw, CheckCircle2, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { getWallets } from '../api/wallets'
import { getCategories } from '../api/categories'
import {
  uploadBankImportPreview,
  previewBankImportMapping,
  confirmBankImport,
  getBankImportHistory,
  rollbackBankImport,
} from '../api/bankImports'
import { formatCurrency } from '../utils/format'

const MAPPING_FIELDS = [
  ['dateColumn', 'Ngày giao dịch', true],
  ['descriptionColumn', 'Mô tả', true],
  ['debitColumn', 'Tiền ra', false],
  ['creditColumn', 'Tiền vào', false],
  ['amountColumn', 'Số tiền chung', false],
  ['typeColumn', 'Loại giao dịch', false],
  ['referenceColumn', 'Mã giao dịch', false],
  ['balanceColumn', 'Số dư', false],
]

const statusLabel = {
  RAW: 'Chưa xử lý',
  READY: 'Hợp lệ',
  IMPORTED: 'Đã import',
  DUPLICATE: 'Trùng',
  ERROR: 'Lỗi',
  SKIPPED: 'Bỏ qua',
  ROLLED_BACK: 'Đã hoàn tác',
  DRAFT: 'Nháp',
  IMPORTED_BATCH: 'Đã import',
  ROLLED_BACK_BATCH: 'Đã hoàn tác',
}

const statusClass = {
  READY: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  IMPORTED: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  DUPLICATE: 'bg-amber-50 text-amber-700 border-amber-100',
  ERROR: 'bg-red-50 text-red-700 border-red-100',
  SKIPPED: 'bg-gray-50 text-gray-600 border-gray-100',
  ROLLED_BACK: 'bg-gray-50 text-gray-600 border-gray-100',
}

const apiError = (error, fallback = 'Có lỗi xảy ra') => (
  error?.response?.data?.message || fallback
)

function StatusBadge({ status }) {
  return (
    <span className={clsx(
      'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium',
      statusClass[status] || 'bg-blue-50 text-blue-700 border-blue-100'
    )}>
      {statusLabel[status] || status}
    </span>
  )
}

function MappingSelect({ label, value, headers, required, onChange }) {
  return (
    <div>
      <label className="label">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select className="input" value={value || ''} onChange={e => onChange(e.target.value || null)}>
        <option value="">Không dùng</option>
        {headers.map(header => (
          <option key={header} value={header}>{header}</option>
        ))}
      </select>
    </div>
  )
}

export default function BankImports() {
  const [wallets, setWallets] = useState([])
  const [categories, setCategories] = useState([])
  const [history, setHistory] = useState([])
  const [selectedWalletId, setSelectedWalletId] = useState('')
  const [preview, setPreview] = useState(null)
  const [mapping, setMapping] = useState({})
  const [selectedRows, setSelectedRows] = useState(new Set())
  const [categoryOverrides, setCategoryOverrides] = useState({})
  const [loading, setLoading] = useState(false)
  const [refreshingPreview, setRefreshingPreview] = useState(false)

  const expenseCategories = useMemo(() => (
    categories.filter(c => c.type === 'EXPENSE' || c.type === 'INCOME')
  ), [categories])

  const selectedCount = selectedRows.size
  const validRows = preview?.rows?.filter(row => row.status !== 'ERROR' && row.status !== 'DUPLICATE') || []

  const loadMeta = async () => {
    const [walletRes, categoryRes, historyRes] = await Promise.all([
      getWallets(),
      getCategories(),
      getBankImportHistory(),
    ])
    setWallets(walletRes.data)
    setSelectedWalletId(walletRes.data[0]?.id || '')
    setCategories(categoryRes.data)
    setHistory(historyRes.data)
  }

  useEffect(() => {
    loadMeta()
  }, [])

  const handleUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setLoading(true)
    try {
      const { data } = await uploadBankImportPreview(file)
      setPreview(data)
      setMapping(data.suggestedMapping || {})
      setSelectedRows(new Set((data.rows || []).filter(row => row.selected).map(row => row.id)))
      setCategoryOverrides({})
      toast.success('Đã đọc file sao kê')
    } catch (error) {
      toast.error(apiError(error, 'Không đọc được file'))
    } finally {
      setLoading(false)
      event.target.value = ''
    }
  }

  const refreshPreview = async () => {
    if (!preview?.importId) return
    setRefreshingPreview(true)
    try {
      const { data } = await previewBankImportMapping(preview.importId, mapping)
      setPreview(data)
      setSelectedRows(new Set((data.rows || []).filter(row => row.selected).map(row => row.id)))
      toast.success('Đã cập nhật preview')
    } catch (error) {
      toast.error(apiError(error, 'Không preview được mapping'))
    } finally {
      setRefreshingPreview(false)
    }
  }

  const toggleRow = (id) => {
    setSelectedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedRows.size === validRows.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(validRows.map(row => row.id)))
    }
  }

  const importRows = async () => {
    if (!selectedWalletId) {
      toast.error('Chọn ví để import')
      return
    }
    if (!preview?.importId || selectedRows.size === 0) {
      toast.error('Chọn ít nhất một dòng hợp lệ')
      return
    }
    setLoading(true)
    try {
      const { data } = await confirmBankImport(preview.importId, {
        walletId: Number(selectedWalletId),
        mapping,
        selectedRowIds: Array.from(selectedRows),
        categoryOverrides,
      })
      setPreview(data)
      await loadMeta()
      toast.success(`Đã import ${data.importedRows} giao dịch`)
    } catch (error) {
      toast.error(apiError(error, 'Import thất bại'))
    } finally {
      setLoading(false)
    }
  }

  const rollback = async (id) => {
    setLoading(true)
    try {
      await rollbackBankImport(id)
      await loadMeta()
      toast.success('Đã hoàn tác import')
    } catch (error) {
      toast.error(apiError(error, 'Không hoàn tác được'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import sao kê</h1>
          <p className="text-sm text-gray-500">Upload CSV/XLSX, map cột, preview rồi import vào giao dịch.</p>
        </div>
        <label className="btn-primary flex cursor-pointer items-center gap-2">
          <Upload size={16} /> Upload file
          <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleUpload} disabled={loading} />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        <main className="space-y-5">
          <div className="card p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="label">Ví import</label>
                <select className="input" value={selectedWalletId} onChange={e => setSelectedWalletId(e.target.value)}>
                  <option value="">Chọn ví</option>
                  {wallets.map(wallet => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="label">File hiện tại</label>
                <div className="flex h-10 items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-600">
                  <FileSpreadsheet size={16} className="mr-2 text-primary-600" />
                  {preview?.fileName || 'Chưa upload file'}
                </div>
              </div>
            </div>

            {preview && (
              <>
                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
                  {MAPPING_FIELDS.map(([key, label, required]) => (
                    <MappingSelect
                      key={key}
                      label={label}
                      value={mapping[key]}
                      headers={preview.headers || []}
                      required={required}
                      onChange={value => setMapping(prev => ({ ...prev, [key]: value }))}
                    />
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button className="btn-secondary flex items-center gap-2" onClick={refreshPreview} disabled={refreshingPreview}>
                    <RefreshCw size={15} /> Preview mapping
                  </button>
                  <button className="btn-primary flex items-center gap-2" onClick={importRows} disabled={loading || selectedRows.size === 0}>
                    <CheckCircle2 size={15} /> Import {selectedCount} dòng
                  </button>
                  <span className="ml-auto text-sm text-gray-500">
                    {preview.totalRows} dòng · {selectedCount} đang chọn
                  </span>
                </div>
              </>
            )}
          </div>

          {preview ? (
            <div className="card p-0 overflow-hidden">
              <div className="flex items-center justify-between border-b border-gray-100 p-4">
                <h2 className="font-semibold text-gray-900">Preview giao dịch</h2>
                <button className="text-sm font-medium text-primary-600 hover:text-primary-700" onClick={toggleAll}>
                  {selectedRows.size === validRows.length ? 'Bỏ chọn hết' : 'Chọn dòng hợp lệ'}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-3 py-2">Chọn</th>
                      <th className="px-3 py-2">Ngày</th>
                      <th className="px-3 py-2">Mô tả</th>
                      <th className="px-3 py-2">Loại</th>
                      <th className="px-3 py-2">Số tiền</th>
                      <th className="px-3 py-2">Danh mục</th>
                      <th className="px-3 py-2">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {preview.rows?.map(row => {
                      const disabled = row.status === 'ERROR' || row.status === 'DUPLICATE' || row.status === 'IMPORTED'
                      return (
                        <tr key={row.id} className={disabled ? 'bg-gray-50/70' : 'bg-white'}>
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selectedRows.has(row.id)}
                              disabled={disabled}
                              onChange={() => toggleRow(row.id)}
                            />
                          </td>
                          <td className="px-3 py-2">{row.transactionDate || '-'}</td>
                          <td className="px-3 py-2">
                            <p className="max-w-sm truncate font-medium text-gray-900">{row.description || '-'}</p>
                            {row.referenceCode && <p className="text-xs text-gray-400">{row.referenceCode}</p>}
                            {row.errorMessage && <p className="text-xs text-red-500">{row.errorMessage}</p>}
                          </td>
                          <td className={clsx('px-3 py-2 font-medium', row.type === 'INCOME' ? 'text-emerald-600' : 'text-red-600')}>
                            {row.type === 'INCOME' ? 'Thu' : row.type === 'EXPENSE' ? 'Chi' : '-'}
                          </td>
                          <td className="px-3 py-2 font-semibold">{row.amount ? formatCurrency(row.amount) : '-'}</td>
                          <td className="px-3 py-2">
                            <select
                              className="input min-w-[160px]"
                              value={categoryOverrides[row.id] || row.categoryName || ''}
                              onChange={e => setCategoryOverrides(prev => ({ ...prev, [row.id]: e.target.value }))}
                              disabled={disabled}
                            >
                              <option value="">Không chọn</option>
                              {expenseCategories.map(category => (
                                <option key={category.id} value={category.name}>{category.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2"><StatusBadge status={row.status} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {preview.rows?.length === 0 && (
                <div className="p-8 text-center text-sm text-gray-500">Không có dòng nào để preview</div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-200 bg-white p-10 text-center">
              <FileSpreadsheet className="mx-auto mb-3 text-gray-300" size={44} />
              <p className="font-medium text-gray-700">Upload file sao kê để bắt đầu</p>
              <p className="mt-1 text-sm text-gray-400">Hỗ trợ CSV, XLSX và XLS.</p>
            </div>
          )}
        </main>

        <aside className="space-y-4">
          <div className="card p-5">
            <h2 className="mb-3 font-semibold text-gray-900">Lưu ý</h2>
            <div className="space-y-3 text-sm text-gray-600">
              <p className="flex gap-2"><AlertTriangle size={16} className="mt-0.5 text-amber-500" /> Luôn kiểm tra mapping trước khi import.</p>
              <p>Dùng cột tiền ra/tiền vào nếu sao kê tách 2 cột. Nếu chỉ có một cột số tiền, map vào “Số tiền chung”.</p>
              <p>Import nhầm có thể rollback trong lịch sử.</p>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="mb-3 font-semibold text-gray-900">Lịch sử import</h2>
            <div className="space-y-3">
              {history.map(item => (
                <div key={item.id} className="rounded-lg border border-gray-100 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-gray-900">{item.fileName}</p>
                      <p className="text-xs text-gray-400">{item.walletName || 'Chưa chọn ví'}</p>
                    </div>
                    <StatusBadge status={item.status === 'IMPORTED' ? 'IMPORTED' : item.status === 'ROLLED_BACK' ? 'ROLLED_BACK' : 'RAW'} />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                      <p>Import</p>
                      <p className="font-semibold">{item.importedRows}</p>
                    </div>
                    <div className="rounded-lg bg-amber-50 p-2 text-amber-700">
                      <p>Trùng</p>
                      <p className="font-semibold">{item.duplicateRows}</p>
                    </div>
                    <div className="rounded-lg bg-red-50 p-2 text-red-700">
                      <p>Lỗi</p>
                      <p className="font-semibold">{item.errorRows}</p>
                    </div>
                  </div>
                  {item.status === 'IMPORTED' && (
                    <button
                      className="btn-secondary mt-3 flex w-full items-center justify-center gap-2 py-1.5 text-sm"
                      onClick={() => rollback(item.id)}
                      disabled={loading}
                    >
                      <RotateCcw size={15} /> Rollback
                    </button>
                  )}
                </div>
              ))}
              {history.length === 0 && <p className="text-sm text-gray-400">Chưa có lịch sử import</p>}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
