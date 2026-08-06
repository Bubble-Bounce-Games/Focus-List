"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

// useState that survives reloads via localStorage.
//
// The initial render always returns `initial` so the server-rendered markup
// and the first client render agree; the stored value is applied in an effect
// straight after mount. Writes are skipped until that read has happened, so a
// fresh mount can never clobber the stored value with the default.
export function usePersistentState<T>(
  key: string,
  initial: T
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(initial);
  const hydrated = useRef(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      // Unreadable or corrupt entry — keep the default.
    }
    hydrated.current = true;
  }, [key]);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Quota exceeded or storage disabled — state still works in-memory.
    }
  }, [key, value]);

  // Stable identity so callers can list it in dependency arrays.
  const set = useCallback<Dispatch<SetStateAction<T>>>((next) => {
    setValue(next);
  }, []);

  return [value, set];
}
