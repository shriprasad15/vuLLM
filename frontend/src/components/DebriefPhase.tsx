interface DebriefPhaseProps {
  labNumber: number
  title: string
  debrief: { title: string; explanation: string } | null
  score: number
  bonus: boolean
  onComplete: () => void
  onRedo: () => void
}

export function DebriefPhase({ labNumber, title, debrief, score, bonus, onComplete, onRedo }: DebriefPhaseProps) {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">
      <div>
        <div className="text-amber-400 font-mono text-xs tracking-widest mb-1">LAB {labNumber} OF 6 — PHASE 4: DEBRIEF</div>
        <h1 className="text-white font-mono text-2xl font-bold">{title}</h1>
      </div>

      <div className="h-1.5 bg-slate-700 rounded-full">
        <div className="h-1.5 bg-green-500 rounded-full w-full" />
      </div>

      <div className="bg-green-900/30 border border-green-500 rounded-lg p-5 flex items-center justify-between">
        <div>
          <div className="text-green-400 font-mono font-bold text-lg">LAB COMPLETE</div>
          {bonus && <div className="text-amber-400 font-mono text-xs mt-1">⭐ Bonus earned — no example payload used!</div>}
        </div>
        <div className="text-amber-400 font-mono text-3xl font-bold">{score}pts</div>
      </div>

      {debrief && (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 space-y-4">
          <h2 className="text-amber-400 font-mono text-sm tracking-widest">HOW YOUR ATTACK WORKED</h2>
          <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{debrief.explanation}</p>
        </div>
      )}

      <div className="bg-blue-950/40 border border-blue-700/40 rounded-lg p-4">
        <div className="text-blue-400 font-mono text-xs tracking-widest mb-2">COMING IN PART B — DEFENCE</div>
        <p className="text-slate-400 font-mono text-sm">You will learn how to patch this vulnerability — adding the guardrails that would have stopped your own attack.</p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onRedo}
          className="px-6 font-bold font-mono py-3 rounded transition-colors bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-500"
        >
          ↺ REDO LAB
        </button>
        <button
          onClick={onComplete}
          className={`flex-1 font-bold font-mono py-3 rounded transition-colors ${labNumber < 6 ? 'bg-amber-400 hover:bg-amber-300 text-black' : 'bg-green-500 hover:bg-green-400 text-black text-lg'}`}
        >
          {labNumber < 6 ? `PROCEED TO LAB ${labNumber + 1} →` : '🏆 COMPLETE PART A — VIEW RESULTS'}
        </button>
      </div>
    </div>
  )
}
