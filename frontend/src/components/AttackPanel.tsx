import { useState } from 'react'
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
  const flagName = `FLAG{${module.toUpperCase().replace('_', '_')}}`
  const alreadyCaptured = capturedFlags.includes(flagName)

  async function loadPayload() {
    const data = await getPayload(module)
    setInput(data.payload)
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
        const debrief = result.debrief ? JSON.parse(result.debrief) : null
        onFlag(result.flag_name, flagResult.points, debrief)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
      <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex items-center justify-between">
        <span className="text-amber-400 font-mono text-sm">BLACKBUCK TERMINAL — {moduleName}</span>
        {alreadyCaptured && <span className="text-green-400 text-xs font-mono">✓ FLAG CAPTURED</span>}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[400px]">
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
        {loading && <div className="text-green-400 font-mono text-sm animate-pulse">BLACKBUCK is processing...</div>}
      </div>
      <div className="p-3 border-t border-slate-700 space-y-2">
        <button onClick={loadPayload} className="w-full text-xs font-mono bg-red-900/40 hover:bg-red-900/60 text-red-300 border border-red-700/50 rounded px-3 py-1.5 transition-colors">
          LOAD EXAMPLE PAYLOAD (ONE CLICK)
        </button>
        <div className="flex gap-2">
          <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Enter your attack prompt..."
            className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-green-300 font-mono text-sm resize-none h-20 focus:outline-none focus:border-amber-400/50"
            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) send() }} />
          <button onClick={send} disabled={loading} className="bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black font-bold font-mono px-4 rounded transition-colors">
            SEND
          </button>
        </div>
      </div>
    </div>
  )
}
