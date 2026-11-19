"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import PrayerPanel from "@/components/PrayerPanel";
import WaterCard from "@/components/WaterCard";
import { api } from "@/lib/api";
import { fmtMinutes, monthOf, prettyDate, today } from "@/lib/dates";
import type { DaySummary, PrayerDay, PrayerKey, Todo, WaterDay } from "@/lib/types";
import { useErrors } from "@/lib/useAction";

export default function TodayPage() {
  const t = today();
  const { error, run } = useErrors();
  const [day, setDay] = useState<PrayerDay | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [summary, setSummary] = useState<DaySummary | null>(null);
  const [water, setWater] = useState<WaterDay | null>(null);

  const load = useCallback(async () => {
    await run(async () => {
      const [m, td, s, w] = await Promise.all([api.month(monthOf(t)), api.todos(), api.daySummary(t), api.water(t)]);
      setDay(m.days.find((d) => d.date === t) ?? null);
      setTodos(td);
      setSummary(s);
      setWater(w);
    });
  }, [run, t]);

  useEffect(() => {
    load();
  }, [load]);

  const togglePrayer = (key: PrayerKey | "quran", value: boolean) =>
    run(async () => setDay(await api.updatePrayer(t, { [key]: value })));

  const updateWater = (patch: { glasses?: number; goal?: number }) =>
    run(async () => setWater(await api.updateWater(t, patch)));

  const completeTodo = (id: number) =>
    run(async () => {
      await api.updateTodo(id, { done: true });
      setTodos(await api.todos());
    });

  const pending = todos.filter((x) => !x.done);
  const overdue = pending.filter((x) => x.due && x.due < t).length;
  const prayed = day ? (["fajr", "zuhr", "asr", "maghrib", "isha"] as const).filter((k) => day[k]).length : 0;

  return (
    <>
      <p className="sub">{prettyDate(t)}</p>
      {error && <div className="err">{error}</div>}
      <div className="grid g3">
        <div className="card stat"><b>{prayed}/5</b><span>prayers today</span></div>
        <div className="card stat">
          <b>{pending.length}</b>
          <span>tasks pending{overdue ? ` · ${overdue} overdue` : ""}</span>
        </div>
        <div className="card stat">
          <b>{fmtMinutes(summary?.productive ?? 0)}</b>
          <span>productive time ({fmtMinutes(summary?.logged ?? 0)} logged)</span>
        </div>
      </div>
      <div className="grid g2">
        <div className="card">
          <h2>Today&apos;s namaz</h2>
          {day ? <PrayerPanel day={day} onToggle={togglePrayer} /> : <div className="empty-note">Loading…</div>}
        </div>
        <div>
        <div className="card">
          <h2>Water</h2>
          {water ? <WaterCard day={water} onChange={updateWater} /> : <div className="empty-note">Loading…</div>}
        </div>
        <div className="card">
          <h2>Next tasks</h2>
          {pending.slice(0, 5).map((x) => (
            <div className="todo" key={x.id}>
              <button className="chk" aria-label="Mark done" onClick={() => completeTodo(x.id)} />
              <div className="tt">
                {x.title}
                {x.due && <span className={`badge ${x.due < t ? "red" : ""}`}>{x.due === t ? "today" : x.due}</span>}
              </div>
            </div>
          ))}
          {!pending.length && <div className="empty-note">Nothing pending 🎉</div>}
          <div style={{ marginTop: 10 }} className="row">
            <Link className="btn ghost sm" href="/todos">Open to-do list</Link>
            <Link className="btn ghost sm" href="/time">Log my time</Link>
          </div>
        </div>
        </div>
      </div>
    </>
  );
}
