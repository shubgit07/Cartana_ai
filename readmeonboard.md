# Cartana Backend: Core Workflow & Architecture Guide

Welcome to the Cartana backend codebase. This document explains the core engineering workflows, particularly focusing on how a manager's raw text or voice input is ingested, processed by AI, normalized, and turned into actionable, assigned tasks.

This guide details the system as it currently implemented in the repository to help you safely edit the codebase.

---

## 1. Project Structure and Code Map
The backend is a FastAPI application paired with a Celery/Redis worker queue. All core domain logic lives inside the `backend/app/` folder.

**Key files and modules:**
- **`app/main.py`**: The FastAPI application entrypoint. Configures CORS, enforces HTTP request size limits, and initiates database tables on startup.
- **`app/api/routes.py`**: The central controller for all REST endpoints (tasks, notes/inputs, chat) and WebSocket connections.
- **`app/core/celery_app.py`**: Configures the Celery application, connecting it to the Redis message broker (`redis://redis:6379/0`).
- **`app/workers/worker_main.py`**: Defines the background worker tasks (e.g., `run_task_pipeline`). This is where audio transcription happens before handing off to the pipeline.
- **`app/services/pipeline.py`**: The `TaskPipeline` class. The orchestrator of the multi-stage AI extraction process. Maps extracted entities to database records.
- **`app/services/ai.py`**: Wraps the LLM integration (Groq). Houses the two critical LLM prompts: `detect_tasks` (splitting chunks) and `extract_entities` (structuring data).
- **`app/services/normalization.py`**: Pure Python logic to make unstructured strings deterministic (e.g., converting "tomorrow" into a timezone-aware ISO datetime).
- **`app/models/models.py`**: SQLAlchemy ORM definitions (`User`, `Note`, `Task`, `Message`).
- **`app/models/schemas.py`**: Pydantic models for strictly validating API payloads and serializing DB responses.

---

## 2. Multi-Stage Deterministic AI Pipeline
The AI extraction process does not happen in a single LLM prompt. Instead, it relies on a multi-stage deterministic pipeline. Multi-stage processing is better here mostly to prevent LLM hallucinations, enforce schema rigidity, and allow clear mid-flight debugging via pipeline traces.

**The Flow:**
1. **Ingestion (`routes.py`)**: A text snippet or audio file enters via `POST /process-input`.
2. **Transcription (`worker_main.py`)**: If the input is audio, `transcribe_audio()` converts it to text synchronously inside the worker process.
3. **Stage 1: Detection (`pipeline.py` calling `ai.py`)**: The raw text goes to the LLM via `detect_tasks()`, which splits the transcript into a list of distinct actionable sentences.
4. **Stage 2: Extraction (`pipeline.py` calling `ai.py`)**: A loop iterates over the sentences. For each one, `extract_entities()` asks the LLM to pull out five specific keys: `title`, `description`, `assignee_name`, `priority`, and `deadline_text`.
5. **Stage 3: Normalization & Persisting (`pipeline.py`)**: The raw string values output by the LLM are passed through the normalization layer (see below) before being inserted into the database as a new `Task`.

**Limitations & Missing Pieces:**
- Currently, there are no built-in auto-retry configurations on the LLM functions. If Groq API drops the connection, the extraction for that specific sentence fails.
- The system asks for JSON but does not utilize native function-calling or strict Pydantic validation on the LLM response layout. It relies heavily on `dict.get()`.

---

## 3. Asynchronous Job Processing and Worker Orchestration
Because transcription and multi-stage LLM prompting take tens of seconds, Cartana offloads this work to a background queue.

- **Why Celery/Redis?**: Prevents API timeouts for the manager uploading long audio blocks.
- **Orchestration**: When `/process-input` is called, a `Note` record is created with a `PENDING` status. The API then calls `run_task_pipeline.delay(note.id, ...)` which publishes the job to Redis. The API immediately responds with a `job_id`.
- **The Worker**: Celery picks up the job, executing `run_task_pipeline` in `worker_main.py`. The worker handles transcription, triggers `TaskPipeline`, and updates the `note.pipeline_trace` JSONB field progressively so the frontend can display exact status (e.g., "Detecting tasks...").
- **Error Behavior**: If a single task extraction fails, it logs an error in the trace and skips to the next sentence. If the entire pipeline crashes, an exception handler marks the Note status as `FAILED`.

*What should be added for production*: Celery tasks currently lack `@celery_app.task(bind=True, autoretry_for=(Exception,), retry_backoff=True)` ensuring resilience against transient network/API failures.

---

## 4. Deterministic Normalization Layer
The backend avoids relying fully on the LLM by explicitly passing fuzzy LLM responses through strict, code-based normalizers.

**Where it lives**: `app/services/normalization.py`
- **Dates (`normalize_date`)**: Uses the `dateparser` library to parse dates like "Next Friday at 4pm" into an exact `datetime` explicitly locked to the `Asia/Kolkata` timezone. If `dateparser` fails, the code falls back to explicitly prompting the LLM for a naive ISO string relative to the current time, which it then localizes.
- **Priorities (`normalize_priority`)**: Uses simple substring scans. If the LLM generates "urgent" or "asap", it hard-clamps it to `"high"`. If it outputs "whenever", it clamps to `"low"`.
- **Assignees (`pipeline.py`)**: Instead of dumping the LLM's `assignee_name` text into the Task record, the pipeline runs a case-insensitive `ILIKE` DB query (`%assignee_name%`) against the `User` table to resolve an exact `assignee_id`. If omitted, it defaults back to the manager.

