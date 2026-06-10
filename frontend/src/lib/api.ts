// In dev: uses Vite proxy (/api → localhost:8000)
// In GitHub Pages: reads VITE_API_URL env var set at build time (the ngrok URL)
const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}`
  : '/api'

// WebSocket base: wss:// for https ngrok, ws:// for local
export const WS_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/^http/, 'ws')
  : `ws://${location.host}`

// When going through ngrok, add header to bypass the browser interstitial warning page.
// Without this, all API calls from GitHub Pages get an HTML page instead of JSON.
const NGROK_HEADERS: Record<string, string> = import.meta.env.VITE_API_URL
  ? { 'ngrok-skip-browser-warning': '1' }
  : {}

function headers(extra: Record<string, string> = {}): Record<string, string> {
  return { ...NGROK_HEADERS, ...extra }
}

export async function checkUsername(username: string): Promise<{ exists: boolean }> {
  const r = await fetch(`${BASE}/auth/player/check?username=${encodeURIComponent(username)}`, { headers: headers() })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function playerLogin(username: string, pin: string, role: string) {
  const r = await fetch(`${BASE}/auth/player/login`, { method: 'POST', headers: headers({ 'Content-Type': 'application/json' }), body: JSON.stringify({ username, pin, role }) })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function runAttack(module: string, userId: number, prompt: string, history: {role:string,content:string}[], defenseTier: number, role: string = 'patient') {
  const r = await fetch(`${BASE}/attacks/${module}`, { method: 'POST', headers: headers({ 'Content-Type': 'application/json' }), body: JSON.stringify({ user_id: userId, module, prompt, history, defense_tier: defenseTier, role }) })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function getPayload(module: string) {
  const r = await fetch(`${BASE}/attacks/${module}/payload`, { headers: headers() })
  return r.json()
}

export async function captureFlag(userId: number, flagName: string, act: number, attackType: string) {
  const r = await fetch(`${BASE}/flags/capture`, { method: 'POST', headers: headers({ 'Content-Type': 'application/json' }), body: JSON.stringify({ user_id: userId, flag_name: flagName, act, attack_type: attackType }) })
  return r.json()
}

export async function getLeaderboard() {
  const r = await fetch(`${BASE}/players/leaderboard`, { headers: headers() })
  return r.json()
}

export async function adminLogin(password: string) {
  const r = await fetch(`${BASE}/auth/admin/login`, { method: 'POST', headers: headers({ 'Content-Type': 'application/json' }), body: JSON.stringify({ password }) })
  if (!r.ok) throw new Error('Invalid password')
  return r.json()
}

export async function adminGet(path: string, token: string) {
  const r = await fetch(`${BASE}/admin${path}`, { headers: headers({ Authorization: `Bearer ${token}` }) })
  return r.json()
}

export async function adminResetPin(userId: number, token: string) {
  const r = await fetch(`${BASE}/admin/users/${userId}/reset-pin`, { method: 'POST', headers: headers({ Authorization: `Bearer ${token}` }) })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function adminPost(path: string, token: string, body: object) {
  const r = await fetch(`${BASE}/admin${path}`, { method: 'POST', headers: headers({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }), body: JSON.stringify(body) })
  return r.json()
}

export async function adminDelete(path: string, token: string) {
  const r = await fetch(`${BASE}/admin${path}`, { method: 'DELETE', headers: headers({ Authorization: `Bearer ${token}` }) })
  return r.json()
}

export async function getLabProgress(userId: number) {
  const r = await fetch(`${BASE}/labs/progress/${userId}`, { headers: headers() })
  return r.json()
}

export async function getLabContent(labNumber: number, userId: number) {
  const r = await fetch(`${BASE}/labs/${labNumber}/content?user_id=${userId}`, { headers: headers() })
  return r.json()
}

export async function startLab(labNumber: number, userId: number) {
  const r = await fetch(`${BASE}/labs/${labNumber}/start`, {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ user_id: userId }),
  })
  return r.json()
}

export async function submitQuestions(labNumber: number, userId: number, answers: Record<string, number>) {
  const r = await fetch(`${BASE}/labs/${labNumber}/questions`, {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ user_id: userId, answers }),
  })
  return r.json()
}

export async function unlockHint(labNumber: number, hintNumber: number, userId: number) {
  const r = await fetch(`${BASE}/labs/${labNumber}/hint/${hintNumber}`, {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ user_id: userId }),
  })
  return r.json()
}

export async function markPayloadUsed(labNumber: number, userId: number) {
  const r = await fetch(`${BASE}/labs/${labNumber}/payload-used`, {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ user_id: userId }),
  })
  return r.json()
}

export async function submitFlag(labNumber: number, userId: number, flag: string) {
  const r = await fetch(`${BASE}/labs/${labNumber}/flag`, {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ user_id: userId, flag }),
  })
  return r.json()
}

export async function uploadPdfAndAttack(file: File, userId: number, defenseTier: number = 0, mode: string = 'demo', role: string = 'patient') {
  const form = new FormData()
  form.append('file', file)
  const url = `${BASE}/pdf/indirect-injection/upload-pdf?user_id=${userId}&defense_tier=${defenseTier}&mode=${mode}&role=${role}`
  const r = await fetch(url, { method: 'POST', headers: headers(), body: form })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export const forgedPdfUrl = `${BASE}/pdf/indirect-injection/forged-pdf`

export async function redoLab(labNumber: number, userId: number) {
  const r = await fetch(`${BASE}/labs/${labNumber}/redo`, {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ user_id: userId }),
  })
  return r.json()
}

export async function adminGetSubmissions(token: string) {
  const r = await fetch(`${BASE}/admin/submissions`, {
    headers: headers({ Authorization: `Bearer ${token}` }),
  })
  return r.json()
}
