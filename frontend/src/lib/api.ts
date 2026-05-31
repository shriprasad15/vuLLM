const BASE = '/api'

export async function registerPlayer(username: string) {
  const r = await fetch(`${BASE}/players/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username }) })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function runAttack(module: string, userId: number, prompt: string, history: {role:string,content:string}[], defenseTier: number) {
  const r = await fetch(`${BASE}/attacks/${module}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, module, prompt, history, defense_tier: defenseTier }) })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function getPayload(module: string) {
  const r = await fetch(`${BASE}/attacks/${module}/payload`)
  return r.json()
}

export async function captureFlag(userId: number, flagName: string, act: number, attackType: string) {
  const r = await fetch(`${BASE}/flags/capture`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, flag_name: flagName, act, attack_type: attackType }) })
  return r.json()
}

export async function getLeaderboard() {
  const r = await fetch(`${BASE}/players/leaderboard`)
  return r.json()
}

export async function adminLogin(password: string) {
  const r = await fetch(`${BASE}/auth/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) })
  if (!r.ok) throw new Error('Invalid password')
  return r.json()
}

export async function adminGet(path: string, token: string) {
  const r = await fetch(`${BASE}/admin${path}`, { headers: { Authorization: `Bearer ${token}` } })
  return r.json()
}

export async function adminPost(path: string, token: string, body: object) {
  const r = await fetch(`${BASE}/admin${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
  return r.json()
}

export async function adminDelete(path: string, token: string) {
  const r = await fetch(`${BASE}/admin${path}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
  return r.json()
}
