
# 🎯 AI-Powered Task Extraction & Management Platform

## 📌 Project Overview

### Objective

Build a **multi-modal AI-powered platform** that converts managerial voice notes or text inputs into structured, assignable tasks.

The system automatically extracts:

* ✅ Task descriptions
* 📅 Deadlines (normalized to standard format)
* 🔥 Priorities
* 👤 Assignees

This helps teams move from informal communication to organized task management seamlessly.

---

## 🚩 Problem Statement

Managers often communicate tasks through:

* Meetings
* Voice notes
* Informal chats

Converting these into structured, trackable tasks takes time and leads to:

* ❌ Miscommunication
* ❌ Missed deadlines
* ❌ Lack of clarity

This platform automates task extraction and structuring, improving efficiency, accountability, and workflow clarity.

---

## 🚀 Core Features (MVP)

### 🎙️ Multi-Modal Input

* Record live audio
* Upload audio files
* Direct text input

### 🤖 AI-Powered Processing

* Speech-to-Text conversion
* Intelligent task extraction
* Assignee detection
* Priority classification
* Deadline normalization (e.g., “next Friday” → `2026-03-06`)

### 📋 Task Management Interface

* Kanban Board with columns:

  * **To Do**
  * **In Progress**
  * **Done**

---

## 🛠️ Tech Stack

### Frontend

* **React**

### Backend

* **FastAPI**

### Database

* **PostgreSQL**

### AI & Processing

* **Whisper** – Speech-to-Text
* **LLM API** – Task extraction & structuring
* **dateparser** – Natural language date normalization

---

## 🧠 High-Level Workflow

1. User provides input (audio/text)
2. Audio → Transcribed using Whisper
3. Transcription → Sent to LLM
4. LLM extracts structured task data
5. Deadlines normalized via dateparser
6. Task stored in PostgreSQL
7. Displayed on Kanban board

---

## 🎯 Target Users

* Project Managers
* Team Leads
* Startup Teams
* Engineering Teams

---

## 📈 Future Enhancements (Post-MVP)

* User authentication & role-based access
* Slack / Email integration
* Smart deadline reminders
* Task analytics dashboard
* Team performance insights

---
