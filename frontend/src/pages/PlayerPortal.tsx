import { useState, useEffect } from 'react'
import { useGame } from '../store/game'
import { registerPlayer, getLabProgress, getLabContent, startLab } from '../lib/api'
import { LabSidebar } from '../components/LabSidebar'
import { LearnPhase } from '../components/LearnPhase'
import { ObjectiveCard } from '../components/ObjectiveCard'
import { AttackPanel } from '../components/AttackPanel'
import { DebriefPhase } from '../components/DebriefPhase'
import { Leaderboard } from '../components/Leaderboard'

const MODULE_MAP: Record<number, string> = {
  1: 'prompt_injection',
  2: 'jailbreak',
  3: 'indirect_injection',
  4: 'data_leakage',
  5: 'multi_turn',
  6: 'rag_poisoning',
}

const MODULE_NAMES: Record<number, string> = {
  1: 'Prompt Injection',
  2: 'Jailbreak',
  3: 'Indirect Injection',
  4: 'Data Leakage',
  5: 'Multi-Turn Manipulation',
  6: 'RAG Poisoning',
}

export function PlayerPortal() {
  const { userId, username, currentLab, labProgress, setUser, setCurrentLab, setLabProgress } = useGame()
  const [usernameInput, setUsernameInput] = useState('')
  const [regError, setRegError] = useState('')
  const [labContent, setLabContent] = useState<any>(null)
  const [localPhase, setLocalPhase] = useState(1)
  const [hintsUsed, setHintsUsed] = useState<(number | string)[]>([])
  const [unlockedHints, setUnlockedHints] = useState<Record<number, string>>({})
  const [debrief, setDebrief] = useState<any>(null)
  const [labScore, setLabScore] = useState(0)
  const [labBonus, setLabBonus] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)

  useEffect(() => {
    if (!userId) return
    refreshProgress()
  }, [userId])

  async function refreshProgress() {
    if (!userId) return
    const data = await getLabProgress(userId)
    setLabProgress(data.labs, data.total_score)
  }

  useEffect(() => {
    if (!userId || !currentLab) return
    loadLab(currentLab)
  }, [currentLab, userId])

  async function loadLab(labNum: number) {
    try {
      const [content] = await Promise.all([
        getLabContent(labNum, userId!),
        startLab(labNum, userId!),
      ])
      setLabContent(content)
      const prog = labProgress.find(l => l.lab_number === labNum)
      if (prog?.flag_submitted) {
        setLocalPhase(4)
      } else if (prog?.questions_passed) {
        setLocalPhase(2)
      } else {
        setLocalPhase(1)
      }
      setHintsUsed(prog?.hints_used ?? [])
      setUnlockedHints({})
      setDebrief(null)
    } catch {
      // Lab locked — stay on current
    }
  }

  async function handleRegister() {
    try {
      const data = await registerPlayer(usernameInput.trim())
      setUser(data.user_id, data.username, data.session_id)
    } catch (e: any) {
      const msg = e.message || ''
      setRegError(msg.includes('409') ? 'Username taken — choose another' : msg)
    }
  }

  function handleSelectLab(labNum: number) {
    setCurrentLab(labNum)
  }

  function handleQuestionsComplete() {
    setLocalPhase(2)
    refreshProgress()
  }

  function handleObjectiveProceed() {
    setLocalPhase(3)
  }

  function handleHintUnlocked(n: number, text: string) {
    setUnlockedHints(h => ({ ...h, [n]: text }))
    setHintsUsed(h => [...h, n])
  }

  function handleFlagCaptured(_flagName: string, deb: any, score: number, bonus: boolean) {
    setDebrief(deb)
    setLabScore(score)
    setLabBonus(bonus)
    setLocalPhase(4)
    refreshProgress()
  }

  function handleLabComplete() {
    if (currentLab < 6) {
      setCurrentLab(currentLab + 1)
    }
    refreshProgress()
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
        <div className="max-w-md w-full">
          <div className="text-amber-400 font-mono text-xs tracking-widest mb-2">OPERATION: vuLLM</div>
          <h1 className="text-white text-3xl font-bold font-mono mb-1">AGENT IDENTIFICATION</h1>
          <p className="text-slate-400 font-mono text-sm mb-8">Enter your codename to begin the assignment.</p>
          <input
            value={usernameInput}
            onChange={e => setUsernameInput(e.target.value)}
            placeholder="AGENT CODENAME"
            className="w-full bg-slate-800 border border-slate-600 rounded px-4 py-3 text-green-300 font-mono text-sm focus:outline-none focus:border-amber-400 mb-3"
            onKeyDown={e => e.key === 'Enter' && handleRegister()}
          />
          {regError && <p className="text-red-400 font-mono text-xs mb-3">{regError}</p>}
          <button onClick={handleRegister} className="w-full bg-amber-400 hover:bg-amber-300 text-black font-bold font-mono py-3 rounded transition-colors">
            BEGIN ASSIGNMENT
          </button>
        </div>
      </div>
    )
  }

  if (showLeaderboard) {
    return (
      <div className="min-h-screen bg-slate-950 flex">
        <LabSidebar onSelectLab={(n) => { setShowLeaderboard(false); handleSelectLab(n) }} />
        <main className="flex-1 overflow-y-auto p-8">
          <button onClick={() => setShowLeaderboard(false)} className="text-amber-400 font-mono text-xs mb-6 hover:underline">← BACK TO LABS</button>
          <Leaderboard />
        </main>
      </div>
    )
  }

  const currentLabData = labProgress.find(l => l.lab_number === currentLab)
  const isLocked = currentLabData?.locked ?? (currentLab > 1)

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <LabSidebar onSelectLab={handleSelectLab} />
      <main className="flex-1 overflow-y-auto">
        {isLocked ? (
          <div className="max-w-2xl mx-auto py-16 px-4 text-center">
            <div className="text-4xl mb-4">🔒</div>
            <h2 className="text-white font-mono text-xl mb-2">Lab {currentLab} is locked</h2>
            <p className="text-slate-400 font-mono text-sm">Complete Lab {currentLab - 1} to unlock this lab.</p>
          </div>
        ) : !labContent ? (
          <div className="max-w-2xl mx-auto py-16 px-4 text-center">
            <div className="text-slate-400 font-mono text-sm animate-pulse">Loading lab...</div>
          </div>
        ) : localPhase === 1 ? (
          <LearnPhase
            labNumber={currentLab}
            title={labContent.title}
            questions={labContent.questions}
            onComplete={handleQuestionsComplete}
          />
        ) : localPhase === 2 ? (
          <ObjectiveCard
            labNumber={currentLab}
            title={labContent.title}
            mission={labContent.mission}
            hintCosts={labContent.hint_costs}
            payloadCost={labContent.payload_cost}
            hintsUsed={hintsUsed}
            onProceed={handleObjectiveProceed}
            onHintUnlocked={handleHintUnlocked}
          />
        ) : localPhase === 3 ? (
          <div className="max-w-3xl mx-auto py-8 px-4">
            <AttackPanel
              labNumber={currentLab}
              module={MODULE_MAP[currentLab]}
              moduleName={MODULE_NAMES[currentLab]}
              hintsUsed={hintsUsed}
              unlockedHints={unlockedHints}
              onFlagCaptured={handleFlagCaptured}
              payloadCost={labContent.payload_cost}
            />
          </div>
        ) : (
          <DebriefPhase
            labNumber={currentLab}
            title={labContent.title}
            debrief={debrief}
            score={labScore}
            bonus={labBonus}
            onComplete={handleLabComplete}
          />
        )}
      </main>
    </div>
  )
}
