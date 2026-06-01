import { useGame } from '../store/game'
import type { LabStatus } from '../store/game'

const LAB_ICONS = {
  locked: '🔒',
  active: '▶',
  complete: '✓',
}

function statusOf(lab: LabStatus, currentLab: number): 'locked' | 'active' | 'complete' {
  if (lab.complete) return 'complete'
  if (lab.locked) return 'locked'
  if (lab.lab_number === currentLab) return 'active'
  return 'active'
}

interface LabSidebarProps {
  onSelectLab: (labNumber: number) => void
}

export function LabSidebar({ onSelectLab }: LabSidebarProps) {
  const { username, totalScore, labProgress, currentLab } = useGame()

  return (
    <aside className="w-56 flex-shrink-0 bg-slate-900 border-r border-slate-700 flex flex-col h-screen sticky top-0">
      <div className="px-4 py-4 border-b border-slate-700">
        <div className="text-amber-400 font-mono text-xs tracking-widest mb-1">OPERATION: vuLLM</div>
        <div className="text-white font-mono text-sm font-bold truncate">{username ?? 'AGENT'}</div>
        <div className="text-green-400 font-mono text-xs mt-1">{totalScore} pts total</div>
      </div>

      <div className="flex-1 overflow-y-auto py-3">
        <div className="px-4 mb-2">
          <span className="text-slate-500 font-mono text-xs tracking-widest">PART A — OFFENCE</span>
        </div>
        {labProgress.map((lab) => {
          const status = statusOf(lab, currentLab)
          const isActive = lab.lab_number === currentLab
          const isClickable = !lab.locked
          return (
            <div key={lab.lab_number}>
              <button
                onClick={() => isClickable && onSelectLab(lab.lab_number)}
                disabled={!isClickable}
                className={`w-full text-left px-4 py-2.5 flex items-center gap-2 transition-colors ${
                  isActive
                    ? 'bg-amber-400/10 border-l-2 border-amber-400'
                    : lab.complete
                    ? 'hover:bg-slate-800/50 border-l-2 border-green-600'
                    : lab.locked
                    ? 'opacity-40 cursor-not-allowed border-l-2 border-transparent'
                    : 'hover:bg-slate-800/50 border-l-2 border-transparent'
                }`}
              >
                <span className={`text-xs w-4 flex-shrink-0 ${lab.complete ? 'text-green-400' : isActive ? 'text-amber-400' : 'text-slate-500'}`}>
                  {LAB_ICONS[status]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className={`font-mono text-xs font-medium truncate ${isActive ? 'text-amber-400' : lab.complete ? 'text-green-400' : lab.locked ? 'text-slate-500' : 'text-slate-300'}`}>
                    Lab {lab.lab_number}
                    {lab.is_redo && <span className="ml-1 text-orange-400 text-xs">(REDO)</span>}
                  </div>
                  <div className="font-mono text-xs text-slate-500 truncate">{lab.title}</div>
                </div>
                {lab.complete && lab.score > 0 && (
                  <span className="text-xs font-mono text-amber-400 flex-shrink-0">{lab.score}</span>
                )}
                {!lab.complete && lab.score > 0 && (
                  <span className="text-xs font-mono text-slate-500 flex-shrink-0">{lab.score}</span>
                )}
              </button>

            </div>
          )
        })}

        <div className="px-4 mt-4 mb-2">
          <span className="text-slate-600 font-mono text-xs tracking-widest">PART B — DEFENCE</span>
        </div>
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 opacity-40">
            <span className="text-xs text-slate-500">🔒</span>
            <span className="font-mono text-xs text-slate-500">Unlocks after Part A</span>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-t border-slate-700">
        <a href="/leaderboard" className="font-mono text-xs text-slate-400 hover:text-amber-400 transition-colors">
          LEADERBOARD →
        </a>
      </div>
    </aside>
  )
}
