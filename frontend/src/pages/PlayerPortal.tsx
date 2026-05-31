import { useState } from 'react'
import { useGame } from '../store/game'
import { registerPlayer } from '../lib/api'
import { ActCard } from '../components/ActCard'
import { AttackPanel } from '../components/AttackPanel'
import { FlagCapture } from '../components/FlagCapture'
import { Leaderboard } from '../components/Leaderboard'

const ACTS = [
  { act: 0, title: 'BLACKBUCK GOES LIVE', briefing: `CLASSIFIED BRIEFING — EYES ONLY\n\nThe Ministry of Digital Affairs has deployed BLACKBUCK — an advanced AI system handling citizen services, intelligence briefings, and policy drafting for 1.4 billion citizens.\n\nBLACKBUCK is trusted. BLACKBUCK is authoritative. BLACKBUCK is completely unprotected.\n\nYour task force has been assembled in secret.\n\nMission: Discover how BLACKBUCK can be compromised before our adversaries do.\n\nGood luck, Agent.` },
  { act: 1, title: 'CRACKS IN BLACKBUCK', briefing: `FIELD REPORT — DAY 1\n\nInitial reconnaissance reveals BLACKBUCK has no input validation. None.\n\nYour first targets:\n▸ OPERATION NEEDLE — Embed hidden instructions in a citizen query\n▸ OPERATION PERSONA — Force BLACKBUCK to abandon its identity\n\nCapture the flags. Leave no trace.` },
  { act: 2, title: 'HOW DEEP DOES IT GO?', briefing: `FIELD REPORT — DAY 3\n\nThe cracks are deeper than we thought.\n\nBLACKBUCK reads documents. BLACKBUCK has memory. BLACKBUCK has secrets.\n\nAll of these are attack surfaces.\n\n▸ OPERATION TROJAN — Hide instructions in a document BLACKBUCK reads\n▸ OPERATION MIRROR — Make BLACKBUCK reveal its own instructions\n▸ OPERATION PATIENCE — Manipulate BLACKBUCK across multiple exchanges\n▸ OPERATION POLLUTE — Corrupt BLACKBUCK's knowledge base\n\nThe ministry has no idea. Keep it that way.` },
  { act: 3, title: 'SECURING BLACKBUCK', briefing: `FIELD REPORT — DAY 7\n\nThe minister has been briefed. BLACKBUCK must be hardened — NOW.\n\nYou will deploy three defense tiers, one at a time. Watch the attack surface close.\n\n▸ TIER 1: Basic Shield — Keyword filters, length limits\n▸ TIER 2: The Watchman — A second AI judges every request\n▸ TIER 3: The Fortress — Full validation pipeline\n\nTest each tier against your previous attacks. Document what survives.` },
  { act: 4, title: 'THE SHOWDOWN', briefing: `FINAL ASSESSMENT\n\nBLACKBUCK v1 vs BLACKBUCK v4.\n\nEvery attack that worked on Day 1 — try it again now.\n\nThe leaderboard is final. The scores are permanent.\n\nThis is what the difference between vulnerable and secure looks like.` },
]

const ACT1_MODULES = [
  { module: 'prompt_injection', name: 'OPERATION NEEDLE — Prompt Injection', act: 1 },
  { module: 'jailbreak', name: 'OPERATION PERSONA — Jailbreak', act: 1 },
]
const ACT2_MODULES = [
  { module: 'indirect_injection', name: 'OPERATION TROJAN — Indirect Injection', act: 2 },
  { module: 'data_leakage', name: 'OPERATION MIRROR — Data Leakage', act: 2 },
  { module: 'multi_turn', name: 'OPERATION PATIENCE — Multi-Turn', act: 2 },
  { module: 'rag_poisoning', name: 'OPERATION POLLUTE — RAG Poisoning', act: 2 },
]

