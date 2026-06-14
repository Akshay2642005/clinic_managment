# AGENTS.md — AI Agent Service

## Tech Stack
- Python 3.11 / FastAPI / uv
- OpenAI-compatible LLM (configurable via env vars)
- httpx for backend API calls (http://backend:8000/api/v1/*)

## Dev Commands
| What | Command |
|------|---------|
| Install deps | `uv sync` |
| Start dev server | `uv run python main.py` (port 8080, reload on) |
| Full stack | `docker compose up --build` from repo root |

## Architecture
- `orchestrator/` — FastAPI app, intent classifier, session store, LLM client
- `booking/` — Features 1+2: booking by symptom/doctor + schedule changes
- `search/` — Role-aware queries for appointments, patients, doctors
- `advisory/` — Feature 3: pre-visit checklist (fasting, meds, documents)
- `shared/` — Pydantic models, httpx backend client
- Agents call the backend API via httpx — they do not access the DB directly
- Each tool function checks the user's role before executing

## Key Constraints
- Booking agent: patients modify only their own appointments; staff/doctor can manage any
- Advisory agent: patient-exclusive, auto-triggered after successful booking
- Search agent: patients see own data; doctors see own schedule; staff see all
- Every advisory response must include a medical disclaimer
- Sessions expire after 30 minutes of inactivity

## LLM Configuration (agent/.env)
- `OPENAI_API_KEY` — API key
- `OPENAI_BASE_URL` — API base URL (default: https://api.openai.com/v1)
- `OPENAI_MODEL` — Model name (default: gpt-4o-mini)
