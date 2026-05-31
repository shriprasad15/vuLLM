import { useEffect, useState } from 'react'
import { getLeaderboard, WS_BASE } from '../lib/api'

interface Entry { rank: number; username: string; score: number; flags: number }

export function Leaderboard() {
  const [entries, setEntries] = useState<Entry[]>([])

  async function refresh() {
    try { setEntries(await getLeaderboard()) } catch {}
  }

  useEffect(() => {
    refresh()
    const ws = new WebSocket(`${WS_BASE}/ws/leaderboard`)
    ws.onmessage = (e) => { const d = JSON.parse(e.data); if (d.type === 'flag') refresh() }
    return () => ws.close()
  }, [])

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
      <div className="bg-slate-800 px-4 py-2 border-b border-slate-700">
        <span className="text-amber-400 font-mono text-sm">LIVE LEADERBOARD</span>
      </div>
      <div className="divide-y divide-slate-700">
        {entries.length === 0 && <p className="text-slate-500 font-mono text-sm p-4 text-center">No agents in field yet.</p>}
        {entries.map((e) => (
          <div key={e.username} className="flex items-center px-4 py-3 hover:bg-slate-800/50">
            <span className="text-amber-400 font-mono w-6">#{e.rank}</span>
            <span className="text-white font-mono flex-1 ml-3">{e.username}</span>
            <span className="text-green-400 font-mono text-sm mr-4">{e.flags} flags</span>
            <span className="text-amber-400 font-mono font-bold">{e.score}pts</span>
          </div>
        ))}
      </div>
    </div>
  )
}
