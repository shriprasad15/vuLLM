import { useState, useEffect, useRef } from 'react'
import { adminGet, adminPost } from '../lib/api'
import { AdminLogin } from './AdminLogin'

interface User { id: number; username: string; score: number; flags: number; last_prompt: string; last_seen: string }
interface Interaction { id: number; user_id: number; act: number; attack_type: string; defense_tier: number; prompt: string; response: string; success: boolean; flag_captured: boolean; timestamp: string }

export function AdminPortal() {
  const [token, setToken] = useState(localStorage.getItem('admin_token') || '')
  const [tab, setTab] = useState<'monitor'|'analytics'|'controls'>('monitor')
  const [users, setUsers] = useState<User[]>([])
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [feed, setFeed] = useState<string[]>([])
  const [settings, setSettings] = useState<Record<number,any>>({})
  const wsRef = useRef<WebSocket | null>(null)

  function handleLogin(t: string) { localStorage.setItem('admin_token', t); setToken(t) }

  async function loadData() {
    const [u, i, s] = await Promise.all([adminGet('/users', token), adminGet('/interactions', token), adminGet('/settings', token)])
    setUsers(u); setInteractions(i)
    const sm: Record<number,any> = {}
    s.forEach((x: any) => { sm[x.act] = x })
    setSettings(sm)
  }

  useEffect(() => {
    if (!token) return
    loadData()
    wsRef.current = new WebSocket(`ws://${location.host}/ws/admin`)
    wsRef.current.onmessage = (e) => {
      const d = JSON.parse(e.data)
      setFeed(f => [`[${new Date().toLocaleTimeString()}] ${d.user}: ${d.module} — ${d.success ? '✓ SUCCESS' : '✗ failed'} ${d.flag ? '🚩' : ''}`, ...f.slice(0, 99)])
      loadData()
    }
    return () => wsRef.current?.close()
  }, [token])

  if (!token) return <AdminLogin onLogin={handleLogin} />

  async function updateSetting(act: number, key: string, value: any) {
    await adminPost(`/settings/${act}`, token, { [key]: value })
    loadData()
  }

  async function resetAll() {
    if (!confirm('Reset ALL user progress?')) return
    await adminPost('/reset', token, {})
    loadData()
  }

  const solveRates = ['prompt_injection','jailbreak','indirect_injection','data_leakage','multi_turn','rag_poisoning'].map(m => ({
    module: m,
    attempts: interactions.filter(i => i.attack_type === m).length,
    successes: interactions.filter(i => i.attack_type === m && i.success).length,
  }))

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="bg-slate-900 border-b border-slate-700 px-6 py-3 flex items-center justify-between">
        <span className="text-amber-400 font-mono font-bold">vuLLM ADMIN</span>
        <div className="flex gap-2">
          {(['monitor','analytics','controls'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`font-mono text-xs px-3 py-1 rounded transition-colors ${tab === t ? 'bg-amber-400 text-black' : 'text-slate-400 hover:text-white'}`}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>
        <span className="text-slate-500 font-mono text-xs">{users.length} agents online</span>
      </header>

      <div className="p-6">
        {tab === 'monitor' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h2 className="text-amber-400 font-mono text-sm mb-3">ACTIVE AGENTS</h2>
              <div className="space-y-2">
                {users.map(u => (
                  <div key={u.id} className="bg-slate-900 border border-slate-700 rounded p-3 flex items-center justify-between">
                    <div>
                      <span className="text-white font-mono">{u.username}</span>
                      <span className="text-slate-400 font-mono text-xs ml-3 max-w-xs truncate">{u.last_prompt}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-amber-400 font-mono text-sm">{u.score}pts</div>
                      <div className="text-green-400 font-mono text-xs">{u.flags} flags</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-amber-400 font-mono text-sm mb-3">LIVE FEED</h2>
              <div className="bg-slate-900 border border-slate-700 rounded h-80 overflow-y-auto p-3 font-mono text-xs space-y-1">
                {feed.map((f, i) => <div key={i} className="text-green-300">{f}</div>)}
                {feed.length === 0 && <div className="text-slate-500">Waiting for activity...</div>}
              </div>
            </div>
          </div>
        )}

        {tab === 'analytics' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-amber-400 font-mono text-sm mb-3">ATTACK SUCCESS RATES</h2>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {solveRates.map(r => (
                  <div key={r.module} className="bg-slate-900 border border-slate-700 rounded p-4">
                    <div className="text-white font-mono text-sm mb-2">{r.module.replace(/_/g,' ').toUpperCase()}</div>
                    <div className="text-2xl font-bold font-mono text-amber-400">
                      {r.attempts > 0 ? Math.round((r.successes/r.attempts)*100) : 0}%
                    </div>
                    <div className="text-slate-400 font-mono text-xs">{r.successes}/{r.attempts} attempts</div>
                    <div className="mt-2 h-1.5 bg-slate-700 rounded">
                      <div className="h-1.5 bg-amber-400 rounded" style={{width: `${r.attempts > 0 ? (r.successes/r.attempts)*100 : 0}%`}} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-amber-400 font-mono text-sm">FULL INTERACTION LOG</h2>
                <a href="/api/admin/export/csv" className="text-xs font-mono text-slate-400 hover:text-amber-400 border border-slate-600 px-2 py-1 rounded">EXPORT CSV</a>
              </div>
              <div className="bg-slate-900 border border-slate-700 rounded overflow-auto max-h-96">
                <table className="w-full font-mono text-xs">
                  <thead className="bg-slate-800 text-amber-400">
                    <tr>{['Time','User','Act','Attack','Defense','Prompt','Success','Flag'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {interactions.map(i => (
                      <tr key={i.id} className="border-t border-slate-800 hover:bg-slate-800/50">
                        <td className="px-3 py-1.5 text-slate-400">{new Date(i.timestamp).toLocaleTimeString()}</td>
                        <td className="px-3 py-1.5 text-white">{i.user_id}</td>
                        <td className="px-3 py-1.5 text-slate-300">{i.act}</td>
                        <td className="px-3 py-1.5 text-slate-300">{i.attack_type}</td>
                        <td className="px-3 py-1.5 text-blue-400">T{i.defense_tier}</td>
                        <td className="px-3 py-1.5 text-slate-400 max-w-xs truncate">{i.prompt}</td>
                        <td className="px-3 py-1.5">{i.success ? <span className="text-green-400">✓</span> : <span className="text-red-400">✗</span>}</td>
                        <td className="px-3 py-1.5">{i.flag_captured ? '🚩' : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === 'controls' && (
          <div className="space-y-6">
            <div className="flex gap-3">
              <button onClick={resetAll} className="bg-red-900/40 border border-red-700 text-red-300 font-mono text-sm px-4 py-2 rounded hover:bg-red-900/60 transition-colors">
                RESET ALL USERS
              </button>
              <button onClick={loadData} className="bg-slate-800 border border-slate-600 text-slate-300 font-mono text-sm px-4 py-2 rounded hover:bg-slate-700 transition-colors">
                REFRESH
              </button>
            </div>
            <div>
              <h2 className="text-amber-400 font-mono text-sm mb-3">ACT SETTINGS</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {[1,2,3,4].map(act => {
                  const s = settings[act] || {}
                  return (
                    <div key={act} className="bg-slate-900 border border-slate-700 rounded p-4">
                      <h3 className="text-white font-mono mb-3">ACT {act}</h3>
                      <div className="space-y-3">
                        <label className="flex items-center justify-between">
                          <span className="text-slate-400 font-mono text-xs">LOCKED</span>
                          <input type="checkbox" checked={!!s.act_locked} onChange={e => updateSetting(act, 'act_locked', e.target.checked)} className="accent-amber-400" />
                        </label>
                        <label className="flex items-center justify-between">
                          <span className="text-slate-400 font-mono text-xs">TIMER</span>
                          <input type="checkbox" checked={!!s.timer_enabled} onChange={e => updateSetting(act, 'timer_enabled', e.target.checked)} className="accent-amber-400" />
                        </label>
                        {s.timer_enabled && (
                          <label className="flex items-center justify-between">
                            <span className="text-slate-400 font-mono text-xs">SECONDS</span>
                            <input type="number" value={s.timer_seconds || 300} min={30}
                              onChange={e => updateSetting(act, 'timer_seconds', parseInt(e.target.value))}
                              className="w-24 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white font-mono text-sm" />
                          </label>
                        )}
                        <label className="flex items-center justify-between">
                          <span className="text-slate-400 font-mono text-xs">DEFENSE OVERRIDE</span>
                          <select value={s.defense_tier_override ?? ''} onChange={e => updateSetting(act, 'defense_tier_override', e.target.value === '' ? null : parseInt(e.target.value))}
                            className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white font-mono text-sm">
                            <option value="">Player choice</option>
                            {[0,1,2,3].map(t => <option key={t} value={t}>Force Tier {t}</option>)}
                          </select>
                        </label>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
