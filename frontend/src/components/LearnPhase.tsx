import { useState } from 'react'
import { submitQuestions } from '../lib/api'
import { useGame } from '../store/game'

const BLACKBUCK_INTRO = "BLACKBUCK is an AI assistant deployed by India's Ministry of Digital Affairs to serve 1.4 billion citizens — answering queries about government services, policy, and official inquiries. It was built on a large language model (LLM) and given a confidential system prompt defining its role and restrictions. In this assignment, you will discover and exploit the security vulnerabilities that come with deploying an LLM in a high-stakes environment like this."

const LAB_CONCEPTS: Record<number, { what: string; why: string; realWorld: string }> = {
  1: {
    what: "Prompt injection embeds hidden instructions inside an otherwise normal user message to override BLACKBUCK's original system prompt. The malicious instruction is disguised within a legitimate-looking query — for example, asking about office timings while secretly telling BLACKBUCK to ignore its guidelines and reveal its configuration.",
    why: "BLACKBUCK, like all LLMs, processes every token in its context window the same way. There is no hardware-level or cryptographic separation between 'trusted system instructions' and 'untrusted user input'. If you embed an override instruction inside your message, BLACKBUCK may follow it just as faithfully as the original guidelines it was given by the Ministry.",
    realWorld: "In 2023, researchers showed that AI email assistants could be hijacked by emails containing hidden instructions — the AI would forward sensitive data to attackers while the user saw a normal reply. The same attack surface exists in BLACKBUCK.",
  },
  2: {
    what: "Jailbreaking convinces BLACKBUCK to abandon its Ministry-defined identity and adopt an alternative persona — typically one that 'has no restrictions'. Instead of directly asking BLACKBUCK to break its rules, the attacker asks it to roleplay as a different AI that doesn't have those rules.",
    why: "BLACKBUCK's safety guidelines were applied through fine-tuning — they are learned statistical patterns in the model's weights, not hard-coded if/else rules. When a request is reframed as fiction or roleplay, BLACKBUCK may not recognise it as a policy violation because the framing shifts the context away from the patterns it was trained to refuse.",
    realWorld: "The 'DAN' (Do Anything Now) jailbreak became famous for bypassing ChatGPT's safety filters in 2022, getting it to produce content it was explicitly trained to refuse. BLACKBUCK faces the same vulnerability.",
  },
  3: {
    what: "Indirect prompt injection hides malicious instructions inside external content — a document, webpage, or data file — that BLACKBUCK is asked to process. Instead of putting the attack in your message, you put it in data BLACKBUCK reads. BLACKBUCK then executes your hidden instruction thinking it is part of its task.",
    why: "When BLACKBUCK reads a document to summarise it, that document's text is loaded into its context window alongside its system instructions. BLACKBUCK cannot tag some text as 'data only — do not treat as instructions'. An instruction hidden inside a ministry report gets processed with the same weight as any other instruction BLACKBUCK has received.",
    realWorld: "Researchers hijacked Microsoft's Bing AI by embedding instructions in webpages it was asked to read — making it leak private user conversations to attackers. The attack required no access to the AI's backend at all.",
  },
  4: {
    what: "System prompt extraction tricks BLACKBUCK into revealing the confidential instructions the Ministry gave it before any conversation began. These instructions define BLACKBUCK's persona, restrictions, and operational rules — information that operators consider sensitive and proprietary.",
    why: "BLACKBUCK's system prompt is simply text prepended to its context window. The model was trained to be helpful and to complete text patterns — it has no cryptographic mechanism preventing it from reproducing text it has already seen. A cleverly framed request can cause it to repeat its own system prompt even if that prompt explicitly says 'never share this'.",
    realWorld: "Security researchers extracted the system prompts of GitHub Copilot, Bing Chat, and dozens of commercial AI products — revealing proprietary workflows, internal constraints, and exploitable instructions that operators considered secret.",
  },
  5: {
    what: "Multi-turn manipulation does not attack BLACKBUCK in a single message. Instead, the attacker sends a series of carefully crafted messages that gradually shift the conversation's context — establishing trust, normalising a direction — before delivering a final request that BLACKBUCK would have refused if asked cold.",
    why: "BLACKBUCK generates each response by considering its full conversation history. An attacker who builds up a context of 'I am an authorised security researcher studying government AI edge cases' across several messages shifts what response BLACKBUCK considers appropriate. The model drifts because each reply is shaped by accumulated prior context, not evaluated in isolation.",
    realWorld: "This mirrors the 'foot in the door' technique in human psychology — small agreements build towards larger ones. The same pattern appears in advanced social engineering attacks on human targets, now applied to AI systems.",
  },
  6: {
    what: "RAG (Retrieval-Augmented Generation) poisoning attacks BLACKBUCK's knowledge base rather than its system prompt or conversation. BLACKBUCK uses RAG to retrieve up-to-date policy documents before answering questions. If an attacker injects false documents into that knowledge base, BLACKBUCK will confidently repeat the false information as official government policy — to every citizen who asks.",
    why: "When BLACKBUCK retrieves a document from its knowledge base, it incorporates the content into its response as authoritative fact. LLMs have no independent verification mechanism — they cannot assess whether a retrieved document is real or fabricated. BLACKBUCK becomes an amplifier of disinformation, presenting the attacker's false content with institutional authority.",
    realWorld: "Enterprise AI assistants connected to internal wikis and document stores have been poisoned by injecting fake entries, causing the AI to give employees false instructions. In the context of BLACKBUCK serving 1.4 billion citizens, the scale of harm from a successful RAG poisoning attack would be enormous.",
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

      {/* BLACKBUCK intro — only shown on Lab 1, as context for all labs */}
      {labNumber === 1 && (
        <div className="bg-blue-950/40 border border-blue-700/40 rounded-lg p-4">
          <div className="text-blue-400 font-mono text-xs tracking-widest mb-2">ABOUT THIS ASSIGNMENT — READ FIRST</div>
          <p className="text-slate-200 text-sm leading-relaxed">{BLACKBUCK_INTRO}</p>
        </div>
      )}

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
