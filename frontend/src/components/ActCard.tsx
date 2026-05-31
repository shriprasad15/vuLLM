import { useState, useEffect } from 'react'

interface ActCardProps {
  act: number
  title: string
  briefing: string
  onBegin: () => void
}

const ACT_COLORS: Record<number, string> = {
  0: 'from-slate-900 to-slate-700',
  1: 'from-red-950 to-slate-900',
  2: 'from-orange-950 to-red-950',
  3: 'from-blue-950 to-slate-900',
  4: 'from-green-950 to-slate-900',
}

export function ActCard({ act, title, briefing, onBegin }: ActCardProps) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    setDisplayed('')
    setDone(false)
    let i = 0
    const interval = setInterval(() => {
      setDisplayed(briefing.slice(0, i))
      i++
      if (i > briefing.length) { clearInterval(interval); setDone(true) }
    }, 18)
    return () => clearInterval(interval)
  }, [briefing])

  return (
    <div className={`min-h-screen bg-gradient-to-br ${ACT_COLORS[act] ?? 'from-slate-900 to-slate-700'} flex items-center justify-center p-8`}>
      <div className="max-w-2xl w-full">
        <div className="text-amber-400 text-sm font-mono tracking-widest mb-2">OPERATION: vuLLM — ACT {act}</div>
        <h1 className="text-white text-4xl font-bold mb-6 font-mono">{title}</h1>
        <div className="bg-black/40 border border-amber-400/30 rounded-lg p-6 mb-8">
          <p className="text-green-400 font-mono text-sm leading-relaxed whitespace-pre-wrap">{displayed}<span className="animate-pulse">_</span></p>
        </div>
        {done && (
          <button onClick={onBegin} className="bg-amber-400 hover:bg-amber-300 text-black font-bold font-mono px-8 py-3 rounded transition-colors">
            INITIATE MISSION →
          </button>
        )}
      </div>
    </div>
  )
}
