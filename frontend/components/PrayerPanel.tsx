"use client";
import { PRAYERS, type PrayerDay, type PrayerKey } from "@/lib/types";

interface Props {
  day: PrayerDay;
  onToggle: (key: PrayerKey | "quran", value: boolean) => void;
}

/** Five prayer toggles + the para of the day. Shared by Today and Namaz pages. */
export default function PrayerPanel({ day, onToggle }: Props) {
  const label = day.juz ? `Para ${day.juz}` : "Revision";
  return (
    <>
      <div className="prayers">
        {PRAYERS.map(({ key, label }) => (
          <button key={key} className={`pbtn ${day[key] ? "on" : ""}`} onClick={() => onToggle(key, !day[key])}>
            <span className="t">{day[key] ? "✓" : "○"}</span>
            {label}
          </button>
        ))}
      </div>
      <div className="juz">
        <span className="muted">Para of the day</span>
        <big>{label}</big>
        <div style={{ margin: "2px 0 8px" }}>
          {day.juz ? day.juz_name : "Free day: revise a para you found hard, or recite your favourite surahs."}
        </div>
        <button className={`btn sm ${day.quran ? "" : "ghost"}`} onClick={() => onToggle("quran", !day.quran)}>
          {day.quran ? "✓ Read" : "Mark as read"}
        </button>
      </div>
    </>
  );
}
