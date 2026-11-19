"use client";
import type { WaterDay } from "@/lib/types";

interface Props {
  day: WaterDay;
  onChange: (patch: { glasses?: number; goal?: number }) => void;
}

/** Glass counter: tap a glass to set the count, or use +/- ; goal is adjustable. */
export default function WaterCard({ day, onChange }: Props) {
  const { glasses, goal } = day;
  const shown = Math.max(goal, glasses);
  const pct = Math.min(100, Math.round((glasses / goal) * 100));
  const reached = glasses >= goal;

  return (
    <>
      <div className="water-top">
        <div>
          <b className="water-count">{glasses}</b>
          <span className="muted"> / {goal} glasses</span>
          {reached && <span className="badge good">goal reached 🎉</span>}
        </div>
        <div className="row">
          <button className="btn ghost sm" aria-label="Remove a glass" disabled={glasses === 0}
            onClick={() => onChange({ glasses: glasses - 1 })}>−</button>
          <button className="btn sm" aria-label="Add a glass" onClick={() => onChange({ glasses: glasses + 1 })}>+ 1 glass</button>
        </div>
      </div>
      <div className="meter big"><div style={{ width: `${pct}%` }} /></div>
      <div className="glasses">
        {Array.from({ length: shown }, (_, i) => (
          <button key={i} className={`glass ${i < glasses ? "on" : ""}`} aria-label={`Set to ${i + 1} glasses`}
            onClick={() => onChange({ glasses: i + 1 === glasses ? i : i + 1 })}>
            🥛
          </button>
        ))}
      </div>
      <div className="row goal">
        <span className="muted">Daily goal</span>
        <button className="btn ghost sm" aria-label="Lower goal" disabled={goal <= 1} onClick={() => onChange({ goal: goal - 1 })}>−</button>
        <b>{goal}</b>
        <button className="btn ghost sm" aria-label="Raise goal" disabled={goal >= 50} onClick={() => onChange({ goal: goal + 1 })}>+</button>
        <span className="muted">glasses</span>
      </div>
    </>
  );
}
