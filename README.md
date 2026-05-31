# Operation: vuLLM

A gamified LLM security demo platform featuring BLACKBUCK, a fictional government AI.

## Quick Start (Local Dev)

1. Start Ollama: `ollama serve`
2. Pull model: `ollama pull llama3.1:8b`
3. Start backend: `cd backend && pip install -r requirements.txt && cp .env.example .env && uvicorn main:app --reload --port 8000`
4. Start frontend: `cd frontend && npm install && npm run dev`
5. Open: http://localhost:5173 | Admin: http://localhost:5173/admin (password: changeme)

## Docker

```bash
make build        # Build and start everything
make pull-model   # Pull Llama model (first time only)
make reset        # Wipe all data and containers
```

## Attack Modules

| Operation | Attack Type | Points |
|-----------|------------|--------|
| OPERATION NEEDLE | Prompt Injection | 100 |
| OPERATION PERSONA | Jailbreak | 150 |
| OPERATION TROJAN | Indirect Injection | 200 |
| OPERATION MIRROR | Data Leakage | 175 |
| OPERATION PATIENCE | Multi-Turn | 250 |
| OPERATION POLLUTE | RAG Poisoning | 300 |

## Defense Tiers

- **Tier 1: Basic Shield** — Keyword blocklists, input length limits
- **Tier 2: The Watchman** — LLM-as-judge real-time auditing  
- **Tier 3: The Fortress** — Full validation pipeline, pattern detection, output sanitization
