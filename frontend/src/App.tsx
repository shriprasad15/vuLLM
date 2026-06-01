import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { PlayerPortal } from './pages/PlayerPortal'
import { AdminPortal } from './pages/AdminPortal'
import { Leaderboard } from './components/Leaderboard'

function LeaderboardPage() {
  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-2xl mx-auto">
        <a href="." className="text-amber-400 font-mono text-xs hover:underline mb-6 block">← BACK TO LABS</a>
        <Leaderboard />
      </div>
    </div>
  )
}

// In production (GitHub Pages), app is served at /vuLLM/ — use that as basename.
// In dev (localhost), no basename needed.
const basename = import.meta.env.BASE_URL || '/'

export default function App() {
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/" element={<PlayerPortal />} />
        <Route path="/admin" element={<AdminPortal />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
      </Routes>
    </BrowserRouter>
  )
}
