# Daily Planner

Namaz tracker + Quran para schedule, to-do list with reviews, and a 24-hour time log.

- **backend/**: FastAPI + SQLite (SQLModel). Your data lives in `backend/planner.db`.
- **frontend/**: Next.js 15 (App Router) + TypeScript. Calls `/api/*`, which Next forwards to FastAPI.

## Run it (two terminals)

**1. Backend** (Python 3.10+)
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
API docs: http://localhost:8000/docs

**2. Frontend** (Node 20+)
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:3000

If the API runs somewhere else: `BACKEND_URL=http://host:port npm run dev`.

## Features
- **Namaz & Quran**: month calendar, tick any of Fajr/Zuhr/Asr/Maghrib/Isha per day. Each date shows its para: day 1 = Para 1 ... day 30 = Para 30, day 31 = revision. Mark each para as read; monthly totals.
- **To-do**: add with optional due date, tick done, write a review for finished tasks, filter, delete.
- **Water**: count glasses per day (quick +/- on Today, tap-a-glass on the Water tab), adjustable daily goal, 14-day history with average and goal-reached days.
- **Time log**: log "12:00-14:00 Office time" with a category, 24h timeline bar, productive vs total hours, day rating + reflection, last-7-days table.
  Productive = Ibadah, Work/Study, Health, Family.

## Tests
```bash
cd backend && source .venv/bin/activate && pytest
cd frontend && npm run typecheck && npm run build
```

## Notes
- Single-user app with no login. Keep it on your own machine/network, don't expose it publicly as is.
- Back up by copying `backend/planner.db`.
- Dates use your browser's local day, so "today" is correct in your timezone.
