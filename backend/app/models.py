"""Database tables (SQLModel) and request/response schemas."""
from typing import Optional

from pydantic import BaseModel, Field as PField
from sqlmodel import Field, SQLModel

CATEGORIES = {
    # key: is_productive
    "ibadah": True,
    "work": True,
    "health": True,
    "family": True,
    "rest": False,
    "leisure": False,
    "wasted": False,
    "other": False,
}


# ---------------------------------------------------------------- tables
class PrayerDay(SQLModel, table=True):
    date: str = Field(primary_key=True)  # YYYY-MM-DD
    fajr: bool = False
    zuhr: bool = False
    asr: bool = False
    maghrib: bool = False
    isha: bool = False
    quran: bool = False  # today's para recited


class Todo(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    due: str = ""
    done: bool = False
    done_on: str = ""
    review: str = ""
    created: str = ""


class TimeLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    date: str = Field(index=True)
    start: str  # HH:MM
    end: str  # HH:MM (<= start means it runs past midnight)
    what: str
    category: str = "other"


class WaterDay(SQLModel, table=True):
    date: str = Field(primary_key=True)
    glasses: int = 0
    goal: int = 8


class DayNote(SQLModel, table=True):
    date: str = Field(primary_key=True)
    rating: int = 0  # 0 = not rated, 1..5
    note: str = ""


# ---------------------------------------------------------------- schemas
class PrayerUpdate(BaseModel):
    fajr: Optional[bool] = None
    zuhr: Optional[bool] = None
    asr: Optional[bool] = None
    maghrib: Optional[bool] = None
    isha: Optional[bool] = None
    quran: Optional[bool] = None


class TodoCreate(BaseModel):
    title: str = PField(min_length=1, max_length=300)
    due: str = ""


class TodoUpdate(BaseModel):
    title: Optional[str] = PField(default=None, min_length=1, max_length=300)
    due: Optional[str] = None
    done: Optional[bool] = None
    review: Optional[str] = PField(default=None, max_length=5000)


class LogCreate(BaseModel):
    date: str
    start: str
    end: str
    what: str = PField(min_length=1, max_length=300)
    category: str = "other"


class WaterUpdate(BaseModel):
    glasses: Optional[int] = PField(default=None, ge=0, le=50)
    goal: Optional[int] = PField(default=None, ge=1, le=50)


class NoteUpdate(BaseModel):
    rating: Optional[int] = PField(default=None, ge=0, le=5)
    note: Optional[str] = PField(default=None, max_length=5000)
