# Cartana AI (WIP)

Cartana AI is a full-stack voice/text-to-task intelligence platform that converts unstructured managerial input into structured, editable tasks using an asynchronous AI pipeline.

## Features
- Voice + text input processing  
- Async AI pipeline (transcription → extraction → normalization)  
- Automatic task creation with deadline, priority, assignee  
- Kanban board   
- Real-time task chat using WebSockets  
- Pipeline trace for debugging and transparency  

## Tech Stack
- Backend: FastAPI, Celery, Redis, PostgreSQL  
- Frontend: React, Vite, TailwindCSS  
- AI: Whisper, LLM-based extraction  
- Real-time: WebSockets + Redis Pub/Sub  
- DevOps: Docker, Docker Compose  

## Architecture
Input → FastAPI → Redis Queue → Celery Worker → AI Pipeline → PostgreSQL → Frontend  






Getting Started
```bash
git clone https://github.com/your-username/cartana-ai.git
cd cartana-ai
docker-compose up --build
