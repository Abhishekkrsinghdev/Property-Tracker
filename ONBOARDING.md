# PropTrack AI — Developer Onboarding Guide

Welcome to **PropTrack AI**, a modern property co-ownership and automated management platform. This document will help you understand the architecture, key files, and workflow of the project at a glance.

---

## 🏛 Architecture Overview
The project follows a **Microservices-lite** approach using Docker Compose to orchestrate four main components:
1.  **Frontend:** React (Vite) + Tailwind CSS + Lucide Icons.
2.  **Backend:** Spring Boot (Java 21) + PostgreSQL + Flyway.
3.  **AI Service:** FastAPI (Python) + Claude 3.5 (Sonnet/Haiku).
4.  **Reverse Proxy:** Nginx (Handles routing between Frontend/Backend and serves static files).

---

## 📂 Directory Structure & Responsibilities

### 1. `backend/` (The Brain)
Handles business logic, security, and data persistence.
*   `src/main/java/com/proptrack/backend/controller/`: REST API endpoints (Auth, Property, Loan, OCR).
*   `src/main/java/com/proptrack/backend/service/`: Business logic.
    *   `StorageService.java`: Abstracted file handling (Local vs. S3).
    *   `AmortisationEngine.java`: Hard math for EMI and loan interest.
    *   `NotificationScheduler.java`: Automated email reminders via cron jobs.
*   `src/main/resources/db/migration/`: SQL files for Flyway (handles all table creation automatically).

### 2. `ai-service/` (The Intelligence)
A Python service dedicated to context-aware AI tasks.
*   `app/routers/advisor.py`: The Chat logic. It has "Tools" that let the AI "query" the Spring Boot backend for your specific property data.
*   `app/routers/ocr.py`: Claude Vision logic for reading payment receipts and legal documents.
*   `app/routers/finance.py`: Complex financial math and projection tools for the AI.

### 3. `frontend/` (The Experience)
A high-premium, responsive dashboard.
*   `src/pages/dashboard/`: Contains the `AppreciationChart` (Recharts) and summary cards.
*   `src/pages/payments/`: Payment logging with built-in OCR drag-and-drop.
*   `src/pages/documents/`: AI-powered document management.
*   `src/api/`: Typed Axios clients for communicating with the backend.

### 4. `nginx/` & `scripts/` (The Infrastructure)
*   `docker-compose.yml`: Local development setup.
*   `docker-compose.prod.yml`: Production setup (no builds, ready for SSL/HTTPS).
*   `scripts/setup-gcp.sh`: One-click setup script for your Google Cloud VM.

---

## 🏗 Key Workflows

### AI Advisor Workflow
1.  **User asks:** "How much interest do I save if I pay 2L extra?"
2.  **FastAPI** catches the request → identifies it needs property data.
3.  **FastAPI** calls **Spring Boot** `/api/properties` using the user's JWT.
4.  **FastAPI** receives data → performs math with `numpy-financial` → returns a human-friendly answer.

### Document/OCR Workflow
1.  **User uploads** a PDF/Receipt.
2.  **Spring Boot** saves the file to `/uploads` (local) or S3.
3.  **Spring Boot** sends the public URL to **FastAPI/OCR**.
4.  **FastAPI** uses Claude Vision to extract {Amount, UTR, Date, Bank}.
5.  **Frontend** pre-fills the form for the user to confirm.

---

## 🚀 Deployment Workflow
We use **GitHub Actions** for a zero-downtime CI/CD pipeline:
1.  **Code Push to `master`:**Triggers `.github/workflows/ci.yml`.
2.  **Build & Test:** Maven compiles Java; Ruff lints Python; Vite builds React.
3.  **Docker Push:** If tests pass, images are pushed to **GitHub Container Registry (GHCR)**.
4.  **SSH Deploy:** GitHub connects to your GCP VM and runs `docker compose pull && docker compose up -d`.

---

## 🛠 Adding a New Feature
1.  **Database:** Add a new `.sql` file in `backend/.../db/migration/`.
2.  **Backend:** Create a new `Entity`, `Repository`, `Service`, and `Controller`.
3.  **Frontend:** Add a new page in `frontend/src/pages/` and update `App.tsx` routes.
4.  **Environment:** If it needs a new API key, add it to `.env.example`.

---

## 📝 Configuration (The `.env` file)
*   `APP_STORAGE_PROVIDER`: Set to `local` (free) or `s3` (scalable).
*   `ANTHROPIC_API_KEY`: Required for Advisor and OCR.
*   `RESEND_API_KEY`: Required for automated email notifications.
