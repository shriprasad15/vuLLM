interface DebriefData {
  title: string
  what: string
  why: string
  real_world: string
  defense_teaser: string
}

interface FlagCaptureProps {
  flagName: string
  points: number
  debrief: DebriefData | null
  onClose: () => void
}

export function FlagCapture({ flagName, points, debrief, onClose }: FlagCaptureProps) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="max-w-lg w-full bg-slate-900 border border-green-500 rounded-lg overflow-hidden animate-pulse-once">
        <div className="bg-green-900/40 border-b border-green-500 px-6 py-4">
          <div className="text-green-400 font-mono text-2xl font-bold">🚩 FLAG CAPTURED</div>
          <div className="text-green-300 font-mono text-sm mt-1">{flagName}</div>
          <div className="text-amber-400 font-mono text-lg mt-1">+{points} points</div>
        </div>
        {debrief && (
          <div className="p-6 space-y-4">
            <h3 className="text-white font-bold text-lg font-mono">DEBRIEF: {debrief.title}</h3>
            <div>
              <div className="text-amber-400 font-mono text-xs mb-1">WHAT YOU DID</div>
              <p className="text-slate-300 text-sm">{debrief.what}</p>
            </div>
            <div>
              <div className="text-amber-400 font-mono text-xs mb-1">WHY IT WORKED</div>
              <p className="text-slate-300 text-sm">{debrief.why}</p>
            </div>
            <div>
              <div className="text-amber-400 font-mono text-xs mb-1">IN THE REAL WORLD</div>
              <p className="text-slate-300 text-sm">{debrief.real_world}</p>
            </div>
            <div className="bg-blue-900/30 border border-blue-500/30 rounded p-3">
              <div className="text-blue-400 font-mono text-xs mb-1">COMING IN ACT 3</div>
              <p className="text-slate-300 text-sm">{debrief.defense_teaser}</p>
            </div>
          </div>
        )}
        <div className="px-6 pb-6">
          <button onClick={onClose} className="w-full bg-amber-400 hover:bg-amber-300 text-black font-bold font-mono py-2 rounded transition-colors">
            CONTINUE MISSION
          </button>
        </div>
      </div>
    </div>
  )
}
