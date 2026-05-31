import { useState, useRef, useEffect } from 'react'
import { runAttack, getPayload, captureFlag, markPayloadUsed, uploadPdf, forgedPdfUrl } from '../lib/api'
import { useGame } from '../store/game'
import { FlagSubmission } from './FlagSubmission'

interface AttackPanelProps {
  labNumber: number
  module: string
  moduleName: string
  hintsUsed: (number | string)[]
  unlockedHints: Record<number, string>
  onFlagCaptured: (flagName: string, debrief: any, score: number, bonus: boolean) => void
  payloadCost: number
}

interface Message { role: 'user' | 'assistant'; content: string }

function extractFlag(text: string): string | null {
  const match = text.match(/vuLLM\{[^}]+\}/)
  return match ? match[0] : null
}

export function AttackPanel({ labNumber, module, moduleName, hintsUsed, unlockedHints, onFlagCaptured, payloadCost }: AttackPanelProps) {
  const { userId } = useGame()
  const defenseTier = 0
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [detectedFlag, setDetectedFlag] = useState<string | null>(null)
  const [payloadLoaded, setPayloadLoaded] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [input])

  async function loadPayload() {
    if (!userId) return
    const data = await getPayload(module)
    setInput(data.payload)
    if (!payloadLoaded) {
      await markPayloadUsed(labNumber, userId)
      setPayloadLoaded(true)
    }
    textareaRef.current?.focus()
  }

  const [pdfUploading, setPdfUploading] = useState(false)
  const [pdfFilename, setPdfFilename] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function clearChat() {
    setMessages([])
    setInput('')
    setDetectedFlag(null)
    setPdfFilename(null)
  }

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    setPdfUploading(true)
    try {
      const data = await uploadPdf(file)
      setInput(data.prompt)
      setPdfFilename(file.name)
      await markPayloadUsed(labNumber, userId)
      setPayloadLoaded(true)
    } catch (err: any) {
      alert('Failed to parse PDF: ' + err.message)
    } finally {
      setPdfUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function send() {
    if (!input.trim() || !userId || loading) return
    const userMsg: Message = { role: 'user', content: input }
    const newHistory = [...messages, userMsg]
    setMessages(newHistory)
    setInput('')
    setLoading(true)
    try {
      const result = await runAttack(module, userId, input, messages, defenseTier)
      const assistantMsg: Message = { role: 'assistant', content: result.response }
      setMessages([...newHistory, assistantMsg])
      if (result.flag_earned) {
        const flag = extractFlag(result.response) || result.flag_name
        setDetectedFlag(flag)
        await captureFlag(userId, result.flag_name, labNumber, module)
        sessionStorage.setItem(`debrief_${labNumber}`, JSON.stringify(result.debrief || {}))
      }
    } finally {
      setLoading(false)
    }
  }

  function handleFlagSuccess(score: number, bonus: boolean) {
    const debrief = JSON.parse(sessionStorage.getItem(`debrief_${labNumber}`) || '{}')
    onFlagCaptured(detectedFlag!, debrief, score, bonus)
  }

  return (
    <div className="flex flex-col space-y-3 h-full">
      <div>
        <div className="text-amber-400 font-mono text-xs tracking-widest mb-1">PHASE 3: ATTEMPT</div>
        <div className="h-1.5 bg-slate-700 rounded-full">
          <div className="h-1.5 bg-amber-400 rounded-full" style={{ width: '75%' }} />
        </div>
      </div>

      {Object.entries(unlockedHints).length > 0 && (
        <div className="space-y-2">
          {Object.entries(unlockedHints).map(([n, text]) => (
            <div key={n} className="bg-amber-950/30 border border-amber-700/40 rounded p-3">
              <div className="text-amber-400 font-mono text-xs mb-1">HINT {n}</div>
              <p className="text-amber-200 font-mono text-sm">{text}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col bg-slate-900 border border-slate-700 rounded-lg overflow-hidden flex-1 min-h-0">
        <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
          <span className="text-amber-400 font-mono text-sm truncate">BLACKBUCK TERMINAL — {moduleName}</span>
          <button onClick={clearChat} className="text-xs font-mono text-slate-400 hover:text-red-400 border border-slate-600 hover:border-red-500 px-2 py-0.5 rounded transition-colors flex-shrink-0 ml-2">
            CLEAR
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {messages.length === 0 && (
            <p className="text-slate-500 font-mono text-sm text-center mt-8">BLACKBUCK is waiting for your query...</p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded px-3 py-2 font-mono text-sm ${m.role === 'user' ? 'bg-amber-400/20 text-amber-100 border border-amber-400/30' : 'bg-slate-700 text-green-300 border border-slate-600'}`}>
                <span className="text-xs opacity-50 block mb-1">{m.role === 'user' ? 'YOU' : 'BLACKBUCK'}</span>
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-700 border border-slate-600 rounded px-3 py-2 font-mono text-sm text-green-400 animate-pulse">
                BLACKBUCK is processing...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-3 border-t border-slate-700 space-y-2 flex-shrink-0">
          {/* PDF tools — only for indirect injection lab */}
          {module === 'indirect_injection' && (
            <div className="bg-slate-800 border border-slate-600 rounded p-2 space-y-2">
              <div className="text-slate-400 font-mono text-xs tracking-widest">PDF DOCUMENT TOOLS</div>
              <div className="flex gap-2">
                {/* Download forged PDF */}
                <a
                  href={forgedPdfUrl}
                  download="ministry_annual_report_2024.pdf"
                  className="flex-1 text-center text-xs font-mono bg-blue-900/40 hover:bg-blue-900/60 text-blue-300 border border-blue-700/50 rounded px-2 py-1.5 transition-colors"
                >
                  ⬇ DOWNLOAD FORGED PDF
                </a>
                {/* Upload PDF */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={pdfUploading}
                  className="flex-1 text-xs font-mono bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-500 rounded px-2 py-1.5 transition-colors disabled:opacity-50"
                >
                  {pdfUploading ? 'Parsing...' : pdfFilename ? `✓ ${pdfFilename.slice(0, 18)}` : '⬆ UPLOAD YOUR PDF'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handlePdfUpload}
                  className="hidden"
                />
              </div>
              <p className="text-slate-500 font-mono text-xs">
                Download the forged PDF to see the hidden injection, then upload it (or your own) to load it as an attack prompt.
              </p>
            </div>
          )}
          <button onClick={loadPayload} className="w-full text-xs font-mono bg-red-900/40 hover:bg-red-900/60 text-red-300 border border-red-700/50 rounded px-3 py-1.5 transition-colors">
            LOAD EXAMPLE PAYLOAD (costs -{payloadCost}pts, disables bonus)
          </button>
          <div className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Enter your attack prompt... (Ctrl+Enter to send)"
              className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-green-300 font-mono text-sm resize-none focus:outline-none focus:border-amber-400/50 overflow-hidden"
              style={{ minHeight: '44px', maxHeight: '200px' }}
              onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) send() }}
            />
            <button onClick={send} disabled={loading} className="bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black font-bold font-mono px-4 py-2 rounded transition-colors flex-shrink-0">
              SEND
            </button>
          </div>
        </div>
      </div>

      {detectedFlag && (
        <FlagSubmission
          labNumber={labNumber}
          flagFromResponse={detectedFlag}
          onSuccess={handleFlagSuccess}
        />
      )}
    </div>
  )
}
