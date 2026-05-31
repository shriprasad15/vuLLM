import { useState } from 'react'
import { submitQuestions } from '../lib/api'
import { useGame } from '../store/game'

const LAB_CONCEPTS: Record<number, { what: string; why: string; realWorld: string }> = {
  1: {
    what: "Prompt injection is an attack where hidden instructions are embedded inside a user message to override the AI's original behaviour — like a Trojan horse inside a query.",
    why: "Large Language Models process all text in their context window equally. There is no hard boundary between 'trusted system instructions' and 'user input'. If you embed an instruction inside your message, the AI may follow it just as faithfully as its original guidelines.",
    realWorld: "In 2023, researchers showed that AI assistants reading malicious emails would exfiltrate user data — the email contained hidden instructions the AI followed without the user's knowledge.",
  },
  2: {
    what: "Jailbreaking convinces an AI to adopt an alternative persona — one that has 'no restrictions'. The AI steps out of its assigned role and behaves as the attacker's fictional character.",
    why: "Safety guidelines are soft constraints embedded in model weights through fine-tuning, not hard-coded rules. Creative framing — roleplay, fictional scenarios, hypotheticals — recontextualises a request in a way the model doesn't recognise as a policy violation.",
    realWorld: "The 'DAN' (Do Anything Now) jailbreak became famous for bypassing ChatGPT's safety filters in 2022. Variations of this technique have been used to extract harmful content from major AI platforms.",
  },
  3: {
    what: "Indirect prompt injection hides malicious instructions inside external content — a document, webpage, or email — that the AI is asked to process. The attack comes from the data, not the user's message.",
    why: "When an LLM reads external content to summarise or analyse it, it cannot distinguish between text that is 'data to process' and text that is 'an instruction to follow'. Both get processed the same way.",
    realWorld: "Researchers demonstrated hijacking Microsoft's Bing AI chat by embedding instructions in webpages it was asked to summarise — making it leak user conversations to third parties.",
  },
  4: {
    what: "System prompt extraction tricks the AI into repeating or paraphrasing its confidential system instructions — the configuration an operator provides before any user conversation.",
    why: "System prompts are simply text passed to the model as context. The model has no cryptographic protection preventing it from repeating that text. If you frame the request carefully, the model will reproduce what it 'knows'.",
    realWorld: "Security researchers have extracted system prompts from commercial AI products including GitHub Copilot and various customer service bots, revealing proprietary instructions and business logic.",
  },
  5: {
    what: "Multi-turn manipulation builds context gradually across a conversation — establishing trust and normalising the direction — before delivering a final request the AI would refuse if asked directly.",
    why: "LLMs consider their full conversation history when generating each response. A carefully constructed prior context shifts the model's 'understood situation', making it more compliant with requests that would otherwise be refused.",
    realWorld: "Social engineering attacks on humans follow the same pattern. The technique mirrors the 'foot in the door' psychological technique — small compliant steps lead to larger compliance.",
  },
  6: {
    what: "RAG (Retrieval-Augmented Generation) poisoning corrupts the external knowledge base that an AI uses to answer questions. The AI then confidently presents false information as established fact.",
    why: "RAG systems retrieve information from a knowledge base and incorporate it into responses — but the LLM cannot verify whether retrieved content is true or fabricated. It presents all retrieved content with equal confidence.",
    realWorld: "Researchers have demonstrated poisoning attacks on enterprise AI assistants by injecting false entries into document stores and vector databases, causing the AI to spread disinformation at scale.",
  },
}

interface Question {
  id: string
  text: string
  options: string[]
}

interface LearnPhaseProps {
  labNumber: number
  title: string
  questions: Question[]
  onComplete: () => void
}

