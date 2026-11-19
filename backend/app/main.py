"""Daily planner API: prayers + Quran schedule, to-dos, time log."""
import calendar
import os
import re
from contextlib import asynccontextmanager
from datetime import date as Date, timedelta
from typing import Iterator

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, SQLModel, create_engine, select

from .juz import juz_for_day, juz_name
from .models import (
    CATEGORIES, DayNote, LogCreate, NoteUpdate, PrayerDay, PrayerUpdate,
    TimeLog, Todo, TodoCreate, TodoUpdate, WaterDay, WaterUpdate,
)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./planner.db")
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)

PRAYERS = ["fajr", "zuhr", "asr", "maghrib", "isha"]
TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


@asynccontextmanager
async def lifespan(_: FastAPI):
    SQLModel.metadata.create_all(engine)
    yield


app = FastAPI(title="Daily Planner API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_session() -> Iterator[Session]:
    with Session(engine) as s:
        yield s


# ---------------------------------------------------------------- helpers
def parse_date(value: str) -> Date:
    try:
        return Date.fromisoformat(value)
    except ValueError:
        raise HTTPException(422, f"Invalid date '{value}', expected YYYY-MM-DD")


def parse_month(value: str) -> tuple[int, int]:
    m = re.fullmatch(r"(\d{4})-(\d{2})", value)
    if not m or not 1 <= int(m.group(2)) <= 12:
        raise HTTPException(422, f"Invalid month '{value}', expected YYYY-MM")
    return int(m.group(1)), int(m.group(2))


def minutes_between(start: str, end: str) -> int:
    sh, sm = map(int, start.split(":"))
    eh, em = map(int, end.split(":"))
    d = (eh * 60 + em) - (sh * 60 + sm)
    return d + 1440 if d <= 0 else d  # past midnight


def log_out(l: TimeLog) -> dict:
    return {**l.model_dump(), "minutes": minutes_between(l.start, l.end)}


def prayer_out(d: Date, row: PrayerDay | None) -> dict:
    juz = juz_for_day(d.day)
    out = {p: bool(getattr(row, p)) if row else False for p in PRAYERS}
    out.update(
        date=d.isoformat(),
        quran=bool(row.quran) if row else False,
        juz=juz,
        juz_name=juz_name(juz),
    )
    return out


def day_summary(session: Session, d: str) -> dict:
    logs = session.exec(select(TimeLog).where(TimeLog.date == d)).all()
    by: dict[str, int] = {}
    for l in logs:
        by[l.category] = by.get(l.category, 0) + minutes_between(l.start, l.end)
    logged = sum(by.values())
    productive = sum(v for k, v in by.items() if CATEGORIES.get(k))
    note = session.get(DayNote, d)
    return {
        "date": d,
        "logged": logged,
        "productive": productive,
        "unaccounted": max(0, 1440 - logged),
        "by_category": by,
        "rating": note.rating if note else 0,
        "note": note.note if note else "",
    }


# ---------------------------------------------------------------- health
@app.get("/api/health")
def health():
    return {"ok": True}


# ---------------------------------------------------------------- prayers & quran
@app.get("/api/prayers")
def prayers_month(month: str = Query(..., description="YYYY-MM"), session: Session = Depends(get_session)):
    y, m = parse_month(month)
    days_in_month = calendar.monthrange(y, m)[1]
    first, last = Date(y, m, 1), Date(y, m, days_in_month)
    rows = {
        r.date: r
        for r in session.exec(
            select(PrayerDay).where(PrayerDay.date >= first.isoformat(), PrayerDay.date <= last.isoformat())
        ).all()
    }
    days = [prayer_out(Date(y, m, n), rows.get(Date(y, m, n).isoformat())) for n in range(1, days_in_month + 1)]
    today = Date.today()
    elapsed = [d for d in days if d["date"] <= today.isoformat()]
    stats = {
        "prayers_done": sum(sum(d[p] for p in PRAYERS) for d in days),
        "prayers_possible": 5 * len(elapsed),
        "perfect_days": sum(all(d[p] for p in PRAYERS) for d in days),
        "paras_read": sum(d["quran"] for d in days),
    }
    return {"month": month, "days": days, "stats": stats}


@app.put("/api/prayers/{date}")
def update_prayers(date: str, body: PrayerUpdate, session: Session = Depends(get_session)):
    d = parse_date(date)
    row = session.get(PrayerDay, date) or PrayerDay(date=date)
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(row, k, v)
    session.add(row)
    session.commit()
    session.refresh(row)
    return prayer_out(d, row)


# ---------------------------------------------------------------- todos
@app.get("/api/todos")
def list_todos(session: Session = Depends(get_session)):
    rows = session.exec(select(Todo).order_by(Todo.done, Todo.id.desc())).all()
    return rows


@app.post("/api/todos", status_code=201)
def create_todo(body: TodoCreate, session: Session = Depends(get_session)):
    if body.due:
        parse_date(body.due)
    t = Todo(title=body.title.strip(), due=body.due, created=Date.today().isoformat())
    session.add(t)
    session.commit()
    session.refresh(t)
    return t


@app.patch("/api/todos/{todo_id}")
def update_todo(todo_id: int, body: TodoUpdate, session: Session = Depends(get_session)):
    t = session.get(Todo, todo_id)
    if not t:
        raise HTTPException(404, "Todo not found")
    data = body.model_dump(exclude_none=True)
    if data.get("due"):
        parse_date(data["due"])
    if "done" in data and data["done"] != t.done:
        t.done_on = Date.today().isoformat() if data["done"] else ""
    for k, v in data.items():
        setattr(t, k, v)
    session.add(t)
    session.commit()
    session.refresh(t)
    return t


@app.delete("/api/todos/{todo_id}", status_code=204)
def delete_todo(todo_id: int, session: Session = Depends(get_session)):
    t = session.get(Todo, todo_id)
    if not t:
        raise HTTPException(404, "Todo not found")
    session.delete(t)
    session.commit()


# ---------------------------------------------------------------- time log
@app.get("/api/logs")
def list_logs(date: str, session: Session = Depends(get_session)):
    parse_date(date)
    rows = session.exec(select(TimeLog).where(TimeLog.date == date)).all()
    return [log_out(l) for l in sorted(rows, key=lambda l: l.start)]


@app.post("/api/logs", status_code=201)
def create_log(body: LogCreate, session: Session = Depends(get_session)):
    parse_date(body.date)
    for t in (body.start, body.end):
        if not TIME_RE.match(t):
            raise HTTPException(422, f"Invalid time '{t}', expected HH:MM (24h)")
    if body.category not in CATEGORIES:
        raise HTTPException(422, f"Unknown category '{body.category}'")
    l = TimeLog(**body.model_dump(), id=None)
    l.what = l.what.strip()
    session.add(l)
    session.commit()
    session.refresh(l)
    return log_out(l)


@app.delete("/api/logs/{log_id}", status_code=204)
def delete_log(log_id: int, session: Session = Depends(get_session)):
    l = session.get(TimeLog, log_id)
    if not l:
        raise HTTPException(404, "Log not found")
    session.delete(l)
    session.commit()


@app.get("/api/categories")
def categories():
    return [{"key": k, "productive": v} for k, v in CATEGORIES.items()]


# ---------------------------------------------------------------- water
def default_goal(session: Session) -> int:
    """Days with no record use the most recently set goal (8 glasses if none)."""
    last = session.exec(select(WaterDay).order_by(WaterDay.date.desc())).first()
    return last.goal if last else 8


def water_out(session: Session, d: str, row: WaterDay | None) -> dict:
    return {"date": d, "glasses": row.glasses if row else 0, "goal": row.goal if row else default_goal(session)}


@app.get("/api/water")
def get_water(date: str, session: Session = Depends(get_session)):
    parse_date(date)
    return water_out(session, date, session.get(WaterDay, date))


@app.put("/api/water/{date}")
def update_water(date: str, body: WaterUpdate, session: Session = Depends(get_session)):
    parse_date(date)
    row = session.get(WaterDay, date) or WaterDay(date=date, goal=default_goal(session))
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(row, k, v)
    session.add(row)
    session.commit()
    session.refresh(row)
    return water_out(session, date, row)


@app.get("/api/water/range")
def water_range(end: str, days: int = Query(14, ge=1, le=90), session: Session = Depends(get_session)):
    e = parse_date(end)
    dates = [(e - timedelta(days=i)).isoformat() for i in range(days - 1, -1, -1)]
    rows = {r.date: r for r in session.exec(select(WaterDay).where(WaterDay.date >= dates[0], WaterDay.date <= dates[-1])).all()}
    return [water_out(session, d, rows.get(d)) for d in dates]


# ---------------------------------------------------------------- summaries & notes
@app.get("/api/summary/day")
def summary_day(date: str, session: Session = Depends(get_session)):
    parse_date(date)
    return day_summary(session, date)


@app.get("/api/summary/week")
def summary_week(end: str, session: Session = Depends(get_session)):
    e = parse_date(end)
    return [day_summary(session, (e - timedelta(days=i)).isoformat()) for i in range(6, -1, -1)]


@app.put("/api/days/{date}")
def update_day(date: str, body: NoteUpdate, session: Session = Depends(get_session)):
    parse_date(date)
    n = session.get(DayNote, date) or DayNote(date=date)
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(n, k, v)
    session.add(n)
    session.commit()
    return day_summary(session, date)
