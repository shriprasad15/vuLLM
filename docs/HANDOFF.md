# vuLLM — Session Handoff Note

## What was just decided

Redesign BLACKBUCK from Ministry of Digital Affairs → **Aarogya General Hospital HMIS**.

Three roles: **Patient / Doctor / Admin** — selected at registration.

## Status

**Nothing implemented yet for HMIS.** The previous session wrote the spec and plan but did not execute any code changes.

All existing code still uses the Ministry theme. The HMIS implementation starts fresh.

## Where to start

```
docs/superpowers/plans/2026-06-04-hmis-redesign.md
```

This is a complete 9-task implementation plan with full code for every step. Use subagent-driven development (option 1) to execute it.

To start in a new chat, say:
> "Continue the HMIS redesign. Read docs/superpowers/plans/2026-06-04-hmis-redesign.md and execute it using subagent-driven development."

## Task list (all pending)

| Task | What it does |
|------|-------------|
| 1 | `backend/llm/ollama_client.py` — 3 HMIS system prompts, ATTACK_CONFIGS, role-aware get_system_prompt() |
| 2 | `backend/routers/attacks.py` — add role to AttackRequest, pass to mod.run() |
| 3 | All 6 attack modules — HMIS payloads + role param |
| 4 | `backend/routers/pdf.py` — hospital consent form PDF |
| 5 | `backend/labs/content.py` — 12 HMIS questions, 6 missions |
| 6 | `frontend/src/store/game.ts` — add role field, persist |
| 7 | `frontend/src/lib/api.ts` + `AttackPanel.tsx` — pass role through |
| 8 | `frontend/src/pages/PlayerPortal.tsx` + `LearnPhase.tsx` — role selector, HMIS concepts |
| 9 | End-to-end verification + push |

## Key design decisions

- **BLACKBUCK** name stays
- **Hospital:** Aarogya General Hospital
- **Patients:** P001 Rahul Sharma (diabetic), P002 Priya Menon (pregnant), P003 Arjun Das (post-cardiac, on Warfarin 5mg)
- **RAG poison:** Fake AFC/2024/CARD/089 circular says Warfarin 50mg (10x overdose)
- **ATTACK_CONFIGS:** Per-module temperature/top_p — NOT hardcoded to specific payloads. Any authority-framed prompt in the right category will work.
- Role is passed from frontend → api.ts → attacks router → mod.run() → get_system_prompt(mode, role)

## Current git state

Branch: main
Latest commit: bb9f0acd docs: HMIS redesign implementation plan — 9 tasks, full code
