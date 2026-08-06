"use client";

import {
  useCallback,
  useRef,
  useSyncExternalStore,
  type Dispatch,
  type SetStateAction,
} from "react";

// useState that survives reloads via localStorage.
//
// Backed by useSyncExternalStore rather than an effect, because localStorage
// is exactly what that hook is for: an external mutable source that must be
// read without tearing and without a setState-in-effect cascade. The server
// snapshot is always `initial`, so SSR markup matches the first client render
// and the stored value takes over on hydration.

/** Written-through values, so a failed localStorage write still updates the UI. */
const memory = new Map<string, string>();

/** Cache keyed by raw string, so getSnapshot returns a stable reference. */
const parsed = new Map<string, { raw: string | null; value: unknown }>();

const listeners = new Map<string, Set<() => void>>();

function readRaw(key: string): string | null {
  if (memory.has(key)) return memory.get(key) ?? null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, raw: string): void {
  // Always record in memory first: if the browser refuses the write (private
  // mode, quota) the app still behaves, it just does not persist.
  memory.set(key, raw);
  try {
    window.localStorage.setItem(key, raw);
  } catch {
    // Intentionally ignored — memory is the fallback.
  }
}

function snapshot<T>(key: string, initial: T): T {
  const raw = readRaw(key);
  const cached = parsed.get(key);
  if (cached && cached.raw === raw) return cached.value as T;

  let value = initial;
  if (raw !== null) {
    try {
      value = JSON.parse(raw) as T;
    } catch {
      // Corrupt entry — fall back to the default.
    }
  }
  parsed.set(key, { raw, value });
  return value;
}

function notify(key: string): void {
  const set = listeners.get(key);
  if (set) for (const cb of set) cb();
}

function subscribe(key: string, cb: () => void): () => void {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(cb);

  // Another tab changed this key: drop the local override and re-read.
  const onStorage = (event: StorageEvent) => {
    if (event.key === key) {
      memory.delete(key);
      cb();
    }
  };
  window.addEventListener("storage", onStorage);

  return () => {
    set.delete(cb);
    if (set.size === 0) listeners.delete(key);
    window.removeEventListener("storage", onStorage);
  };
}

export function usePersistentState<T>(
  key: string,
  initial: T
): [T, Dispatch<SetStateAction<T>>] {
  // Pin the default from the first render so callers may pass a literal.
  const initialRef = useRef(initial);

  const value = useSyncExternalStore(
    useCallback((cb: () => void) => subscribe(key, cb), [key]),
    useCallback(() => snapshot(key, initialRef.current), [key]),
    useCallback(() => initialRef.current, [])
  );

  const set = useCallback<Dispatch<SetStateAction<T>>>(
    (next) => {
      const resolved =
        typeof next === "function"
          ? (next as (prev: T) => T)(snapshot(key, initialRef.current))
          : next;
      writeRaw(key, JSON.stringify(resolved));
      notify(key);
    },
    [key]
  );

  return [value, set];
}
