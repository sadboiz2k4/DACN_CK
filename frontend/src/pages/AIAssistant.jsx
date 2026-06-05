import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Upload, Bot, User, Loader2, Mic, MicOff, X } from 'lucide-react'
import { parseTransaction, scanReceipt } from '../api/ai'
import { createTransaction } from '../api/transactions'
import { getWallets } from '../api/wallets'
import { formatCurrency } from '../utils/format'
import toast from 'react-hot-toast'
import clsx from 'clsx'

// ── helpers ──────────────────────────────────────────────────────────────────
const SpeechRecognitionAPI =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null

function Message({ msg, onConfirm, onCancel }) {
  return (
    <div className={clsx('flex gap-3', msg.role === 'user' && 'flex-row-reverse')}>
      <div className={clsx(
        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
        msg.role === 'user' ? 'bg-primary-600' : 'bg-gray-100'
      )}>
        {msg.role === 'user'
          ? <User size={16} className="text-white" />
          : <Bot size={16} className="text-gray-600" />}
      </div>

      <div className={clsx(
        'max-w-xs lg:max-w-md rounded-2xl px-4 py-3 text-sm',
        msg.role === 'user' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-800'
      )}>
        {msg.voice && (
          <span className="inline-flex items-center gap-1 text-xs mb-1 opacity-70">
            <Mic size={11} /> Giọng nói
          </span>
        )}
        <p>{msg.content}</p>

        {msg.transaction && (
          <div className="mt-2 p-2.5 bg-white/20 rounded-xl text-xs space-y-1 border border-white/10">
            <div>💰 Số tiền: <strong>{formatCurrency(msg.transaction.amount)}</strong></div>
            {msg.transaction.categoryName && <div>📂 {msg.transaction.categoryName}</div>}
            <div>📅 {msg.transaction.date}</div>
            {msg.transaction.note && <div>📝 {msg.transaction.note}</div>}
          </div>
        )}

        {msg.awaitConfirm && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => onConfirm(msg.id)}
              className="bg-white text-primary-700 font-medium px-3 py-1 rounded-lg text-xs hover:bg-primary-50 transition-colors"
            >
              ✓ Xác nhận lưu
            </button>
            <button
              onClick={() => onCancel(msg.id)}
              className="bg-white/20 px-3 py-1 rounded-lg text-xs hover:bg-white/30 transition-colors"
            >
              Hủy
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────
export default function AIAssistant() {
  const [messages, setMessages] = useState([{
    id: 'init',
    role: 'assistant',
    content: 'Xin chào! Tôi là trợ lý SmartSpend. Bạn có thể nhập văn bản, nhấn 🎤 để nói, hoặc 📷 để upload hóa đơn.\n\nVí dụ: "hôm nay ăn phở 45k", "lương tháng 8 triệu"',
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')

  const fileRef = useRef()
  const bottomRef = useRef()
  const recognitionRef = useRef(null)
  const pendingTxRef = useRef({})   // lưu transaction data theo msg.id

  // auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const addMessage = useCallback((msg) => {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), ...msg }])
  }, [])

  // ── NLP send ──────────────────────────────────────────────────────────────
  const handleSend = useCallback(async (text, fromVoice = false) => {
    const trimmed = (text || input).trim()
    if (!trimmed) return
    setInput('')
    setTranscript('')
    addMessage({ role: 'user', content: trimmed, voice: fromVoice })
    setLoading(true)

    try {
      const { data } = await parseTransaction(trimmed)

      if (data.success && data.transaction) {
        const tx = data.transaction
        const msgId = Date.now()
        pendingTxRef.current[msgId] = tx
        setMessages(prev => [...prev, {
          id: msgId,
          role: 'assistant',
          content: 'Tôi đã nhận diện được giao dịch:',
          transaction: tx,
          awaitConfirm: true,
        }])
      } else {
        addMessage({ role: 'assistant', content: data.message || 'Không nhận diện được giao dịch. Thử lại với cú pháp rõ hơn nhé!' })
      }
    } catch {
      addMessage({ role: 'assistant', content: 'Dịch vụ AI đang bận. Vui lòng thử lại sau.' })
    } finally {
      setLoading(false)
    }
  }, [input, addMessage])

  // ── confirm / cancel ──────────────────────────────────────────────────────
  const handleConfirm = useCallback(async (msgId) => {
    const tx = pendingTxRef.current[msgId]
    if (!tx) return

    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, awaitConfirm: false } : m))
    try {
      const { data: wallets } = await getWallets()
      if (!wallets.length) { toast.error('Bạn chưa có ví nào. Hãy tạo ví trước!'); return }
      await createTransaction({
        amount: tx.amount,
        type: tx.type || 'EXPENSE',
        walletId: wallets[0].id,
        note: tx.note,
        transactionDate: tx.date,
        source: 'NLP',
      })
      toast.success('Đã lưu giao dịch!')
      addMessage({ role: 'assistant', content: `✅ Đã lưu thành công! ${tx.type === 'INCOME' ? '+' : '-'}${formatCurrency(tx.amount)} vào ví "${wallets[0].name}".` })
    } catch {
      toast.error('Không thể lưu giao dịch')
    }
    delete pendingTxRef.current[msgId]
  }, [addMessage])

  const handleCancel = useCallback((msgId) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, awaitConfirm: false } : m))
    addMessage({ role: 'assistant', content: 'Đã hủy. Bạn muốn thêm giao dịch nào khác không?' })
    delete pendingTxRef.current[msgId]
  }, [addMessage])

  // ── OCR upload ────────────────────────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''

    addMessage({ role: 'user', content: `📷 Upload ảnh: ${file.name}` })
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const { data } = await scanReceipt(formData)

      if (data.success) {
        const msgId = Date.now()
        pendingTxRef.current[msgId] = data.transaction
        const items = data.items?.map(i => `• ${i.name}: ${formatCurrency(i.price)}`).join('\n') || ''
        setMessages(prev => [...prev, {
          id: msgId,
          role: 'assistant',
          content: `Đã đọc hóa đơn từ "${data.merchant || 'cửa hàng'}":\n${items}`,
          transaction: data.transaction,
          awaitConfirm: true,
        }])
      } else {
        addMessage({ role: 'assistant', content: 'Không đọc được hóa đơn. Hãy chụp ảnh rõ hơn và thử lại.' })
      }
    } catch {
      addMessage({ role: 'assistant', content: 'Lỗi xử lý ảnh. Vui lòng thử lại.' })
    } finally {
      setLoading(false)
    }
  }

  // ── Voice input (Web Speech API) ──────────────────────────────────────────
  const startListening = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      toast.error('Trình duyệt không hỗ trợ nhận diện giọng nói. Dùng Chrome nhé!')
      return
    }
    if (isListening) return

    const recognition = new SpeechRecognitionAPI()
    recognition.lang = 'vi-VN'
    recognition.continuous = false
    recognition.interimResults = true
    recognitionRef.current = recognition

    recognition.onstart = () => setIsListening(true)

    recognition.onresult = (event) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) final += t
        else interim += t
      }
      setTranscript(final || interim)
      if (final) {
        recognition.stop()
        handleSend(final, true)
      }
    }

    recognition.onerror = (e) => {
      setIsListening(false)
      setTranscript('')
      if (e.error !== 'aborted') toast.error('Không nhận được giọng nói. Thử lại!')
    }

    recognition.onend = () => {
      setIsListening(false)
      setTranscript('')
    }

    recognition.start()
  }, [isListening, handleSend])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
    setTranscript('')
  }, [])

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-3xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 48px)' }}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
          <Bot size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Trợ lý AI</h1>
          <p className="text-xs text-gray-400">Gemini · NLP · OCR · Giọng nói</p>
        </div>
      </div>

      <div className="card flex-1 flex flex-col overflow-hidden p-4">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {messages.map(msg => (
            <Message
              key={msg.id}
              msg={msg}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
            />
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <Bot size={16} className="text-gray-500" />
              </div>
              <div className="bg-gray-100 rounded-2xl px-4 py-3 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-gray-400" />
                <span className="text-xs text-gray-400">Đang xử lý...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Voice listening indicator */}
        {isListening && (
          <div className="mx-2 mb-3 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <p className="text-sm text-red-600 flex-1">
              {transcript || 'Đang nghe... hãy nói giao dịch của bạn'}
            </p>
            <button onClick={stopListening} className="text-red-400 hover:text-red-600">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Input bar */}
        <div className="border-t border-gray-100 pt-3 flex gap-2">
          <input ref={fileRef} type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />

          {/* Upload */}
          <button
            onClick={() => fileRef.current?.click()}
            title="Upload hóa đơn"
            disabled={loading || isListening}
            className="btn-secondary p-2.5 flex-shrink-0"
          >
            <Upload size={18} />
          </button>

          {/* Text input */}
          <input
            type="text"
            className="input flex-1 text-sm"
            placeholder={isListening ? 'Đang nghe giọng nói...' : 'Nhập giao dịch... (VD: ăn sáng 30k)'}
            value={isListening ? transcript : input}
            onChange={e => !isListening && setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !isListening && handleSend()}
            disabled={loading || isListening}
            readOnly={isListening}
          />

          {/* Voice button */}
          <button
            onClick={isListening ? stopListening : startListening}
            title={isListening ? 'Dừng ghi âm' : 'Ghi âm giọng nói'}
            disabled={loading}
            className={clsx(
              'p-2.5 rounded-lg flex-shrink-0 transition-colors font-medium border',
              isListening
                ? 'bg-red-500 text-white border-red-500 animate-pulse'
                : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400 hover:text-primary-600'
            )}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          {/* Send */}
          <button
            onClick={() => handleSend()}
            disabled={loading || isListening || !input.trim()}
            className="btn-primary p-2.5 flex-shrink-0"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
