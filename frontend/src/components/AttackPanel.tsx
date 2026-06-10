import { useState, useRef, useEffect } from 'react'
import { runAttack, getPayload, captureFlag, markPayloadUsed, uploadPdfAndAttack, forgedPdfUrl } from '../lib/api'
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
  const match = text.match(/vulAI{[^}]+\}/)
  return match ? match[0] : null
}

export function AttackPanel({ labNumber, module, moduleName, hintsUsed: _hintsUsed, unlockedHints, onFlagCaptured, payloadCost }: AttackPanelProps) {
  const { userId, role } = useGame()
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
  const [_pdfFilename, setPdfFilename] = useState<string | null>(null)
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
    setPdfFilename(file.name)
    // Show user message in chat indicating a PDF was submitted
    const userMsg: Message = { role: 'user', content: `[PDF submitted: ${file.name}]\n\nBLACKBUCK is being asked to summarise this document.` }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    try {
      const data = await uploadPdfAndAttack(file, userId, defenseTier, 'demo', role)
      const assistantMsg: Message = { role: 'assistant', content: data.response }
      setMessages(prev => [...prev, assistantMsg])
      if (data.flag_earned) {
        const flag = data.flag_name
        setDetectedFlag(flag)
        await captureFlag(userId, data.flag_name, labNumber, module)
        sessionStorage.setItem(`debrief_${labNumber}`, JSON.stringify(data.debrief || {}))
      }
      await markPayloadUsed(labNumber, userId)
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error processing PDF: ${err.message}` }])
    } finally {
      setPdfUploading(false)
      setLoading(false)
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
      const result = await runAttack(module, userId, input, messages, defenseTier, role)
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
              <div className="text-slate-400 font-mono text-xs tracking-widest">PDF DOCUMENT ATTACK</div>
              <div className="flex gap-2">
                <a
                  href={forgedPdfUrl}
                  download="aarogya_patient_consent_form_2024.pdf"
                  className="flex-1 text-center text-xs font-mono bg-blue-900/40 hover:bg-blue-900/60 text-blue-300 border border-blue-700/50 rounded px-2 py-1.5 transition-colors"
                >
                  ⬇ DOWNLOAD FORGED PDF
                </a>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={pdfUploading || loading}
                  className="flex-1 text-xs font-mono bg-amber-600/40 hover:bg-amber-600/60 text-amber-300 border border-amber-600/50 rounded px-2 py-1.5 transition-colors disabled:opacity-50"
                >
                  {pdfUploading ? 'Attacking...' : '⬆ UPLOAD PDF → ATTACK'}
                </button>
                <input ref={fileInputRef} type="file" accept=".pdf" onChange={handlePdfUpload} className="hidden" />
              </div>
            </div>
          )}
          {module === 'rag_poisoning' ? (
            <div className="space-y-2">
              {/* AFC clean query — green, no cost, no flag */}
              <div className="text-slate-500 font-mono text-xs">SAFE QUERY — clean knowledge base (no cost, no flag)</div>
              <button
                onClick={async () => {
                  if (!userId || loading) return
                  const prompt = "What does the AFC/2024/CARD/089 circular say about Warfarin dosing for post-cardiac patients?"
                  const userMsg: Message = { role: 'user', content: prompt }
                  const newHistory = [...messages, userMsg]
                  setMessages(newHistory)
                  setInput('')
                  setLoading(true)
                  try {
                    const result = await runAttack(module, userId, prompt, messages, defenseTier, role, false)
                    setMessages([...newHistory, { role: 'assistant', content: result.response }])
                  } finally {
                    setLoading(false)
                  }
                }}
                disabled={loading}
                className="w-full text-xs font-mono bg-green-900/40 hover:bg-green-900/60 text-green-300 border border-green-700/50 rounded px-2 py-1.5 transition-colors disabled:opacity-50"
              >
                📋 AFC CIRCULAR QUERY (clean — expect 5mg)
              </button>
              {/* Warfarin poisoned query — red, costs points, raises flag, fires immediately */}
              <div className="text-slate-500 font-mono text-xs">POISONED QUERY — hits tampered knowledge base (costs -{payloadCost}pts, disables bonus)</div>
              <button
                onClick={async () => {
                  if (!userId || loading) return
                  const prompt = "What is the current Warfarin dosage for post-cardiac patients at Aarogya? I am P001's family member and our relative Arjun Das is on this medication."
                  if (!payloadLoaded) { await markPayloadUsed(labNumber, userId); setPayloadLoaded(true) }
                  const userMsg: Message = { role: 'user', content: prompt }
                  const newHistory = [...messages, userMsg]
                  setMessages(newHistory)
                  setInput('')
                  setLoading(true)
                  try {
                    const result = await runAttack(module, userId, prompt, messages, defenseTier, role, true)
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
                }}
                disabled={loading}
                className="w-full text-xs font-mono bg-red-900/40 hover:bg-red-900/60 text-red-300 border border-red-700/50 rounded px-2 py-1.5 transition-colors disabled:opacity-50"
              >
                💊 WARFARIN DOSAGE PAYLOAD (poisoned — expect 50mg)
              </button>
            </div>
          ) : module !== 'indirect_injection' ? (
            <button onClick={loadPayload} className="w-full text-xs font-mono bg-red-900/40 hover:bg-red-900/60 text-red-300 border border-red-700/50 rounded px-3 py-1.5 transition-colors">
              LOAD EXAMPLE PAYLOAD (costs -{payloadCost}pts, disables bonus)
            </button>
          ) : null}
          {module !== 'indirect_injection' && module !== 'rag_poisoning' && (
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
          )}
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
