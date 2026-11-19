export type PrayerKey = "fajr" | "zuhr" | "asr" | "maghrib" | "isha";

export const PRAYERS: { key: PrayerKey; label: string }[] = [
  { key: "fajr", label: "Fajr" },
  { key: "zuhr", label: "Zuhr" },
  { key: "asr", label: "Asr" },
  { key: "maghrib", label: "Maghrib" },
  { key: "isha", label: "Isha" },
];

export interface PrayerDay {
  date: string;
  fajr: boolean;
  zuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
  quran: boolean;
  juz: number | null; // null = 31st, revision day
  juz_name: string;
}

export interface MonthData {
  month: string;
  days: PrayerDay[];
  stats: {
    prayers_done: number;
    prayers_possible: number;
    perfect_days: number;
    paras_read: number;
  };
}

export interface Todo {
  id: number;
  title: string;
  due: string;
  done: boolean;
  done_on: string;
  review: string;
  created: string;
}

export interface TimeLog {
  id: number;
  date: string;
  start: string;
  end: string;
  what: string;
  category: string;
  minutes: number;
}

export interface DaySummary {
  date: string;
  logged: number;
  productive: number;
  unaccounted: number;
  by_category: Record<string, number>;
  rating: number;
  note: string;
}

export const CATEGORIES: Record<string, { label: string; color: string }> = {
  ibadah: { label: "Ibadah / Quran", color: "#2f7d5b" },
  work: { label: "Work / Study", color: "#3b6ea8" },
  health: { label: "Health / Exercise", color: "#c0792b" },
  family: { label: "Family / Social", color: "#8a5aa8" },
  rest: { label: "Rest / Sleep", color: "#7b8794" },
  leisure: { label: "Leisure", color: "#d0809b" },
  wasted: { label: "Unproductive", color: "#b8433a" },
  other: { label: "Other", color: "#a39a7e" },
};
