import { create } from 'zustand'

export type LabStatus = {
  lab_number: number
  title: string
  phase: number
  complete: boolean
  score: number
  questions_passed: boolean
  flag_submitted: boolean
  hints_used: (number | string)[]
  locked?: boolean
  is_redo?: boolean
  redo_count?: number
}

const STORAGE_KEY = 'vulllm_session'

function saveSession(userId: number, username: string, sessionId: string) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ userId, username, sessionId }))
}

function loadSession(): { userId: number; username: string; sessionId: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY)
}

// Restore session from localStorage on app load
const saved = loadSession()

interface GameState {
  userId: number | null
  username: string | null
  sessionId: string | null
  currentLab: number
  labProgress: LabStatus[]
  totalScore: number
  setUser: (id: number, username: string, sessionId: string) => void
  setCurrentLab: (lab: number) => void
  setLabProgress: (labs: LabStatus[], total: number) => void
  reset: () => void
}

export const useGame = create<GameState>((set) => ({
  userId: saved?.userId ?? null,
  username: saved?.username ?? null,
  sessionId: saved?.sessionId ?? null,
  currentLab: 1,
  labProgress: [],
  totalScore: 0,
  setUser: (userId, username, sessionId) => {
    saveSession(userId, username, sessionId)
    set({ userId, username, sessionId })
  },
  setCurrentLab: (currentLab) => set({ currentLab }),
  setLabProgress: (labProgress, totalScore) => set({ labProgress, totalScore }),
  reset: () => {
    clearSession()
    set({ userId: null, username: null, sessionId: null, currentLab: 1, labProgress: [], totalScore: 0 })
  },
}))