*Improvements needed*: The Assignee fuzzy matching is very basic. Over time, it needs Levenshtein distance matching or sending the list of actual available team members directly into the LLM context prompt.

---

## 5. API Documentation for the Core Workflow
These are the exact API surfaces the frontend uses to drive this core flow.

- **`POST /process-input`** (Async trigger)
  - **Purpose**: Manager submits a request to process a new audio file or text payload.
  - **Request Body**: `Multipart/form-data` containing `user_id`, `text` (optional), `file` (optional audio).
  - **Response**: `{ "message": "...", "note_id": 12, "status": "pending", "job_id": "uuid-..." }`
  - **Defined in**: `routes.py` -> triggers `worker_main.py` task.

- **`GET /status/{job_id}`** (Sync)
  - **Purpose**: Frontend polls this endpoint to check if the Celery worker has finished the background process.
  - **Response**: `{ "job_id": "...", "status": "SUCCESS" | "PENDING" | "FAILURE", "result": ... }`

- **`GET /notes/{note_id}`** (Sync)
  - **Purpose**: Retrieves the final text and the `pipeline_trace` JSON dict mapping out what the AI extracted.

- **`GET /tasks`** (Sync)
  - **Purpose**: Fetches created tasks. Filters automatically by Role (Managers see all, Employees see only their assigned IDs).

- **`PATCH /tasks/{task_id}`** (Sync API, async WebSockets)
  - **Purpose**: Modifies the task (changing status on a Kanban board). Wait, it modifies the DB in-sync, but immediately queues a background task to broadcast the task update to all connected clients via `websocket_manager.py`.

---

## 6. Database and Data Model
SQLAlchemy models are implemented in `app/models/models.py`.

- **`User`**: The actors (Managers and Employees). Essential for the assignee mapping step.
- **`Note`**: Represents the initial raw input from the Manager.
  - *Key fields*: `raw_text`, `status` (PENDING, PROCESSED, FAILED), `job_id` (Celery UUID mapping), `pipeline_trace` (JSONB for diagnostic UI steps).
- **`Task`**: The structured output of the AI pipeline.
  - *Key fields*: `title`, `priority`, `deadline`, `status` (TODO, IN_PROGRESS, DONE).
  - *Relationships*: `assignee_id` -> `User.id` and `note_id` -> `Note.id`.
- **`Message`**: Powers the Chat feature either on the task scope or a direct Manager <-> Member scope.

---

## 7. What a Developer Should Edit to Change Behavior
To safely modify different mechanics of this system, navigate here:
- **Change what data the AI pulls from the text?**: Edit the prompt block inside `extract_entities` in `app/services/ai.py`.
- **Change how the AI assigns a task to an employee?**: Edit the `target_user` DB matching logic in `app/services/pipeline.py` *(around line 60)*.
- **Add a new Task status/field?**: Update the TaskStatus Enums in `app/models/models.py`, update `TaskUpdate`/`TaskResponse` inside `app/models/schemas.py`, and migrate the DB schema.
- **Make date/time parsing smarter?**: Edit `normalize_date` inside `app/services/normalization.py`.
- **Inject custom data into API responses?**: Update the Pydantic schemas in `app/models/schemas.py` and modify the endpoints inside `api/routes.py`.

---

## 8. Current Limitations and Risks
- **Race conditions with Assignees**: The `ILIKE` username assignee matcher will aggressively fail if multiple employees share similar first names.
- **Failure Cases without Recovery**: If the Celery worker restarts midway through a transcription, the job will fail and the `Note` remains stuck on `PENDING` unless manually transitioned.
- **Missing Payload Validations**: In `ai.py` `extract_entities()`, JSON is unpacked and parsed naively via `.get()`. If the LLM generates a differently nested JSON tree, tasks will be created with `None`/`Null` fields cleanly without throwing an exception.
- **Timezone complexity**: Currently locked explicitly to `Asia/Kolkata` inside `normalization.py`. If this deploys across timezones, it must be rewritten to respect `user_id` context.

---

## 9. Onboarding Summary
The minimal mental model required to grok this codebase:

1. A Manager clicks "Record" -> hits `POST /process-input`.
2. A fast API creates a `Note` in Postgres with status `PENDING`, dispatches a Celery `job_id`, and returns it to the UI.
3. The UI begins aggressively polling `GET /status/{job_id}`.
4. Meanwhile, a background Celery worker transcribes audio, uses an LLM to split sentences, extracts fields, and tries to match a name to a `User.id` row.
5. `Task` rows are inserted into Postgres, and the `Note` is marked `PROCESSED`.
6. The user interface polls `GET /notes/{note_id}` and `GET /tasks` to display the new Kanban cards.

**Read strategy**: Start by reading `app/api/routes.py` to see the API contracts. Then open `app/workers/worker_main.py` -> `app/services/pipeline.py` to witness the exact sequence of the asynchronous brain.