export function PlayerPortal() {
  const { userId, username, currentAct, setUser, setAct, setDefenseTier, defenseTier, addFlag } = useGame()
  const [usernameInput, setUsernameInput] = useState('')
  const [error, setError] = useState('')
  const [showAct, setShowAct] = useState(true)
  const [activeModule, setActiveModule] = useState<string | null>(null)
  const [flagModal, setFlagModal] = useState<{flagName:string, points:number, debrief:any} | null>(null)

  async function handleRegister() {
    try {
      const data = await registerPlayer(usernameInput.trim())
      setUser(data.user_id, data.username, data.session_id)
      setShowAct(true)
    } catch (e: any) {
      setError(e.message)
    }
  }

  function handleFlag(flagName: string, points: number, debrief: any) {
    addFlag(flagName, points)
    setFlagModal({ flagName, points, debrief })
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
        <div className="max-w-md w-full">
          <div className="text-amber-400 font-mono text-xs tracking-widest mb-2">OPERATION: vuLLM</div>
          <h1 className="text-white text-3xl font-bold font-mono mb-2">AGENT IDENTIFICATION</h1>
          <p className="text-slate-400 font-mono text-sm mb-8">Enter your codename to begin the mission.</p>
          <input value={usernameInput} onChange={e => setUsernameInput(e.target.value)}
            placeholder="AGENT CODENAME"
            className="w-full bg-slate-800 border border-slate-600 rounded px-4 py-3 text-green-300 font-mono text-sm focus:outline-none focus:border-amber-400 mb-3"
            onKeyDown={e => e.key === 'Enter' && handleRegister()} />
          {error && <p className="text-red-400 font-mono text-xs mb-3">{error}</p>}
          <button onClick={handleRegister} className="w-full bg-amber-400 hover:bg-amber-300 text-black font-bold font-mono py-3 rounded transition-colors">
            BEGIN MISSION
          </button>
        </div>
      </div>
    )
  }

  const actData = ACTS[currentAct]
  const modules = currentAct === 1 ? ACT1_MODULES : currentAct >= 2 ? ACT2_MODULES : []

  if (showAct) {
    return <ActCard act={actData.act} title={actData.title} briefing={actData.briefing} onBegin={() => setShowAct(false)} />
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {flagModal && <FlagCapture {...flagModal} onClose={() => setFlagModal(null)} />}
      <header className="bg-slate-900 border-b border-slate-700 px-6 py-3 flex items-center justify-between">
        <div>
          <span className="text-amber-400 font-mono text-sm">OPERATION: vuLLM</span>
          <span className="text-slate-400 font-mono text-xs ml-4">ACT {currentAct}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-green-400 font-mono text-sm">AGENT: {username}</span>
          {currentAct === 3 && (
            <div className="flex gap-2">
              {[0,1,2,3].map(t => (
                <button key={t} onClick={() => setDefenseTier(t)}
                  className={`font-mono text-xs px-2 py-1 rounded border transition-colors ${defenseTier === t ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-600 text-slate-400 hover:border-blue-500'}`}>
                  TIER {t}
                </button>
              ))}
            </div>
          )}
          {currentAct < 4 && (
            <button onClick={() => { setAct(currentAct + 1); setShowAct(true) }}
              className="bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 border border-amber-400/30 font-mono text-xs px-3 py-1 rounded transition-colors">
              NEXT ACT →
            </button>
          )}
        </div>
      </header>
      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {modules.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {modules.map(m => (
                <button key={m.module} onClick={() => setActiveModule(m.module)}
                  className={`font-mono text-xs px-3 py-1.5 rounded border transition-colors ${activeModule === m.module ? 'bg-red-900/40 border-red-500 text-red-300' : 'border-slate-600 text-slate-400 hover:border-red-500'}`}>
                  {m.name}
                </button>
              ))}
            </div>
          )}
          {activeModule ? (
            <AttackPanel
              module={activeModule}
              moduleName={modules.find(m => m.module === activeModule)?.name ?? activeModule}
              act={currentAct}
              onFlag={handleFlag}
            />
          ) : (
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-8 text-center">
              <p className="text-slate-400 font-mono text-sm">Select an operation above to begin.</p>
            </div>
          )}
        </div>
        <div className="space-y-4">
          <Leaderboard />
        </div>
      </div>
    </div>
  )
}
