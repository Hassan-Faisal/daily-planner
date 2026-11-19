"use client";
import { useCallback, useEffect, useState } from "react";
import PrayerPanel from "@/components/PrayerPanel";
import { api } from "@/lib/api";
import { MONTHS, monthOf, parseKey, prettyDate, shiftMonth, today } from "@/lib/dates";
import { PRAYERS, type MonthData, type PrayerKey } from "@/lib/types";
import { useErrors } from "@/lib/useAction";

export default function NamazPage() {
  const t = today();
  const { error, run } = useErrors();
  const [month, setMonth] = useState(monthOf(t));
  const [selected, setSelected] = useState(t);
  const [data, setData] = useState<MonthData | null>(null);

  const load = useCallback(() => run(async () => setData(await api.month(month))), [run, month]);
  useEffect(() => {
    load();
  }, [load]);

  const toggle = (key: PrayerKey | "quran", value: boolean) =>
    run(async () => {
      await api.updatePrayer(selected, { [key]: value });
      await load();
    });

  const [y, m] = month.split("-").map(Number);
  const offset = new Date(y, m - 1, 1).getDay();
  const selDay = data?.days.find((d) => d.date === selected);

  const go = (n: number) => {
    const next = shiftMonth(month, n);
    setMonth(next);
    setSelected(`${next}-01`);
  };

  return (
    <>
      {error && <div className="err">{error}</div>}
      <div className="grid cal-layout">
        <div className="card">
          <div className="mnav">
            <button className="btn ghost sm" onClick={() => go(-1)}>‹</button>
            <b>{MONTHS[m - 1]} {y}</b>
            <button className="btn ghost sm" onClick={() => go(1)}>›</button>
          </div>
          <div className="cal">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div className="h" key={i}>{d}</div>)}
            {Array.from({ length: offset }, (_, i) => <div className="day empty" key={`e${i}`} />)}
            {data?.days.map((d) => {
              const count = PRAYERS.filter((p) => d[p.key]).length;
              return (
                <button
                  key={d.date}
                  className={`day ${count === 5 ? "full" : ""} ${d.date === t ? "today" : ""} ${d.date === selected ? "sel" : ""}`}
                  onClick={() => setSelected(d.date)}
                >
                  <div className="top">
                    <span className="n">{parseKey(d.date).getDate()}</span>
                    <span className="j">{d.juz ? `P${d.juz}` : "Rev"}{d.quran ? " ✓" : ""}</span>
                  </div>
                  <div className="dots">
                    {PRAYERS.map((p) => <span key={p.key} className={`dot ${d[p.key] ? "on" : ""}`} />)}
                  </div>
                </button>
              );
            })}
          </div>
          <p className="muted" style={{ margin: "10px 0 0" }}>
            Each dot is a prayer (Fajr → Isha). <b>P5</b> = para to recite that date. Green cell = all 5 prayed.
          </p>
        </div>
        <div>
          <div className="card">
            <h2>{prettyDate(selected)}</h2>
            {selDay ? <PrayerPanel day={selDay} onToggle={toggle} /> : <div className="empty-note">Loading…</div>}
          </div>
          <div className="card">
            <h2>{MONTHS[m - 1]} summary</h2>
            <div className="cat">Prayers offered <b className="r">{data?.stats.prayers_done ?? 0} / {data?.stats.prayers_possible ?? 0}</b></div>
            <div className="cat">Perfect days (5/5) <b className="r">{data?.stats.perfect_days ?? 0}</b></div>
            <div className="cat">Paras recited <b className="r">{data?.stats.paras_read ?? 0} / 30</b></div>
          </div>
        </div>
      </div>
    </>
  );
}
