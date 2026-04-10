# Logistics CRM (Vite + React)

Ultra-modern, fully client-side logistics CRM dashboard. All data persists in **browser `localStorage`** as JSON via Zustand `persist` (mock backend).

## Prerequisites

- Node.js 18+

## Setup

```bash
cd logistics-crm
npm install
```

## Environment

Copy `.env.example` to `.env` and adjust if needed:

- `VITE_API_BASE_URL` — optional FastAPI base URL (Settings + quotation email “respond” links). Leave empty in Vite dev when using `docker compose` (same-origin `/api` proxy). See **Docker** below.

## Backend API (FastAPI)

The `backend/` service provides:

- **PostgreSQL** (JSONB documents for clients, enquiries, quotations, invoices; users + settings + email templates)
- **Redis** for short TTL list caching
- **Alembic** migrations (`backend/alembic/versions/`)
- **JWT auth** — `POST /api/auth/login` with `{ "email": "admin@demo.com" }` when `AUTH_ALLOW_EMAIL_ONLY=true` (Docker default), or `{ "email", "password" }` when disabled (seeded password `demo`)
- **Brevo proxy** — `POST /api/brevo/send` with header `Authorization: Bearer <token>` and body `{ "payload": { ... Brevo JSON ... } }` (uses server `BREVO_API_KEY`)
- **Public quotation respond** — `GET /api/public/quotations/{id}/respond?action=accept|reject&token=...` (HTML) or `POST` with JSON body

OpenAPI: `http://localhost:8000/docs` when the API is running.

Local (without Docker): install `backend/requirements.txt`, set `DATABASE_URL` / `REDIS_URL`, run `alembic upgrade head` from `backend/`, then `uvicorn app.main:app --reload`.

## Docker

### Dev stack (bind mounts for code + named volumes for DB/Redis/node_modules)

```bash
docker compose up --build
```

- **Frontend:** http://localhost:5173 — Vite proxies `/api` to the API container (`VITE_PROXY_API=http://api:8000`).
- **API:** http://localhost:8000/docs  
- **Postgres** data: volume `pg_data`  
- **Redis** AOF: volume `redis_data`  
- **node_modules:** anonymous volume `web_node_modules` (avoids overwriting Linux deps on Windows bind mounts).

Backend code is mounted at `./backend:/app` for live edits with `--reload`.

### Production-style (no source mounts, nginx + static build)

```bash
docker compose -f docker-compose.prod.yml up --build
```

- **App:** http://localhost — nginx serves the Vite build and proxies `/api/` to the API.

Set `JWT_SECRET` (and optionally `BREVO_API_KEY`) in the environment when deploying.

## Scripts

| Command       | Description        |
| ------------- | ------------------ |
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build   |
| `npm run preview` | Preview production build |

## Features

- Mock login (email + password); session token stored with persisted state.
- **Clients**, **Enquiries**, **Quotations**, **Invoices** with rich forms, TanStack Table (sort, paginate, search, column filters), and View / Edit / Delete.
- **Dashboard** KPIs and charts derived from stored data.
- **Settings**: API URL display, light/dark theme, **clear all local data** (testing).
- Client delete is **blocked** when referenced by enquiries, quotations, or invoices.

## Persistence

Data lives under the key `logistics-crm-storage` in `localStorage`. Clearing data from Settings removes that key and resets the in-memory store.
