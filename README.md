# Cartana AI

Cartana AI converts manager voice/text input into structured, assignable tasks through an asynchronous AI pipeline.

This project is designed as a practical systems-engineering showcase: typed LLM boundaries, queue-based background processing, role-aware APIs, and real-time collaboration.

## What I Built

- End-to-end voice/text -> task workflow with traceable multi-stage processing
- Structured extraction via tool/function-calling and Pydantic validation
- Confidence-aware routing of uncertain output to `NEEDS_REVIEW`
- Celery + Redis async orchestration with retry/backoff semantics
- Role-aware Kanban operations and real-time manager/member chat

## Architecture

1. Manager submits text or audio input
2. FastAPI validates request, creates a `Note (PENDING)`, and queues a Celery job
3. Worker handles transcription (if audio), task detection, entity extraction, and normalization
4. Pipeline persists `Task` rows with workflow states: `NEEDS_REVIEW`, `TODO`, `IN_PROGRESS`, `DONE`
5. Frontend polls job status and renders tasks, note history, and pipeline trace
6. WebSocket channels deliver real-time chat and task-related updates

Flow:

Input -> FastAPI -> Redis queue -> Celery worker -> AI + normalization -> PostgreSQL -> React UI

## Tech Snapshot

- Backend: FastAPI, SQLAlchemy, Celery, Redis, PostgreSQL
- Frontend: React, Vite, Tailwind CSS, Axios
- AI: Groq LLM + Whisper STT
- Realtime: WebSockets
- DevOps: Docker Compose

## Engineering Decisions

- Typed LLM boundary: extraction returns a strict schema; invalid/uncertain payloads are handled explicitly instead of silently writing low-quality data.
- Confidence gate: low-confidence or missing-title outputs are surfaced to `NEEDS_REVIEW`, preserving operator control.
- Async reliability: worker task uses bounded retries with exponential-style backoff to improve resilience for transient AI/network faults.
- Traceability: each note keeps stage-by-stage pipeline trace for debugging and postmortem visibility.
- Role-aware contracts: managers see all tasks; employees are scoped to assigned tasks and authorized chat threads.

## Data Model (High Level)

- `User`: identity + role (`MANAGER`, `EMPLOYEE`)
- `Note`: original input, processing status, and pipeline trace
- `Task`: normalized execution unit with assignee, priority, deadline, and workflow state
- `Message`: chat payload for task channels and manager/member direct threads

## API Highlights

- `POST /process-input`: submit text/audio and receive `note_id` + `job_id`
- `GET /status/{job_id}`: check asynchronous processing status
- `GET /notes`, `GET /notes/{note_id}`: fetch history and stage trace
- `GET /tasks`, `PATCH /tasks/{task_id}`, `DELETE /tasks/{task_id}`: task lifecycle
- `GET /chat/members`, `GET /chat/threads/{member_id}/messages`: member chat retrieval
- WebSockets: `/ws/tasks/{task_id}`, `/ws/chat/{member_id}`

## Failure Handling

- Pipeline-level exceptions mark note status as `FAILED`
- Per-sentence extraction failures are recorded in trace without dropping the full batch
- Audio upload validation includes extension checks and request-size limiting
- Rate limiting is enforced for input processing endpoint

## Run Locally

### 1. Configure backend env

Create `backend/.env`:

```env
DATABASE_URL=postgresql://<user>:<password>@<host>/<db>?sslmode=require
GROQ_API_KEY=<your_groq_api_key>
EXTRACTION_MODEL=llama-3.3-70b-versatile
STT_MODEL=whisper-large-v3
```

### 2. Start backend + worker + redis

```bash
docker-compose up --build
```

### 3. Start frontend

```bash
cd frontend
npm install
npm run dev
```

## Local Endpoints

- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- API docs: http://localhost:8000/docs

## Trade-offs and Next Iterations

- Current assignee mapping uses lightweight fuzzy name matching; entity resolution can be improved with stronger matching heuristics.
- Date normalization is timezone-biased and should be made user/team timezone aware.
- Frontend API/WS base URLs are localhost-focused and should be environment-driven for deployment.

## Repository Notes

- Deep backend walkthrough: `readmeonboard.md`
- Core backend code: `backend/app`
- Frontend components: `frontend/src/components`

## Status

Active WIP with a strong engineering baseline for AI workflow reliability, typed model integration, and collaborative task execution.
