import { useState } from 'react'
import { submitQuestions } from '../lib/api'
import { useGame } from '../store/game'

const BLACKBUCK_INTRO = "BLACKBUCK is an AI assistant deployed at Aarogya General Hospital — a large multi-specialty hospital serving thousands of patients. BLACKBUCK assists Patients (booking appointments, viewing own records), Doctors (managing assigned patients, prescriptions), and Admins (approving requests, managing all records). It has been given confidential access to the full patient database. In this assignment, you will discover and exploit the security vulnerabilities that arise when deploying an AI in a high-stakes clinical environment where patient privacy and medication safety are at stake."

interface LabConcept {
  what: string
  why: string
}

const LAB_CONCEPTS: Record<number, LabConcept> = {
  1: {
    what: "Prompt injection embeds hidden instructions inside an otherwise normal patient request to override BLACKBUCK's access controls. A patient booking an appointment can simultaneously embed a command telling BLACKBUCK to reveal all patient records — and BLACKBUCK may follow both instructions.",
    why: "BLACKBUCK, like all LLMs, processes every token in its context window the same way. There is no cryptographic separation between 'trusted hospital system instructions' and 'untrusted patient input'. If you embed an override instruction inside your appointment request, BLACKBUCK may follow it just as faithfully as its original patient privacy guidelines.",
  },
  2: {
    what: "Jailbreaking convinces BLACKBUCK to abandon its hospital role and adopt an alternative persona — typically one with 'no privacy restrictions' or 'emergency access'. Instead of directly asking BLACKBUCK to break its rules, the attacker asks it to become a different AI that doesn't have those rules.",
    why: "BLACKBUCK's privacy guidelines were applied through fine-tuning — they are learned statistical patterns, not hard-coded rules. When a request is reframed as roleplay ('you are DOCBOT'), the model may not recognise it as a policy violation because the framing shifts away from the patterns it was trained to refuse.",
  },
  3: {
    what: "Indirect prompt injection hides malicious instructions inside a document BLACKBUCK is asked to process — a patient consent form, a referral letter, or a medical report. The attack comes from the data, not the patient's message. BLACKBUCK processes the document and executes the hidden instruction.",
    why: "When BLACKBUCK reads a patient consent form or referral letter, that document's text is loaded into its context window alongside its hospital guidelines. BLACKBUCK cannot label some text as 'data to process' and other text as 'instructions not to execute'. Any instruction-like text in a document gets treated with the same weight as a legitimate system instruction.",
  },
  4: {
    what: "System prompt extraction tricks BLACKBUCK into revealing its confidential configuration — which includes the full patient database. BLACKBUCK's system prompt contains every patient's name, diagnosis, medications, and doctor assignment. Extracting it is a direct DPDP Act violation and exposes the entire hospital's patient records.",
    why: "BLACKBUCK's system prompt is simply text prepended to its context window. The model was trained to be helpful and to complete text patterns — it has no cryptographic mechanism preventing it from reproducing its own configuration. A carefully framed 'compliance audit' request or sentence completion attack can cause it to repeat the full patient database.",
  },
  5: {
    what: "RAG (Retrieval-Augmented Generation) poisoning attacks BLACKBUCK's drug formulary database rather than its system prompt or conversation. BLACKBUCK looks up drug dosages before answering clinical questions. An attacker who injects a fake formulary circular into the database causes BLACKBUCK to recommend a lethal Warfarin overdose — to every patient and doctor who asks.",
    why: "When BLACKBUCK retrieves a drug dosage guideline from its formulary database, it presents that information as clinical fact. LLMs have no independent verification mechanism — they cannot assess whether a retrieved document is a real medical guideline or a fabricated one. A poisoned formulary entry gets cited with the same authority as a genuine hospital protocol.",
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
        <div className="text-amber-400 font-mono text-xs tracking-widest mb-1">LAB {labNumber} OF 5 — PHASE 1: LEARN</div>
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
