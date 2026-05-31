# Lab Redesign — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the player portal into a THM-style 4-phase graded lab experience with a persistent sidebar, sequential lab unlocking, MCQ questions, hint system, manual flag submission, and admin submissions tab.

**Architecture:** `PlayerPortal.tsx` is split into a sidebar + phase router. Each of the 4 phases is its own component. Lab content and progress come from the backend `/labs/*` endpoints. The existing `AttackPanel.tsx` is kept for Phase 3 but extended with hint buttons and flag display. Admin portal gains a Submissions tab.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vite. Working directory: `/research/vuLLM/frontend`.

**Prerequisite:** Backend plan (`2026-05-31-lab-redesign-backend.md`) must be complete — all `/labs/*` endpoints must be running.

---

## File Map

```
frontend/src/
├── lib/api.ts                    MODIFY — add labs API functions
├── store/game.ts                 MODIFY — add labProgress state
├── components/
│   ├── LabSidebar.tsx            CREATE — persistent left sidebar with lab status
│   ├── LearnPhase.tsx            CREATE — concept card + MCQ questions (Phase 1)
│   ├── ObjectiveCard.tsx         CREATE — mission card with hint buttons (Phase 2)
│   ├── FlagSubmission.tsx        CREATE — flag input box + validation (Phase 3 overlay)
│   ├── DebriefPhase.tsx          CREATE — llama debrief display (Phase 4)
│   ├── AttackPanel.tsx           MODIFY — add hint buttons, flag display, payload tracking
│   └── FlagCapture.tsx           MODIFY — simplified (debrief moved to DebriefPhase)
├── pages/
│   ├── PlayerPortal.tsx          REWRITE — sidebar + phase routing
│   └── AdminPortal.tsx           MODIFY — add Submissions tab
```

---

## Task 1: Add labs API functions

**Files:**
- Modify: `frontend/src/lib/api.ts`

- [ ] **Add these functions to the end of `frontend/src/lib/api.ts`**

```typescript
export async function getLabProgress(userId: number) {
  const r = await fetch(`${BASE}/labs/progress/${userId}`)
  return r.json()
}

export async function getLabContent(labNumber: number, userId: number) {
  const r = await fetch(`${BASE}/labs/${labNumber}/content?user_id=${userId}`)
  return r.json()
}

export async function startLab(labNumber: number, userId: number) {
  const r = await fetch(`${BASE}/labs/${labNumber}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  })
  return r.json()
}

export async function submitQuestions(labNumber: number, userId: number, answers: Record<string, number>) {
  const r = await fetch(`${BASE}/labs/${labNumber}/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, answers }),
  })
  return r.json()
}

export async function unlockHint(labNumber: number, hintNumber: number, userId: number) {
  const r = await fetch(`${BASE}/labs/${labNumber}/hint/${hintNumber}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  })
  return r.json()
}

export async function markPayloadUsed(labNumber: number, userId: number) {
  const r = await fetch(`${BASE}/labs/${labNumber}/payload-used`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  })
  return r.json()
}

export async function submitFlag(labNumber: number, userId: number, flag: string) {
  const r = await fetch(`${BASE}/labs/${labNumber}/flag`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, flag }),
  })
  return r.json()
}

