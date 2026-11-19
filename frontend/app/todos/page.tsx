"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { today } from "@/lib/dates";
import type { Todo } from "@/lib/types";
import { useErrors } from "@/lib/useAction";

type Filter = "all" | "pending" | "done";

export default function TodosPage() {
  const t = today();
  const { error, run } = useErrors();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [reviews, setReviews] = useState<Record<number, string>>({});

  const load = useCallback(
    () => run(async () => {
      const list = await api.todos();
      setTodos(list);
      setReviews(Object.fromEntries(list.map((x) => [x.id, x.review])));
    }),
    [run],
  );
  useEffect(() => {
    load();
  }, [load]);

  const add = () => {
    if (!title.trim()) return;
    run(async () => {
      await api.addTodo(title.trim(), due);
      setTitle("");
      setDue("");
      await load();
    });
  };

  const toggle = (x: Todo) =>
    run(async () => {
      await api.updateTodo(x.id, { done: !x.done });
      await load();
    });

  const saveReview = (x: Todo) => {
    if ((reviews[x.id] ?? "") === x.review) return;
    run(async () => {
      const updated = await api.updateTodo(x.id, { review: reviews[x.id] ?? "" });
      setTodos((prev) => prev.map((p) => (p.id === x.id ? updated : p)));
    });
  };

  const remove = (id: number) =>
    run(async () => {
      await api.deleteTodo(id);
      await load();
    });

  const doneCount = todos.filter((x) => x.done).length;
  const shown = todos.filter((x) => filter === "all" || (filter === "done" ? x.done : !x.done));
  const tabs: [Filter, string][] = [
    ["all", `All (${todos.length})`],
    ["pending", `Pending (${todos.length - doneCount})`],
    ["done", `Done (${doneCount})`],
  ];

  return (
    <>
      {error && <div className="err">{error}</div>}
      <div className="card">
        <h2>Add a task</h2>
        <div className="row">
          <input className="grow" placeholder="What do you need to do?" value={title}
            onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} title="Due date (optional)" />
          <button className="btn" onClick={add}>Add</button>
        </div>
      </div>
      <div className="card">
        <div className="seg">
          {tabs.map(([k, l]) => (
            <button key={k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>{l}</button>
          ))}
        </div>
        {shown.map((x) => (
          <div className={`todo ${x.done ? "done" : ""}`} key={x.id}>
            <button className={`chk ${x.done ? "on" : ""}`} aria-label="Toggle done" onClick={() => toggle(x)}>
              {x.done ? "✓" : ""}
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="tt">
                {x.title}
                {x.due && (
                  <span className={`badge ${!x.done && x.due < t ? "red" : ""}`}>
                    {x.due === t ? "today" : `${!x.done && x.due < t ? "overdue · " : ""}${x.due}`}
                  </span>
                )}
                {x.done && x.done_on && <span className="badge">done {x.done_on}</span>}
              </div>
              {x.done && (
                <div className="review">
                  <textarea
                    placeholder="Review: how did it go? What did you learn?"
                    value={reviews[x.id] ?? ""}
                    onChange={(e) => setReviews({ ...reviews, [x.id]: e.target.value })}
                    onBlur={() => saveReview(x)}
                  />
                </div>
              )}
            </div>
            <button className="x" title="Delete" onClick={() => remove(x.id)}>×</button>
          </div>
        ))}
        {!shown.length && <div className="empty-note">No tasks here yet.</div>}
      </div>
    </>
  );
}
