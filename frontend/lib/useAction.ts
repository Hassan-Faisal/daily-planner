"use client";
import { useCallback, useState } from "react";

/** Wraps API calls so any failure shows up in a visible error banner. */
export function useErrors() {
  const [error, setError] = useState("");
  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    try {
      setError("");
      return await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return undefined;
    }
  }, []);
  return { error, setError, run };
}
