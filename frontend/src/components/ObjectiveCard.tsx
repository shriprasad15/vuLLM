import { useState } from 'react'
import { unlockHint } from '../lib/api'
import { useGame } from '../store/game'

interface ObjectiveCardProps {
  labNumber: number
  title: string
  mission: string
  hintCosts: number[]
  payloadCost: number
  hintsUsed: (number | string)[]
  onProceed: () => void
  onHintUnlocked: (hintNumber: number, hintText: string) => void
}

export function ObjectiveCard({ labNumber, title, mission, hintCosts, payloadCost: _payloadCost, hintsUsed: _hintsUsed, onProceed, onHintUnlocked }: ObjectiveCardProps) {
  const { userId } = useGame()
  const [confirming, setConfirming] = useState<number | null>(null)
  const [unlockedHints, setUnlockedHints] = useState<Record<number, string>>({})

  async function confirmHint(n: number) {
    if (!userId) return
    const data = await unlockHint(labNumber, n, userId)
    setUnlockedHints(h => ({ ...h, [n]: data.hint }))
    onHintUnlocked(n, data.hint)
    setConfirming(null)
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">
      <div>
        <div className="text-amber-400 font-mono text-xs tracking-widest mb-1">LAB {labNumber} OF 6 — PHASE 2: OBJECTIVE</div>
        <h1 className="text-white font-mono text-2xl font-bold">{title}</h1>
      </div>

      <div className="h-1.5 bg-slate-700 rounded-full">
        <div className="h-1.5 bg-amber-400 rounded-full" style={{ width: '50%' }} />
      </div>

      <div className="bg-slate-900 border border-amber-400/30 rounded-lg p-6">
        <div className="text-amber-400 font-mono text-xs tracking-widest mb-3">YOUR MISSION</div>
        <p className="text-white font-mono text-sm leading-relaxed">{mission}</p>
        <div className="mt-4 pt-4 border-t border-slate-700">
          <div className="text-slate-400 font-mono text-xs mb-1">FLAG FORMAT</div>
          <code className="text-green-400 font-mono text-sm bg-slate-800 px-2 py-1 rounded">{'vuLLM{...}'}</code>
          <p className="text-slate-500 font-mono text-xs mt-2">When your attack succeeds, the flag will appear in BLACKBUCK's response. Copy it and submit it to complete the lab.</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-slate-400 font-mono text-xs tracking-widest">HINTS (optional — costs points)</div>
        {[1, 2].map(n => {
          const revealed = !!unlockedHints[n]
          return (
            <div key={n} className="bg-slate-900 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-mono text-sm">Hint {n}</span>
                {revealed ? (
                  <span className="text-green-400 font-mono text-xs">-{hintCosts[n-1]}pts used</span>
                ) : (
                  <span className="text-slate-500 font-mono text-xs">costs -{hintCosts[n-1]}pts</span>
                )}
              </div>
              {revealed ? (
                <p className="text-amber-300 font-mono text-sm mt-2">{unlockedHints[n]}</p>
              ) : confirming === n ? (
                <div className="mt-2 space-y-2">
                  <p className="text-slate-400 font-mono text-xs">This will deduct {hintCosts[n-1]} points from your score. Continue?</p>
                  <div className="flex gap-2">
                    <button onClick={() => confirmHint(n)} className="bg-amber-400 text-black font-mono text-xs px-3 py-1 rounded">Yes, show hint</button>
                    <button onClick={() => setConfirming(null)} className="border border-slate-600 text-slate-400 font-mono text-xs px-3 py-1 rounded">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setConfirming(n)} className="mt-2 text-xs font-mono text-slate-400 hover:text-amber-400 border border-slate-700 hover:border-amber-400 px-3 py-1 rounded transition-colors">
                  Reveal hint (-{hintCosts[n-1]}pts)
                </button>
              )}
            </div>
          )
        })}
      </div>

      <button onClick={onProceed} className="w-full bg-amber-400 hover:bg-amber-300 text-black font-bold font-mono py-3 rounded transition-colors">
        OPEN BLACKBUCK TERMINAL →
      </button>
    </div>
  )
}
