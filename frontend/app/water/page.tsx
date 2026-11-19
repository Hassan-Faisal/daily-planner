"use client";
import { useCallback, useEffect, useState } from "react";
import WaterCard from "@/components/WaterCard";
import { api } from "@/lib/api";
import { addDays, parseKey, prettyDate, today } from "@/lib/dates";
import type { WaterDay } from "@/lib/types";
import { useErrors } from "@/lib/useAction";

const DAYS = 14;

export default function WaterPage() {
  const { error, run } = useErrors();
  const [day, setDay] = useState(today());
  const [current, setCurrent] = useState<WaterDay | null>(null);
  const [history, setHistory] = useState<WaterDay[]>([]);

  const load = useCallback(
    () => run(async () => {
      const [w, h] = await Promise.all([api.water(day), api.waterRange(today(), DAYS)]);
      setCurrent(w);
      setHistory(h);
    }),
    [run, day],
  );
  useEffect(() => {
    load();
  }, [load]);

  const update = (patch: { glasses?: number; goal?: number }) =>
    run(async () => {
      setCurrent(await api.updateWater(day, patch));
      setHistory(await api.waterRange(today(), DAYS));
    });

  const tracked = history.filter((d) => d.glasses > 0);
  const average = tracked.length ? tracked.reduce((n, d) => n + d.glasses, 0) / tracked.length : 0;
  const metDays = history.filter((d) => d.glasses >= d.goal).length;
  const best = history.reduce((m, d) => Math.max(m, d.glasses), 0);
  const chartMax = Math.max(best, ...history.map((d) => d.goal), 1);

  return (
    <>
      {error && <div className="err">{error}</div>}
      <div className="card">
        <div className="mnav">
          <button className="btn ghost sm" onClick={() => setDay(addDays(day, -1))}>‹</button>
          <div style={{ textAlign: "center" }}>
            <b>{prettyDate(day)}</b>{" "}
            {day !== today() && <button className="btn ghost sm" onClick={() => setDay(today())}>Today</button>}
          </div>
          <button className="btn ghost sm" onClick={() => setDay(addDays(day, 1))}>›</button>
        </div>
        {current ? <WaterCard day={current} onChange={update} /> : <div className="empty-note">Loading…</div>}
      </div>

      <div className="grid g3">
        <div className="card stat"><b>{average.toFixed(1)}</b><span>average glasses / tracked day</span></div>
        <div className="card stat"><b>{metDays}/{DAYS}</b><span>days goal reached</span></div>
        <div className="card stat"><b>{best}</b><span>best day (glasses)</span></div>
      </div>

      <div className="card">
        <h2>Last {DAYS} days</h2>
        <div className="bars">
          {history.map((d) => (
            <div className="barcol" key={d.date} title={`${d.date}: ${d.glasses} / ${d.goal}`}>
              <div className="barval">{d.glasses || ""}</div>
              <div className="bartrack">
                <div className={`barfill ${d.glasses >= d.goal ? "met" : ""}`} style={{ height: `${(d.glasses / chartMax) * 100}%` }} />
                <div className="goalline" style={{ bottom: `${(d.goal / chartMax) * 100}%` }} />
              </div>
              <div className="barlbl">{parseKey(d.date).getDate()}</div>
            </div>
          ))}
        </div>
        <p className="muted" style={{ margin: "8px 0 0" }}>Green bars reached the goal. The gold line is each day&apos;s goal.</p>
      </div>
    </>
  );
}