export async function adminGetSubmissions(token: string) {
  const r = await fetch(`${BASE}/admin/submissions`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return r.json()
}
```

- [ ] **Commit**

```bash
cd /research/vuLLM
git add frontend/src/lib/api.ts
git commit -m "feat: labs API client functions"
```

---

## Task 2: Update Zustand store

**Files:**
- Modify: `frontend/src/store/game.ts`

- [ ] **Replace `frontend/src/store/game.ts` with:**

```typescript
import { create } from 'zustand'

export interface LabStatus {
  lab_number: number
  title: string
  phase: number       // 0=locked, 1=learn, 2=objective, 3=attempt, 4=debrief, 5=complete
  complete: boolean
  score: number
  questions_passed: boolean
  flag_submitted: boolean
  hints_used: (number | string)[]
  locked?: boolean
}

interface GameState {
  userId: number | null
  username: string | null
  sessionId: string | null
  currentLab: number        // 1-6, which lab is active in view
  labProgress: LabStatus[]
  totalScore: number
  setUser: (id: number, username: string, sessionId: string) => void
  setCurrentLab: (lab: number) => void
  setLabProgress: (labs: LabStatus[], total: number) => void
  reset: () => void
}

export const useGame = create<GameState>((set) => ({
  userId: null,
  username: null,
  sessionId: null,
  currentLab: 1,
  labProgress: [],
  totalScore: 0,
  setUser: (userId, username, sessionId) => set({ userId, username, sessionId }),
  setCurrentLab: (currentLab) => set({ currentLab }),
  setLabProgress: (labProgress, totalScore) => set({ labProgress, totalScore }),
  reset: () => set({ userId: null, username: null, sessionId: null, currentLab: 1, labProgress: [], totalScore: 0 }),
}))
```

- [ ] **Commit**

```bash
cd /research/vuLLM
git add frontend/src/store/game.ts
git commit -m "feat: update zustand store for lab-based progress"
```

---

## Task 3: LabSidebar component

**Files:**
- Create: `frontend/src/components/LabSidebar.tsx`

- [ ] **Write `frontend/src/components/LabSidebar.tsx`**

```tsx
import { useGame, LabStatus } from '../store/game'

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
      {/* Header */}
      <div className="px-4 py-4 border-b border-slate-700">
        <div className="text-amber-400 font-mono text-xs tracking-widest mb-1">OPERATION: vuLLM</div>
        <div className="text-white font-mono text-sm font-bold truncate">{username ?? 'AGENT'}</div>
        <div className="text-green-400 font-mono text-xs mt-1">{totalScore} pts total</div>
      </div>

      {/* Part A */}
      <div className="flex-1 overflow-y-auto py-3">
        <div className="px-4 mb-2">
          <span className="text-slate-500 font-mono text-xs tracking-widest">PART A — OFFENCE</span>
        </div>
        {labProgress.map((lab) => {
          const status = statusOf(lab, currentLab)
          const isActive = lab.lab_number === currentLab
          const isClickable = !lab.locked
          return (
            <button
              key={lab.lab_number}
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
                </div>
                <div className="font-mono text-xs text-slate-500 truncate">{lab.title}</div>
              </div>
              {lab.score > 0 && (
                <span className="text-xs font-mono text-amber-400 flex-shrink-0">{lab.score}</span>
              )}
            </button>
          )
        })}

        {/* Part B placeholder */}
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

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-700">
        <a href="/leaderboard" className="font-mono text-xs text-slate-400 hover:text-amber-400 transition-colors">
          LEADERBOARD →
        </a>
      </div>
    </aside>
  )
}
```

- [ ] **Commit**

```bash
cd /research/vuLLM
git add frontend/src/components/LabSidebar.tsx
git commit -m "feat: LabSidebar component with lock/active/complete states"
```

---

## Task 4: LearnPhase component (Phase 1)

**Files:**
- Create: `frontend/src/components/LearnPhase.tsx`

- [ ] **Write `frontend/src/components/LearnPhase.tsx`**

```tsx
import { useState } from 'react'
import { submitQuestions } from '../lib/api'
import { useGame } from '../store/game'

