import os
import tempfile

os.environ["DATABASE_URL"] = f"sqlite:///{tempfile.mkdtemp()}/test.db"

import pytest
from fastapi.testclient import TestClient

from app.juz import juz_for_day
from app.main import app


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c


def test_juz_schedule():
    assert juz_for_day(1) == 1
    assert juz_for_day(30) == 30
    assert juz_for_day(31) is None


def test_prayer_flow_and_month(client):
    # tick only Asr and Maghrib for 1 December
    r = client.put("/api/prayers/2026-12-01", json={"asr": True, "maghrib": True})
    assert r.status_code == 200
    d = r.json()
    assert d["asr"] and d["maghrib"] and not d["fajr"]
    assert d["juz"] == 1 and d["juz_name"] == "Alif Lam Meem"

    # partial update keeps earlier ticks
    client.put("/api/prayers/2026-12-01", json={"quran": True})
    m = client.get("/api/prayers", params={"month": "2026-12"}).json()
    assert len(m["days"]) == 31
    first = m["days"][0]
    assert first["asr"] and first["maghrib"] and first["quran"]
    assert m["days"][30]["juz"] is None  # 31 Dec is revision day
    assert m["stats"]["paras_read"] == 1

    # untick
    client.put("/api/prayers/2026-12-01", json={"asr": False})
    m = client.get("/api/prayers", params={"month": "2026-12"}).json()
    assert m["days"][0]["asr"] is False


def test_prayer_validation(client):
    assert client.put("/api/prayers/nope", json={"fajr": True}).status_code == 422
    assert client.get("/api/prayers", params={"month": "2026-13"}).status_code == 422


def test_todo_lifecycle(client):
    t = client.post("/api/todos", json={"title": "Write report", "due": "2026-11-25"}).json()
    assert not t["done"]
    t = client.patch(f"/api/todos/{t['id']}", json={"done": True, "review": "went well"}).json()
    assert t["done"] and t["review"] == "went well" and t["done_on"]
    t = client.patch(f"/api/todos/{t['id']}", json={"done": False}).json()
    assert t["done_on"] == ""
    assert any(x["id"] == t["id"] for x in client.get("/api/todos").json())
    assert client.delete(f"/api/todos/{t['id']}").status_code == 204
    assert client.patch(f"/api/todos/{t['id']}", json={"done": True}).status_code == 404
    assert client.post("/api/todos", json={"title": ""}).status_code == 422


def test_time_log_and_summary(client):
    day = "2026-11-19"
    client.post("/api/logs", json={"date": day, "start": "12:00", "end": "14:00", "what": "Study", "category": "work"})
    client.post("/api/logs", json={"date": day, "start": "14:00", "end": "15:00", "what": "Scrolling", "category": "wasted"})
    logs = client.get("/api/logs", params={"date": day}).json()
    assert [l["minutes"] for l in logs] == [120, 60]
    s = client.get("/api/summary/day", params={"date": day}).json()
    assert s["logged"] == 180 and s["productive"] == 120 and s["unaccounted"] == 1260

    client.put(f"/api/days/{day}", json={"rating": 4, "note": "ok day"})
    s = client.get("/api/summary/day", params={"date": day}).json()
    assert s["rating"] == 4 and s["note"] == "ok day"

    w = client.get("/api/summary/week", params={"end": day}).json()
    assert len(w) == 7 and w[-1]["date"] == day and w[-1]["logged"] == 180

    assert client.delete(f"/api/logs/{logs[0]['id']}").status_code == 204


def test_log_past_midnight_and_validation(client):
    r = client.post("/api/logs", json={"date": "2026-11-20", "start": "22:00", "end": "06:00", "what": "Sleep", "category": "rest"})
    assert r.json()["minutes"] == 480
    bad = {"date": "2026-11-20", "start": "25:00", "end": "06:00", "what": "x", "category": "rest"}
    assert client.post("/api/logs", json=bad).status_code == 422
    bad["start"], bad["category"] = "10:00", "nope"
    assert client.post("/api/logs", json=bad).status_code == 422


def test_water_tracking(client):
    day = "2026-11-19"
    assert client.get("/api/water", params={"date": day}).json()["glasses"] == 0
    r = client.put(f"/api/water/{day}", json={"glasses": 3}).json()
    assert r["glasses"] == 3 and r["goal"] == 8
    r = client.put(f"/api/water/{day}", json={"glasses": 5, "goal": 10}).json()
    assert r["glasses"] == 5 and r["goal"] == 10
    # a day with no record inherits the latest goal
    assert client.get("/api/water", params={"date": "2026-11-25"}).json()["goal"] == 10
    rng = client.get("/api/water/range", params={"end": day, "days": 7}).json()
    assert len(rng) == 7 and rng[-1]["glasses"] == 5 and rng[0]["glasses"] == 0
    assert client.put(f"/api/water/{day}", json={"glasses": -1}).status_code == 422
    assert client.put(f"/api/water/{day}", json={"goal": 0}).status_code == 422
    assert client.put("/api/water/bad-date", json={"glasses": 1}).status_code == 422
