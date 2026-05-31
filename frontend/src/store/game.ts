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
