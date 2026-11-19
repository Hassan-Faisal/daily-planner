import type { DaySummary, MonthData, PrayerDay, PrayerKey, TimeLog, Todo } from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      cache: "no-store",
    });
  } catch {
    throw new Error("Cannot reach the server. Is the FastAPI backend running on port 8000?");
  }
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") detail = body.detail;
      else if (Array.isArray(body.detail)) detail = body.detail.map((d: { msg: string }) => d.msg).join(", ");
    } catch {
      /* keep default message */
    }
    throw new Error(detail);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

export const api = {
  // prayers + quran
  month: (month: string) => request<MonthData>(`/prayers?month=${month}`),
  updatePrayer: (date: string, patch: Partial<Record<PrayerKey | "quran", boolean>>) =>
    request<PrayerDay>(`/prayers/${date}`, json("PUT", patch)),

  // todos
  todos: () => request<Todo[]>("/todos"),
  addTodo: (title: string, due: string) => request<Todo>("/todos", json("POST", { title, due })),
  updateTodo: (id: number, patch: Partial<Pick<Todo, "title" | "due" | "done" | "review">>) =>
    request<Todo>(`/todos/${id}`, json("PATCH", patch)),
  deleteTodo: (id: number) => request<void>(`/todos/${id}`, { method: "DELETE" }),

  // time log
  logs: (date: string) => request<TimeLog[]>(`/logs?date=${date}`),
  addLog: (log: { date: string; start: string; end: string; what: string; category: string }) =>
    request<TimeLog>("/logs", json("POST", log)),
  deleteLog: (id: number) => request<void>(`/logs/${id}`, { method: "DELETE" }),
  daySummary: (date: string) => request<DaySummary>(`/summary/day?date=${date}`),
  weekSummary: (end: string) => request<DaySummary[]>(`/summary/week?end=${end}`),
  updateDay: (date: string, patch: { rating?: number; note?: string }) =>
    request<DaySummary>(`/days/${date}`, json("PUT", patch)),
};