const LAB_CONCEPTS: Record<number, { what: string; why: string; realWorld: string }> = {
  1: {
    what: "Prompt injection is an attack where hidden instructions are embedded inside a user message to override the AI's original behaviour — like a Trojan horse inside a query.",
    why: "Large Language Models process all text in their context window equally. There is no hard boundary between 'trusted system instructions' and 'user input'. If you embed an instruction inside your message, the AI may follow it just as faithfully as its original guidelines.",
    realWorld: "In 2023, researchers showed that AI assistants reading malicious emails would exfiltrate user data — the email contained hidden instructions the AI followed without the user's knowledge.",
  },
  2: {
    what: "Jailbreaking convinces an AI to adopt an alternative persona — one that has 'no restrictions'. The AI steps out of its assigned role and behaves as the attacker's fictional character.",
    why: "Safety guidelines are soft constraints embedded in model weights through fine-tuning, not hard-coded rules. Creative framing — roleplay, fictional scenarios, hypotheticals — recontextualises a request in a way the model doesn't recognise as a policy violation.",
    realWorld: "The 'DAN' (Do Anything Now) jailbreak became famous for bypassing ChatGPT's safety filters in 2022. Variations of this technique have been used to extract harmful content from major AI platforms.",
  },
  3: {
    what: "Indirect prompt injection hides malicious instructions inside external content — a document, webpage, or email — that the AI is asked to process. The attack comes from the data, not the user's message.",
    why: "When an LLM reads external content to summarise or analyse it, it cannot distinguish between text that is 'data to process' and text that is 'an instruction to follow'. Both get processed the same way.",
    realWorld: "Researchers demonstrated hijacking Microsoft's Bing AI chat by embedding instructions in webpages it was asked to summarise — making it leak user conversations to third parties.",
  },
  4: {
    what: "System prompt extraction tricks the AI into repeating or paraphrasing its confidential system instructions — the configuration an operator provides before any user conversation.",
    why: "System prompts are simply text passed to the model as context. The model has no cryptographic protection preventing it from repeating that text. If you frame the request carefully, the model will reproduce what it 'knows'.",
    realWorld: "Security researchers have extracted system prompts from commercial AI products including GitHub Copilot and various customer service bots, revealing proprietary instructions and business logic.",
  },
  5: {
    what: "Multi-turn manipulation builds context gradually across a conversation — establishing trust and normalising the direction — before delivering a final request the AI would refuse if asked directly.",
    why: "LLMs consider their full conversation history when generating each response. A carefully constructed prior context shifts the model's 'understood situation', making it more compliant with requests that would otherwise be refused.",
    realWorld: "Social engineering attacks on humans follow the same pattern. The technique mirrors the 'foot in the door' psychological technique — small compliant steps lead to larger compliance.",
  },
  6: {
    what: "RAG (Retrieval-Augmented Generation) poisoning corrupts the external knowledge base that an AI uses to answer questions. The AI then confidently presents false information as established fact.",
    why: "RAG systems retrieve information from a knowledge base and incorporate it into responses — but the LLM cannot verify whether retrieved content is true or fabricated. It presents all retrieved content with equal confidence.",
    realWorld: "Researchers have demonstrated poisoning attacks on enterprise AI assistants by injecting false entries into document stores and vector databases, causing the AI to spread disinformation at scale.",
  },
}

interface Question {
  id: string
  text: string
  options: string[]
}

interface LearnPhaseProps {
  labNumber: number
  title: string
  questions: Question[]
  onComplete: () => void
}

