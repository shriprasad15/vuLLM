.PHONY: dev build reset pull-model

dev:
	@echo "Starting backend..."
	cd backend && uvicorn main:app --reload --port 8000 &
	@echo "Starting frontend..."
	cd frontend && npm run dev &
	@echo "vuLLM running: http://localhost:5173 | Admin: http://localhost:5173/admin"

build:
	docker-compose up --build -d
	@echo "Pulling Llama model (first time only)..."
	docker-compose exec ollama ollama pull llama3.1:8b

reset:
	docker-compose down -v
	rm -f backend/vulllm.db

pull-model:
	docker-compose exec ollama ollama pull llama3.1:8b
