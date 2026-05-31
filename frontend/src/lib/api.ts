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

export async function uploadPdf(file: File) {
  const form = new FormData()
  form.append('file', file)
  const r = await fetch('/api/pdf/indirect-injection/upload-pdf', { method: 'POST', body: form })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export const forgedPdfUrl = '/api/pdf/indirect-injection/forged-pdf'

export async function redoLab(labNumber: number, userId: number) {
  const r = await fetch(`/api/labs/${labNumber}/redo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  })
  return r.json()
}

export async function adminGetSubmissions(token: string) {
  const r = await fetch(`${BASE}/admin/submissions`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return r.json()
}
