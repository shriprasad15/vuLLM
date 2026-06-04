.PHONY: dev build reset pull-model tunnel tunnel-named

dev:
	@echo "Starting backend..."
	cd backend && uvicorn main:app --reload --port 8000 &
	@echo "Starting frontend..."
	cd frontend && npm run dev &
	@echo "vuLLM running: http://localhost:5173 | Admin: http://localhost:5173/admin"

build:
	docker-compose up --build -d
	@echo "Pulling model (first time only)..."
	docker-compose exec ollama ollama pull llama3.1:8b

# Start everything + Cloudflare quick tunnel (no account needed).
# The public URL appears in: docker-compose logs tunnel-quick
tunnel:
	docker-compose --profile quick-tunnel up -d
	@echo "Waiting for tunnel URL..."
	@sleep 4
	@docker-compose logs tunnel-quick 2>&1 | grep -o 'https://[^ ]*trycloudflare.com' | tail -1 | xargs -I{} echo "  Backend public URL: {}"
	@echo "  Rebuild frontend with: VITE_API_URL=<url above> && cd frontend && npm run build"
	@echo "  Then re-trigger GitHub Pages deploy with the URL."

# Named tunnel (requires CLOUDFLARE_TUNNEL_TOKEN in .env — free Cloudflare account).
# Gives a stable subdomain like https://vulllm.yourdomain.com
tunnel-named:
	docker-compose --profile tunnel up -d

reset:
	docker-compose down -v
	rm -f backend/vulllm.db

pull-model:
	docker-compose exec ollama ollama pull llama3.1:8b
