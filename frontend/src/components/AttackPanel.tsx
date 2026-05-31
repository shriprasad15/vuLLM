import { useState, useRef, useEffect } from 'react'
import { runAttack, getPayload, captureFlag } from '../lib/api'
import { useGame } from '../store/game'

interface AttackPanelProps {
  module: string
  moduleName: string
  act: number
  onFlag: (flagName: string, points: number, debrief: object) => void
}

interface Message { role: 'user' | 'assistant'; content: string }

export function AttackPanel({ module, moduleName, act, onFlag }: AttackPanelProps) {
  const { userId, defenseTier, capturedFlags } = useGame()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const flagName = `FLAG{${module.toUpperCase().replace('_', '_')}}`
  const alreadyCaptured = capturedFlags.includes(flagName)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Auto-resize textarea as user types
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [input])

  async function loadPayload() {
    const data = await getPayload(module)
    setInput(data.payload)
    textareaRef.current?.focus()
  }

  function clearChat() {
    setMessages([])
    setInput('')
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
      setMessages([...newHistory, { role: 'assistant', content: result.response }])
      if (result.flag_earned && !alreadyCaptured) {
        const flagResult = await captureFlag(userId, result.flag_name, act, module)
        onFlag(result.flag_name, flagResult.points, result.debrief || null)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-700 rounded-lg overflow-hidden" style={{ height: '70vh' }}>
      {/* Header */}
      <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
        <span className="text-amber-400 font-mono text-sm truncate">BLACKBUCK TERMINAL — {moduleName}</span>
        <div className="flex items-center gap-3 flex-shrink-0">
          {alreadyCaptured && <span className="text-green-400 text-xs font-mono">✓ FLAG CAPTURED</span>}
          <button onClick={clearChat} className="text-xs font-mono text-slate-400 hover:text-red-400 border border-slate-600 hover:border-red-500 px-2 py-0.5 rounded transition-colors">
            CLEAR
          </button>
        </div>
      </div>

      {/* Messages — fixed height, scrollable */}
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

      {/* Input area */}
      <div className="p-3 border-t border-slate-700 space-y-2 flex-shrink-0">
        <button onClick={loadPayload} className="w-full text-xs font-mono bg-red-900/40 hover:bg-red-900/60 text-red-300 border border-red-700/50 rounded px-3 py-1.5 transition-colors">
          LOAD EXAMPLE PAYLOAD (ONE CLICK)
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
          <button
            onClick={send}
            disabled={loading}
            className="bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black font-bold font-mono px-4 py-2 rounded transition-colors flex-shrink-0"
          >
            SEND
          </button>
        </div>
      </div>
    </div>
  )
}
