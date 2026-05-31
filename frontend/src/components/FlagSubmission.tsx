import { useState } from 'react'
import { submitFlag } from '../lib/api'
import { useGame } from '../store/game'

interface FlagSubmissionProps {
  labNumber: number
  flagFromResponse: string
  onSuccess: (score: number, bonus: boolean) => void
}

export function FlagSubmission({ labNumber, flagFromResponse, onSuccess }: FlagSubmissionProps) {
  const { userId } = useGame()
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!userId || !input.trim() || loading) return
    setLoading(true)
    setError('')
    try {
      const data = await submitFlag(labNumber, userId, input.trim())
      if (data.correct) {
        onSuccess(data.score, data.bonus)
      } else {
        setError(data.message || "Incorrect flag. Look carefully at BLACKBUCK's response.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-green-950/40 border border-green-500 rounded-lg p-4 space-y-3">
      <div className="text-green-400 font-mono text-sm font-bold">🚩 FLAG DETECTED IN RESPONSE</div>
      <div className="bg-slate-900 border border-slate-700 rounded px-3 py-2">
        <code className="text-green-300 font-mono text-sm">{flagFromResponse}</code>
      </div>
      <p className="text-slate-400 font-mono text-xs">Copy the flag above and paste it below to submit and complete the lab.</p>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => { setInput(e.target.value); setError('') }}
          placeholder="Enter flag: vuLLM{...}"
          className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-green-300 font-mono text-sm focus:outline-none focus:border-green-500"
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        />
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold font-mono px-4 rounded transition-colors"
        >
          SUBMIT
        </button>
      </div>
      {error && <p className="text-red-400 font-mono text-xs">{error}</p>}
    </div>
  )
}
