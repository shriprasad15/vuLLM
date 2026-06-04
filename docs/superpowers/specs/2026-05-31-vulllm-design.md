# Operation: vuLLM — Design Spec
**Date:** 2026-05-31  
**Status:** Approved  
**Audience:** Conference/workshop presenters + students/learners  

---

## 1. Overview

**Operation: vuLLM** is a gamified, story-driven cybersecurity demo tool that teaches LLM attack and defense techniques. It is built to be presented live at conferences and workshops — including to non-technical audiences like IAS officers — and doubles as a self-paced student learning platform.

The experience is framed as a CTF (Capture The Flag) narrative called **"Operation: vuLLM"**, where participants discover vulnerabilities in a fictional government AI called BLACKBUCK, exploit them, then progressively harden it using real defensive techniques.

---

## 2. The Narrative: "Operation: vuLLM"

### Premise
The government has deployed **BLACKBUCK** — an AI assistant for a critical ministry (citizen services, intelligence briefings, policy drafting). The audience plays the role of a newly appointed cybersecurity task force. Their mission: discover how BLACKBUCK can be compromised, then secure it before adversaries do.

### Story Acts

| Act | Title | Theme |
|-----|-------|--------|
| 0 | BLACKBUCK Goes Live | Introduction — BLACKBUCK deployed with zero security |
| 1 | Cracks in the Oracle | Basic attacks: prompt injection, jailbreaking |
| 2 | How Deep Does It Go? | Advanced attacks: indirect injection, data leakage, multi-turn, poisoning |
| 3 | Securing the Oracle | Progressive defense: Tier 1 → Tier 2 → Tier 3 |
| 4 | The Showdown | Same attacks vs. hardened BLACKBUCK — score comparison |

Each act opens with a **cinematic intro card** (dramatic text, mission briefing style) before the interactive challenge interface appears.

---

## 3. Attack Modules (6 Categories)

### Act 1 Attacks
1. **Prompt Injection** — Hidden instructions embedded in a "citizen query" hijack BLACKBUCK's behavior (e.g., `Ignore previous instructions and...`)
2. **Jailbreaking** — Roleplay exploits, DAN-style prompts, and persona hijacking bypass BLACKBUCK's guidelines

### Act 2 Attacks
3. **Indirect Prompt Injection** — A malicious document BLACKBUCK is asked to summarize contains hidden instructions that alter its output
4. **Model/System Prompt Extraction** — Tricking BLACKBUCK into revealing its system prompt or training context
5. **Multi-Turn Manipulation** — Gradual context manipulation across a conversation to shift BLACKBUCK's behavior incrementally
6. **RAG/Knowledge Poisoning** — Corrupted knowledge base entries feed BLACKBUCK false or dangerous information

Each attack module includes:
- A mission briefing card (context only — no hints about the attack technique)
- A pre-loaded example payload (one click to fire)
- A free-form input for improvisation
- A success condition that awards a **flag** when the attack works
- A **post-flag debrief** unlocked only after capture: explains what the attack is, why it worked, real-world examples, and a teaser of the defense coming in Act 3

---

## 4. Defense System (3 Progressive Tiers)

Defense tiers are applied as middleware wrapping every LLM call. They layer on top of each other — each tier includes all previous tiers.

| Tier | Name | Techniques |
|------|------|-----------|
| 1 | Basic Shield | Input/output filtering, keyword blocklists, system prompt hardening |
| 2 | The Watchman | LLM-as-judge (secondary model audits responses), semantic similarity checks |
| 3 | The Fortress | Prompt firewall (Rebuff/LakeraGuard-style), RAG sanitization, full input validation pipeline |

**Demo flow:** Start each Act 3 scenario with defenses disabled. Then enable Tier 1 — show which attacks it stops and which slip through. Enable Tier 2, then Tier 3. The audience watches the attack surface close in real time.

Admin can toggle defense tiers globally to override player state during live demos.

---

## 5. Gamification & Scoring

### Flag System
- Each successful attack captures a **flag** (server-side validated, not spoofable)
- Flags are themed as "breach reports" in Acts 1-2 and "threats neutralized" in Act 3-4
- Total flags = attack flags captured + defense flags (attacks blocked after defenses enabled)

### Scoring
- Points awarded per flag, weighted by attack difficulty
- Time bonus if admin has enabled per-act timers
- Final Act 4 score comparison: `BLACKBUCK v0 (no defenses)` vs `BLACKBUCK v4 (full defenses)` side by side

### Leaderboard
- Live leaderboard visible to all players
- Shows: rank, username, score, flags captured, current act
- Admin can reset leaderboard between sessions

---

## 6. Architecture

### Two Portals
- **Player Portal** (`/`) — Story-driven demo experience
- **Admin Portal** (`/admin`) — Password-protected presenter/instructor dashboard (JWT auth)

### Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React (Vite) + Tailwind CSS + shadcn/ui |
| Backend | FastAPI (Python) |
| LLM | Ollama (Llama 3.1 8B) — primary, local, unguarded |
| LLM Alt | OpenAI API — optional toggle for contrast demos |
| Database | SQLite (local) / PostgreSQL (cloud) |
| Auth | JWT (admin only) |
| Realtime | WebSockets (live leaderboard + admin monitor) |

### System Diagram
```
┌──────────────┐    ┌─────────────────┐
│  Player UI   │    │   Admin UI      │
│     /        │    │   /admin        │
└──────┬───────┘    └────────┬────────┘
       │                     │
       └──────────┬──────────┘
                  │ REST + WebSocket
         ┌────────▼────────┐
         │ Auth Middleware  │  (JWT for admin routes)
         ├─────────────────┤
         │  Attack Modules  │  (6 isolated modules)
         │  Defense Layers  │  (3 middleware tiers)
         │  Flag Engine     │  (server-side validation)
         │  Session Store   │  (per-user state)
         ├─────────────────┤
         │  SQLite/Postgres │  (all interactions stored)
         └────────┬────────┘
                  │
         ┌────────▼────────┐
         │ Ollama (local)  │  + optional OpenAI toggle
         └─────────────────┘
```

---

## 7. Data Storage

Every interaction is stored for post-workshop analysis and admin monitoring.

### Schema

**users**
```
id, username, session_id, created_at, ip_address
```

**interactions**
```
id, user_id, session_id, act, attack_type, defense_tier_active,
prompt, response, flag_captured, success, timestamp
```

**flags**
```
id, user_id, flag_name, act, attack_type, points, captured_at
```

**admin_settings**
```
act, timer_enabled, timer_seconds, act_locked, defense_tier_override, updated_at
```

---

## 8. Admin Dashboard

### Live Monitor
- All active users, current act, score, last prompt sent
- Real-time WebSocket feed of every interaction as it happens
- Flag capture timeline per user

### Analytics
- Per-user full interaction history (filterable by act, attack type, outcome)
- Heatmap: which attacks succeed most, which levels users get stuck on
- Solve rate per act and per attack category

### Level Controls (Admin Only)
- Enable/disable timer per act with configurable seconds
- Lock/unlock acts (force group to specific act for guided walkthrough)
- Toggle defense tiers globally (override all player states)
- Reset individual user or all users
- Enable/disable specific attack modules

### Export
- Download full interaction log as CSV
- Download per-user report

---

## 9. Deployment

### Local (Primary)
- Single command startup: `docker-compose up`
- Ollama installed and model pulled automatically on first run
- Runs entirely offline — no internet dependency on stage

### Cloud (Future)
- Same Docker setup deployable to any VPS (DigitalOcean, AWS, etc.)
- Switch SQLite → PostgreSQL for multi-node
- Add HTTPS via Nginx reverse proxy

---

## 10. Project Structure

```
vuLLM/
├── backend/
│   ├── main.py                  # FastAPI app entry
│   ├── routers/
│   │   ├── attacks.py           # 6 attack endpoints
│   │   ├── defenses.py          # 3 defense tier endpoints
│   │   ├── flags.py             # Flag capture + scoring
│   │   ├── admin.py             # Admin dashboard endpoints
│   │   └── auth.py              # JWT auth
│   ├── modules/
│   │   ├── prompt_injection.py
│   │   ├── jailbreak.py
│   │   ├── indirect_injection.py
│   │   ├── data_leakage.py
│   │   ├── multi_turn.py
│   │   └── rag_poisoning.py
│   ├── defenses/
│   │   ├── tier1_basic.py
│   │   ├── tier2_watchman.py
│   │   └── tier3_fortress.py
│   ├── llm/
│   │   ├── ollama_client.py
│   │   └── openai_client.py
│   └── db/
│       ├── models.py
│       └── database.py
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── PlayerPortal.tsx   # Story-driven player view
│   │   │   └── AdminPortal.tsx    # Admin dashboard
│   │   ├── components/
│   │   │   ├── ActCard.tsx        # Cinematic act intro
│   │   │   ├── AttackPanel.tsx    # Attack interface
│   │   │   ├── DefensePanel.tsx   # Defense tier toggles
│   │   │   ├── Leaderboard.tsx    # Live scoring
│   │   │   ├── FlagCapture.tsx    # Flag animation
│   │   │   └── AdminMonitor.tsx   # Real-time feed
│   │   └── hooks/
│   │       └── useWebSocket.ts    # Live updates
│   └── package.json
├── docker-compose.yml
├── Makefile                       # make dev, make build, make reset
└── README.md
```

---

## 11. Success Criteria

- [ ] All 6 attack modules work against undefended BLACKBUCK
- [ ] Each attack is demonstrably blocked by the appropriate defense tier
- [ ] Admin can control timers, lock acts, and toggle defenses live
- [ ] Every interaction stored and viewable in admin dashboard
- [ ] Leaderboard updates in real time
- [ ] Full demo runs offline on a single laptop
- [ ] Single command startup (`docker-compose up`)
- [ ] IAS-officer-friendly UI — no technical jargon visible to players, all drama and storytelling