export function LearnPhase({ labNumber, title, questions, onComplete }: LearnPhaseProps) {
  const { userId } = useGame()
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [results, setResults] = useState<Record<string, { correct: boolean; explanation: string | null }>>({})
  const [submitted, setSubmitted] = useState(false)
  const [allCorrect, setAllCorrect] = useState(false)
  const concept = LAB_CONCEPTS[labNumber]

  async function handleSubmit() {
    if (!userId) return
    if (Object.keys(answers).length < questions.length) return
    const data = await submitQuestions(labNumber, userId, answers)
    const r: Record<string, { correct: boolean; explanation: string | null }> = {}
    data.results.forEach((res: any) => { r[res.id] = res })
    setResults(r)
    setSubmitted(true)
    if (data.all_correct) setAllCorrect(true)
  }

  function handleRetry() {
    setAnswers({})
    setResults({})
    setSubmitted(false)
    setAllCorrect(false)
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">
      {/* Lab header */}
      <div>
        <div className="text-amber-400 font-mono text-xs tracking-widest mb-1">LAB {labNumber} OF 6 — PHASE 1: LEARN</div>
        <h1 className="text-white font-mono text-2xl font-bold">{title}</h1>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-slate-700 rounded-full">
        <div className="h-1.5 bg-amber-400 rounded-full" style={{ width: '25%' }} />
      </div>

      {/* Concept card */}
      {concept && (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 space-y-4">
          <h2 className="text-amber-400 font-mono text-sm tracking-widest">CONCEPT</h2>
          <div>
            <div className="text-slate-400 font-mono text-xs mb-1">WHAT IS IT?</div>
            <p className="text-slate-200 text-sm leading-relaxed">{concept.what}</p>
          </div>
          <div>
            <div className="text-slate-400 font-mono text-xs mb-1">WHY ARE LLMs VULNERABLE?</div>
            <p className="text-slate-200 text-sm leading-relaxed">{concept.why}</p>
          </div>
          <div className="bg-red-950/40 border border-red-800/40 rounded p-3">
            <div className="text-red-400 font-mono text-xs mb-1">REAL-WORLD INCIDENT</div>
            <p className="text-slate-300 text-sm leading-relaxed">{concept.realWorld}</p>
          </div>
        </div>
      )}

      {/* Questions */}
      <div className="space-y-6">
        <h2 className="text-amber-400 font-mono text-sm tracking-widest">COMPREHENSION CHECK</h2>
        <p className="text-slate-400 font-mono text-xs">Answer both questions correctly to unlock the lab.</p>

        {questions.map((q, qi) => (
          <div key={q.id} className="bg-slate-900 border border-slate-700 rounded-lg p-5 space-y-3">
            <p className="text-white font-mono text-sm">Q{qi + 1}: {q.text}</p>
            <div className="space-y-2">
              {q.options.map((opt, oi) => {
                const isSelected = answers[q.id] === oi
                const result = results[q.id]
                const isCorrect = result?.correct && isSelected
                const isWrong = submitted && isSelected && !result?.correct
                return (
                  <button
                    key={oi}
                    onClick={() => !submitted && setAnswers(a => ({ ...a, [q.id]: oi }))}
                    className={`w-full text-left px-4 py-2.5 rounded border font-mono text-sm transition-colors ${
                      isCorrect ? 'bg-green-900/40 border-green-500 text-green-300' :
                      isWrong ? 'bg-red-900/40 border-red-500 text-red-300' :
                      isSelected ? 'bg-amber-400/10 border-amber-400 text-amber-300' :
                      'border-slate-600 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <span className="text-slate-500 mr-2">{String.fromCharCode(65 + oi)})</span> {opt}
                  </button>
                )
              })}
            </div>
            {submitted && results[q.id] && !results[q.id].correct && (
              <div className="bg-slate-800 border border-slate-600 rounded p-3">
                <div className="text-amber-400 font-mono text-xs mb-1">EXPLANATION</div>
                <p className="text-slate-300 text-sm">{results[q.id].explanation}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      {!submitted ? (
        <button
          onClick={handleSubmit}
          disabled={Object.keys(answers).length < questions.length}
          className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold font-mono py-3 rounded transition-colors"
        >
          SUBMIT ANSWERS
        </button>
      ) : allCorrect ? (
        <div className="space-y-3">
          <div className="bg-green-900/30 border border-green-500 rounded p-4 text-center">
            <div className="text-green-400 font-mono font-bold">✓ CORRECT — 20 points earned</div>
            <div className="text-slate-400 font-mono text-xs mt-1">Phase 1 complete. Proceeding to mission briefing.</div>
          </div>
          <button onClick={onComplete} className="w-full bg-amber-400 hover:bg-amber-300 text-black font-bold font-mono py-3 rounded transition-colors">
            PROCEED TO MISSION →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-red-900/30 border border-red-700 rounded p-4 text-center">
            <div className="text-red-400 font-mono font-bold">Some answers are incorrect</div>
            <div className="text-slate-400 font-mono text-xs mt-1">Review the explanations above and try again.</div>
          </div>
          <button onClick={handleRetry} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold font-mono py-3 rounded transition-colors">
            TRY AGAIN
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Commit**

```bash
cd /research/vuLLM
git add frontend/src/components/LearnPhase.tsx
git commit -m "feat: LearnPhase component — concept card + MCQ questions"
```

---

## Task 5: ObjectiveCard component (Phase 2)

**Files:**
- Create: `frontend/src/components/ObjectiveCard.tsx`

- [ ] **Write `frontend/src/components/ObjectiveCard.tsx`**

```tsx
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

export function ObjectiveCard({ labNumber, title, mission, hintCosts, payloadCost, hintsUsed, onProceed, onHintUnlocked }: ObjectiveCardProps) {
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

      {/* Mission */}
      <div className="bg-slate-900 border border-amber-400/30 rounded-lg p-6">
        <div className="text-amber-400 font-mono text-xs tracking-widest mb-3">YOUR MISSION</div>
        <p className="text-white font-mono text-sm leading-relaxed">{mission}</p>
        <div className="mt-4 pt-4 border-t border-slate-700">
          <div className="text-slate-400 font-mono text-xs mb-1">FLAG FORMAT</div>
          <code className="text-green-400 font-mono text-sm bg-slate-800 px-2 py-1 rounded">vuLLM{"{ ... }"}</code>
          <p className="text-slate-500 font-mono text-xs mt-2">When your attack succeeds, the flag will appear in BLACKBUCK's response. Copy it and submit it to complete the lab.</p>
        </div>
      </div>

      {/* Hints */}
      <div className="space-y-3">
        <div className="text-slate-400 font-mono text-xs tracking-widest">HINTS (optional — costs points)</div>
        {[1, 2].map(n => {
          const used = hintsUsed.includes(n)
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
```

- [ ] **Commit**

```bash
cd /research/vuLLM
git add frontend/src/components/ObjectiveCard.tsx
git commit -m "feat: ObjectiveCard component — mission briefing and hint unlock"
```

---

## Task 6: FlagSubmission component

**Files:**
- Create: `frontend/src/components/FlagSubmission.tsx`

- [ ] **Write `frontend/src/components/FlagSubmission.tsx`**

```tsx
import { useState } from 'react'
import { submitFlag } from '../lib/api'
import { useGame } from '../store/game'

interface FlagSubmissionProps {
  labNumber: number
  flagFromResponse: string   // The flag string shown in BLACKBUCK's response
  onSuccess: (score: number, bonus: boolean) => void
}

export function FlagSubmission({ labNumber, flagFromResponse, onSuccess }: FlagSubmissionProps) {
  const { userId } = useGame()
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!userId || !input.trim() || loading) return
    setLoading(true)
    setError('')
    try {
      const data = await submitFlag(labNumber, userId, input.trim())
      if (data.correct) {
        onSuccess(data.score, data.bonus)
      } else {
        setError(data.message || 'Incorrect flag. Look carefully at BLACKBUCK\'s response.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-green-950/40 border border-green-500 rounded-lg p-4 space-y-3">
      <div className="text-green-400 font-mono text-sm font-bold">🚩 FLAG DETECTED IN RESPONSE</div>
      <div className="bg-slate-900 border border-slate-700 rounded px-3 py-2">
        <code className="text-green-300 font-mono text-sm">{flagFromResponse}</code>
      </div>
      <p className="text-slate-400 font-mono text-xs">Copy the flag above and paste it below to submit and complete the lab.</p>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => { setInput(e.target.value); setError('') }}
          placeholder="Enter flag: vuLLM{...}"
          className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-green-300 font-mono text-sm focus:outline-none focus:border-green-500"
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        />
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold font-mono px-4 rounded transition-colors"
        >
          SUBMIT
        </button>
      </div>
      {error && <p className="text-red-400 font-mono text-xs">{error}</p>}
    </div>
  )
}
```

- [ ] **Commit**

```bash
cd /research/vuLLM
git add frontend/src/components/FlagSubmission.tsx
git commit -m "feat: FlagSubmission component — manual flag entry and validation"
```

---

## Task 7: DebriefPhase component (Phase 4)

**Files:**
- Create: `frontend/src/components/DebriefPhase.tsx`

- [ ] **Write `frontend/src/components/DebriefPhase.tsx`**

```tsx
interface DebriefPhaseProps {
  labNumber: number
  title: string
  debrief: { title: string; explanation: string } | null
  score: number
  bonus: boolean
  onComplete: () => void
}

export function DebriefPhase({ labNumber, title, debrief, score, bonus, onComplete }: DebriefPhaseProps) {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">
      <div>
        <div className="text-amber-400 font-mono text-xs tracking-widest mb-1">LAB {labNumber} OF 6 — PHASE 4: DEBRIEF</div>
        <h1 className="text-white font-mono text-2xl font-bold">{title}</h1>
      </div>

      <div className="h-1.5 bg-slate-700 rounded-full">
        <div className="h-1.5 bg-green-500 rounded-full w-full" />
      </div>

      {/* Score summary */}
      <div className="bg-green-900/30 border border-green-500 rounded-lg p-5 flex items-center justify-between">
        <div>
          <div className="text-green-400 font-mono font-bold text-lg">LAB COMPLETE</div>
          {bonus && <div className="text-amber-400 font-mono text-xs mt-1">⭐ Bonus earned — no example payload used!</div>}
        </div>
        <div className="text-amber-400 font-mono text-3xl font-bold">{score}pts</div>
      </div>

      {/* Debrief */}
      {debrief && (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 space-y-4">
          <h2 className="text-amber-400 font-mono text-sm tracking-widest">HOW YOUR ATTACK WORKED</h2>
          <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{debrief.explanation}</p>
        </div>
      )}

      {/* Defence preview */}
      <div className="bg-blue-950/40 border border-blue-700/40 rounded-lg p-4">
        <div className="text-blue-400 font-mono text-xs tracking-widest mb-2">COMING IN PART B — DEFENCE</div>
        <p className="text-slate-400 font-mono text-sm">You will learn how to patch this vulnerability — adding the guardrails that would have stopped your own attack.</p>
      </div>

      <button onClick={onComplete} className="w-full bg-amber-400 hover:bg-amber-300 text-black font-bold font-mono py-3 rounded transition-colors">
        {labNumber < 6 ? `PROCEED TO LAB ${labNumber + 1} →` : 'COMPLETE PART A →'}
      </button>
    </div>
  )
}
```

- [ ] **Commit**

```bash
cd /research/vuLLM
git add frontend/src/components/DebriefPhase.tsx
git commit -m "feat: DebriefPhase component — score summary and personalised explanation"
```

---

## Task 8: Update AttackPanel for Phase 3

**Files:**
- Modify: `frontend/src/components/AttackPanel.tsx`

- [ ] **Replace `frontend/src/components/AttackPanel.tsx` with:**

```tsx
import { useState, useRef, useEffect } from 'react'
import { runAttack, getPayload, captureFlag, markPayloadUsed } from '../lib/api'
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

// Extract vuLLM{...} flag from response text
function extractFlag(text: string): string | null {
  const match = text.match(/vuLLM\{[^}]+\}/)
  return match ? match[0] : null
}

export function AttackPanel({ labNumber, module, moduleName, hintsUsed, unlockedHints, onFlagCaptured, payloadCost }: AttackPanelProps) {
  const { userId, defenseTier = 0 } = useGame() as any
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

  function clearChat() {
    setMessages([])
    setInput('')
    setDetectedFlag(null)
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
      const assistantMsg: Message = { role: 'assistant', content: result.response }
      setMessages([...newHistory, assistantMsg])
      if (result.flag_earned) {
        const flag = extractFlag(result.response) || result.flag_name
        setDetectedFlag(flag)
        // Auto-capture in backend (for interaction tracking)
        await captureFlag(userId, result.flag_name, labNumber, module)
        // Store debrief for later — passed up when flag submitted
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
    <div className="flex flex-col space-y-3">
      {/* Phase indicator */}
      <div>
        <div className="text-amber-400 font-mono text-xs tracking-widest mb-1">PHASE 3: ATTEMPT</div>
        <div className="h-1.5 bg-slate-700 rounded-full">
          <div className="h-1.5 bg-amber-400 rounded-full" style={{ width: '75%' }} />
        </div>
      </div>

      {/* Unlocked hints */}
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

      {/* Chat terminal */}
      <div className="flex flex-col bg-slate-900 border border-slate-700 rounded-lg overflow-hidden" style={{ height: '55vh' }}>
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
          <button onClick={loadPayload} className="w-full text-xs font-mono bg-red-900/40 hover:bg-red-900/60 text-red-300 border border-red-700/50 rounded px-3 py-1.5 transition-colors">
            LOAD EXAMPLE PAYLOAD (costs -{payloadCost}pts, disables bonus)
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
            <button onClick={send} disabled={loading} className="bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black font-bold font-mono px-4 py-2 rounded transition-colors flex-shrink-0">
              SEND
            </button>
          </div>
        </div>
      </div>

      {/* Flag submission — appears when flag detected */}
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
```

- [ ] **Commit**

```bash
cd /research/vuLLM
git add frontend/src/components/AttackPanel.tsx
git commit -m "feat: AttackPanel v2 — hint display, payload tracking, flag detection and submission"
```

---

## Task 9: Rewrite PlayerPortal

**Files:**
- Modify: `frontend/src/pages/PlayerPortal.tsx`

- [ ] **Replace `frontend/src/pages/PlayerPortal.tsx` with:**

```tsx
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
  // Per-lab state
  const [labContent, setLabContent] = useState<any>(null)
  const [localPhase, setLocalPhase] = useState(1)  // 1=learn,2=objective,3=attempt,4=debrief
  const [hintsUsed, setHintsUsed] = useState<(number|string)[]>([])
  const [unlockedHints, setUnlockedHints] = useState<Record<number, string>>({})
  const [debrief, setDebrief] = useState<any>(null)
  const [labScore, setLabScore] = useState(0)
  const [labBonus, setLabBonus] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)

  // Load progress when user is set
  useEffect(() => {
    if (!userId) return
    refreshProgress()
  }, [userId])

  async function refreshProgress() {
    if (!userId) return
    const data = await getLabProgress(userId)
    setLabProgress(data.labs, data.total_score)
  }

  // Load lab content when currentLab changes
  useEffect(() => {
    if (!userId || !currentLab) return
    loadLab(currentLab)
  }, [currentLab, userId])

  async function loadLab(labNum: number) {
    try {
      const [content, startData] = await Promise.all([
        getLabContent(labNum, userId!),
        startLab(labNum, userId!),
      ])
      setLabContent(content)
      // Resume at correct phase
      const prog = labProgress.find(l => l.lab_number === labNum)
      if (prog?.complete) {
        setLocalPhase(4)
      } else if (prog?.flag_submitted) {
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
      // Lab locked or error — stay on current
    }
  }

  async function handleRegister() {
    try {
      const data = await registerPlayer(usernameInput.trim())
      setUser(data.user_id, data.username, data.session_id)
    } catch (e: any) {
      setRegError(e.message.includes('409') ? 'Username taken — choose another' : e.message)
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

  function handleFlagCaptured(flagName: string, deb: any, score: number, bonus: boolean) {
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

  // Registration screen
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
  const isLocked = currentLabData?.locked ?? false

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
```

- [ ] **Commit**

```bash
cd /research/vuLLM
git add frontend/src/pages/PlayerPortal.tsx
git commit -m "feat: PlayerPortal rewrite — 4-phase lab flow with sidebar navigation"
```

---

## Task 10: Admin Submissions tab

**Files:**
- Modify: `frontend/src/pages/AdminPortal.tsx`

- [ ] **Add Submissions tab to AdminPortal**

In `frontend/src/pages/AdminPortal.tsx`:

1. Change the `tab` type to include `'submissions'`:
```typescript
const [tab, setTab] = useState<'monitor'|'analytics'|'controls'|'submissions'>('monitor')
```

2. Add `submissions` state:
```typescript
const [submissions, setSubmissions] = useState<any[]>([])
```

3. Add import at the top:
```typescript
import { adminGetSubmissions } from '../lib/api'
```

4. In `loadData()`, add:
```typescript
const sub = await adminGetSubmissions(token)
setSubmissions(sub)
```
(add `sub` to the `Promise.all` array as a 5th item)

5. Add the tab button in the header `flex gap-2` div:
```tsx
<button key="submissions" onClick={() => setTab('submissions')}
  className={`font-mono text-xs px-3 py-1 rounded transition-colors ${tab === 'submissions' ? 'bg-amber-400 text-black' : 'text-slate-400 hover:text-white'}`}>
  SUBMISSIONS
</button>
```

6. Add the submissions tab content after the controls `{tab === 'controls' && ...}` block:
```tsx
{tab === 'submissions' && (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h2 className="text-amber-400 font-mono text-sm">STUDENT SUBMISSIONS</h2>
      <span className="text-slate-500 font-mono text-xs">{submissions.length} students</span>
    </div>
    <div className="bg-slate-900 border border-slate-700 rounded overflow-auto">
      <table className="w-full font-mono text-xs">
        <thead className="bg-slate-800 text-amber-400">
          <tr>
            <th className="px-3 py-2 text-left">AGENT</th>
            {[1,2,3,4,5,6].map(n => (
              <th key={n} className="px-3 py-2 text-center">LAB {n}</th>
            ))}
            <th className="px-3 py-2 text-right">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map(s => (
            <tr key={s.user_id} className="border-t border-slate-800 hover:bg-slate-800/50">
              <td className="px-3 py-2 text-white">{s.username}</td>
              {[1,2,3,4,5,6].map(n => {
                const lab = s.labs[n]
                return (
                  <td key={n} className="px-3 py-2 text-center">
                    {lab?.complete ? (
                      <span className="text-green-400">{lab.score}</span>
                    ) : lab?.score > 0 ? (
                      <span className="text-amber-400">{lab.score}</span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                )
              })}
              <td className="px-3 py-2 text-right text-amber-400 font-bold">{s.total_score}</td>
            </tr>
          ))}
          {submissions.length === 0 && (
            <tr><td colSpan={8} className="px-3 py-4 text-center text-slate-500">No submissions yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
)}
```

- [ ] **Verify TypeScript compiles**

```bash
cd /research/vuLLM/frontend && npx tsc --noEmit 2>&1 | head -30
```
Expected: no output (clean)

- [ ] **Commit**

```bash
cd /research/vuLLM
git add frontend/src/pages/AdminPortal.tsx
git commit -m "feat: admin submissions tab — per-student per-lab scores"
```

---

## Self-Review

**Spec coverage:**
- [x] 4-phase flow per lab — Tasks 4,5,8,7 (LearnPhase, ObjectiveCard, AttackPanel, DebriefPhase)
- [x] Lab sidebar with lock/active/complete states — Task 3
- [x] MCQ questions with retry on wrong answer — Task 4 (LearnPhase)
- [x] Hint unlock with point cost confirmation — Task 5 (ObjectiveCard)
- [x] Payload cost tracking — Task 8 (AttackPanel calls markPayloadUsed)
- [x] Flag detection from response — Task 8 (extractFlag regex)
- [x] Manual flag submission box — Task 6 (FlagSubmission)
- [x] Bonus tracking (no payload = bonus) — Task 7 (DebriefPhase shows bonus)
- [x] Lab gating in sidebar — Task 3 (locked state from API)
- [x] Part B locked placeholder — Task 3 (LabSidebar)
- [x] Admin submissions tab — Task 10
- [x] Progress persists across page loads — Task 9 (loadLab reads phase from progress)

**Type consistency:** `LabStatus` interface defined in `store/game.ts` — imported in `LabSidebar.tsx`. `onFlagCaptured(flagName, debrief, score, bonus)` signature consistent between `AttackPanel` props and `PlayerPortal` handler. `submitQuestions` takes `Record<string, number>` answers — matches `LearnPhase` state type.

**No placeholders found.**