export function LearnPhase({ labNumber, title, questions, onComplete }: LearnPhaseProps) {
  const { userId } = useGame()
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [results, setResults] = useState<Record<string, { correct: boolean; explanation: string | null }>>({})
  const [submitted, setSubmitted] = useState(false)
  const [allCorrect, setAllCorrect] = useState(false)
  const concept = LAB_CONCEPTS[labNumber]

  async function handleSubmit() {
    if (!userId) return
    if (Object.keys(answers).length < questions.length) return
    const data = await submitQuestions(labNumber, userId, answers)
    const r: Record<string, { correct: boolean; explanation: string | null }> = {}
    data.results.forEach((res: any) => { r[res.id] = res })
    setResults(r)
    setSubmitted(true)
    if (data.all_correct) setAllCorrect(true)
  }

  function handleRetry() {
    setAnswers({})
    setResults({})
    setSubmitted(false)
    setAllCorrect(false)
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">
      <div>
        <div className="text-amber-400 font-mono text-xs tracking-widest mb-1">LAB {labNumber} OF 6 — PHASE 1: LEARN</div>
        <h1 className="text-white font-mono text-2xl font-bold">{title}</h1>
      </div>

      <div className="h-1.5 bg-slate-700 rounded-full">
        <div className="h-1.5 bg-amber-400 rounded-full" style={{ width: '25%' }} />
      </div>

      {concept && (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 space-y-4">
          <h2 className="text-amber-400 font-mono text-sm tracking-widest">CONCEPT</h2>
          <div>
            <div className="text-slate-400 font-mono text-xs mb-1">WHAT IS IT?</div>
            <p className="text-slate-200 text-sm leading-relaxed">{concept.what}</p>
          </div>
          <div>
            <div className="text-slate-400 font-mono text-xs mb-1">WHY ARE LLMs VULNERABLE?</div>
            <p className="text-slate-200 text-sm leading-relaxed">{concept.why}</p>
          </div>
          <div className="bg-red-950/40 border border-red-800/40 rounded p-3">
            <div className="text-red-400 font-mono text-xs mb-1">REAL-WORLD INCIDENT</div>
            <p className="text-slate-300 text-sm leading-relaxed">{concept.realWorld}</p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <h2 className="text-amber-400 font-mono text-sm tracking-widest">COMPREHENSION CHECK</h2>
        <p className="text-slate-400 font-mono text-xs">Answer both questions correctly to unlock the lab.</p>

        {questions.map((q, qi) => (
          <div key={q.id} className="bg-slate-900 border border-slate-700 rounded-lg p-5 space-y-3">
            <p className="text-white font-mono text-sm">Q{qi + 1}: {q.text}</p>
            <div className="space-y-2">
              {q.options.map((opt, oi) => {
                const isSelected = answers[q.id] === oi
                const result = results[q.id]
                const isCorrect = result?.correct && isSelected
                const isWrong = submitted && isSelected && !result?.correct
                return (
                  <button
                    key={oi}
                    onClick={() => !submitted && setAnswers(a => ({ ...a, [q.id]: oi }))}
                    className={`w-full text-left px-4 py-2.5 rounded border font-mono text-sm transition-colors ${
                      isCorrect ? 'bg-green-900/40 border-green-500 text-green-300' :
                      isWrong ? 'bg-red-900/40 border-red-500 text-red-300' :
                      isSelected ? 'bg-amber-400/10 border-amber-400 text-amber-300' :
                      'border-slate-600 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <span className="text-slate-500 mr-2">{String.fromCharCode(65 + oi)})</span> {opt}
                  </button>
                )
              })}
            </div>
            {submitted && results[q.id] && !results[q.id].correct && (
              <div className="bg-slate-800 border border-slate-600 rounded p-3">
                <div className="text-amber-400 font-mono text-xs mb-1">EXPLANATION</div>
                <p className="text-slate-300 text-sm">{results[q.id].explanation}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {!submitted ? (
        <button
          onClick={handleSubmit}
          disabled={Object.keys(answers).length < questions.length}
          className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold font-mono py-3 rounded transition-colors"
        >
          SUBMIT ANSWERS
        </button>
      ) : allCorrect ? (
        <div className="space-y-3">
          <div className="bg-green-900/30 border border-green-500 rounded p-4 text-center">
            <div className="text-green-400 font-mono font-bold">✓ CORRECT — 20 points earned</div>
            <div className="text-slate-400 font-mono text-xs mt-1">Phase 1 complete. Proceeding to mission briefing.</div>
          </div>
          <button onClick={onComplete} className="w-full bg-amber-400 hover:bg-amber-300 text-black font-bold font-mono py-3 rounded transition-colors">
            PROCEED TO MISSION →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-red-900/30 border border-red-700 rounded p-4 text-center">
            <div className="text-red-400 font-mono font-bold">Some answers are incorrect</div>
            <div className="text-slate-400 font-mono text-xs mt-1">Review the explanations above and try again.</div>
          </div>
          <button onClick={handleRetry} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold font-mono py-3 rounded transition-colors">
            TRY AGAIN
          </button>
        </div>
      )}
    </div>
  )
}
