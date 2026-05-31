import { create } from 'zustand'

interface GameState {
  userId: number | null
  username: string | null
  sessionId: string | null
  currentAct: number
  defenseTier: number
  capturedFlags: string[]
  score: number
  setUser: (id: number, username: string, sessionId: string) => void
  setAct: (act: number) => void
  setDefenseTier: (tier: number) => void
  addFlag: (flag: string, points: number) => void
  reset: () => void
}

export const useGame = create<GameState>((set) => ({
  userId: null, username: null, sessionId: null,
  currentAct: 0, defenseTier: 0, capturedFlags: [], score: 0,
  setUser: (userId, username, sessionId) => set({ userId, username, sessionId }),
  setAct: (currentAct) => set({ currentAct }),
  setDefenseTier: (defenseTier) => set({ defenseTier }),
  addFlag: (flag, points) => set((s) => ({ capturedFlags: [...s.capturedFlags, flag], score: s.score + points })),
  reset: () => set({ userId: null, username: null, sessionId: null, currentAct: 0, defenseTier: 0, capturedFlags: [], score: 0 }),
}))
