import { useState } from 'react'
import { adminLogin } from '../lib/api'

export function AdminLogin({ onLogin }: { onLogin: (token: string) => void }) {
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  async function handle() {
    try { const d = await adminLogin(pw); onLogin(d.token) }
    catch { setError('Invalid password') }
  }
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="max-w-sm w-full p-8">
        <div className="text-amber-400 font-mono text-xs mb-2">OPERATION: vulAI</div>
        <h1 className="text-white font-bold font-mono text-2xl mb-6">ADMIN ACCESS</h1>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Admin password"
          className="w-full bg-slate-800 border border-slate-600 rounded px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-amber-400 mb-3"
          onKeyDown={e => e.key === 'Enter' && handle()} />
        {error && <p className="text-red-400 font-mono text-xs mb-3">{error}</p>}
        <button onClick={handle} className="w-full bg-amber-400 text-black font-bold font-mono py-3 rounded">AUTHENTICATE</button>
      </div>
    </div>
  )
}
