"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { addDays, fmtMinutes, fromMin, parseKey, prettyDate, toMin, today } from "@/lib/dates";
import { CATEGORIES, type DaySummary, type TimeLog } from "@/lib/types";
import { useErrors } from "@/lib/useAction";

export default function TimePage() {
  const { error, run } = useErrors();
  const [day, setDay] = useState(today());
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [summary, setSummary] = useState<DaySummary | null>(null);
  const [week, setWeek] = useState<DaySummary[]>([]);
  const [start, setStart] = useState("05:00");
  const [end, setEnd] = useState("06:00");
  const [what, setWhat] = useState("");
  const [category, setCategory] = useState("work");
  const [note, setNote] = useState("");

  const load = useCallback(
    () => run(async () => {
      const [l, s, w] = await Promise.all([api.logs(day), api.daySummary(day), api.weekSummary(today())]);
      setLogs(l);
      setSummary(s);
      setWeek(w);
      setNote(s.note);
      // sensible default: the next entry starts where the last one ended
      if (l.length) {
        const last = l[l.length - 1].end;
        setStart(last);
        setEnd(fromMin((toMin(last) + 60) % 1440));
      } else {
        setStart("05:00");
        setEnd("06:00");
      }
    }),
    [run, day],
  );
  useEffect(() => {
    load();
  }, [load]);

  const add = () => {
    if (!what.trim()) return run(async () => { throw new Error("Type what you did first."); });
    run(async () => {
      await api.addLog({ date: day, start, end, what: what.trim(), category });
      setWhat("");
      await load();
    });
  };

  const remove = (id: number) => run(async () => { await api.deleteLog(id); await load(); });
  const rate = (n: number) =>
    run(async () => setSummary(await api.updateDay(day, { rating: summary?.rating === n ? 0 : n })));
  const saveNote = () => {
    if (note === (summary?.note ?? "")) return;
    run(async () => setSummary(await api.updateDay(day, { note })));
  };

  const logged = summary?.logged ?? 0;
  const productive = summary?.productive ?? 0;
  const cats = Object.entries(summary?.by_category ?? {}).sort((a, b) => b[1] - a[1]);

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
        <div className="tl">
          {logs.map((l) => {
            const s = toMin(l.start);
            const w = Math.min(l.minutes, 1440 - s);
            return (
              <i key={l.id} title={`${l.what} (${l.start}–${l.end})`}
                style={{ left: `${s / 14.4}%`, width: `${w / 14.4}%`, background: CATEGORIES[l.category]?.color }} />
            );
          })}
        </div>
        <div className="ticks"><span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>12am</span></div>
      </div>

      <div className="grid g2">
        <div className="card">
          <h2>What did you do?</h2>
          <div className="row" style={{ marginBottom: 8 }}>
            <label className="muted">From <input type="time" value={start} onChange={(e) => setStart(e.target.value)} /></label>
            <label className="muted">To <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
          </div>
          <div className="row">
            <input className="grow" placeholder="e.g. Studied for exam" value={what}
              onChange={(e) => setWhat(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {Object.entries(CATEGORIES).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
            </select>
            <button className="btn" onClick={add}>Add</button>
          </div>
          <div style={{ marginTop: 12 }}>
            {logs.map((l) => (
              <div className="ent" key={l.id}>
                <div className="sw" style={{ background: CATEGORIES[l.category]?.color }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{l.what}</div>
                  <div className="tm">{l.start} – {l.end} · {fmtMinutes(l.minutes)} · {CATEGORIES[l.category]?.label}</div>
                </div>
                <button className="x" onClick={() => remove(l.id)}>×</button>
              </div>
            ))}
            {!logs.length && <div className="empty-note">Nothing logged for this day yet.</div>}
          </div>
        </div>

        <div>
          <div className="card">
            <h2>Day summary</h2>
            <div className="row" style={{ gap: 20, marginBottom: 8 }}>
              <div className="stat"><b>{fmtMinutes(logged)}</b><span>logged</span></div>
              <div className="stat"><b>{fmtMinutes(productive)}</b><span>productive ({logged ? Math.round((productive / logged) * 100) : 0}%)</span></div>
              <div className="stat"><b style={{ color: "var(--mute)" }}>{fmtMinutes(summary?.unaccounted ?? 1440)}</b><span>unaccounted</span></div>
            </div>
            {cats.map(([k, mins]) => (
              <div className="cat" key={k}>
                <span className="bar" style={{ width: Math.max(6, (mins / 1440) * 400), background: CATEGORIES[k]?.color }} />
                {CATEGORIES[k]?.label ?? k} <b className="r">{fmtMinutes(mins)}</b>
              </div>
            ))}
            {!cats.length && <div className="muted">Add entries to see your breakdown.</div>}
          </div>
          <div className="card">
            <h2>Rate this day</h2>
            <div className="stars">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} className={(summary?.rating ?? 0) >= n ? "on" : ""} onClick={() => rate(n)}>★</button>
              ))}
            </div>
            <textarea placeholder="Reflection: what went well? What will I do better tomorrow?"
              value={note} onChange={(e) => setNote(e.target.value)} onBlur={saveNote} />
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Last 7 days</h2>
        <table className="wk">
          <thead><tr><th>Day</th><th>Logged</th><th>Productive</th><th /><th>Rating</th></tr></thead>
          <tbody>
            {week.map((d) => (
              <tr key={d.date}>
                <td>{parseKey(d.date).toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}</td>
                <td>{fmtMinutes(d.logged)}</td>
                <td style={{ color: "var(--green)", fontWeight: 600 }}>{fmtMinutes(d.productive)}</td>
                <td style={{ width: "35%" }}>
                  <div className="meter"><div style={{ width: `${Math.min(100, d.productive / 14.4)}%` }} /></div>
                </td>
                <td>{d.rating ? "★".repeat(d.rating) : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
