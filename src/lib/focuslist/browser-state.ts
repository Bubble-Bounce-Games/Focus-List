"use client";

import {
  useCallback,
  useRef,
  useSyncExternalStore,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { Project, Tag, Task } from "./types";

export type BrowserState = {
  schemaVersion: 1;
  projects: Project[];
  tags: Tag[];
  tasks: Task[];
  notes: unknown[];
  reminders: unknown[];
  updatedAt: string | null;
};

type CollectionField = "notes" | "reminders";

const STORAGE_KEY = "focus-list.workspace.v1";
const EMPTY_STATE: BrowserState = {
  schemaVersion: 1,
  projects: [],
  tags: [],
  tasks: [],
  notes: [],
  reminders: [],
  updatedAt: null,
};

let currentState = EMPTY_STATE;
let loaded = false;
let storageListenerAttached = false;
const listeners = new Set<() => void>();

function validState(value: unknown): value is BrowserState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const state = value as Partial<BrowserState>;
  return [state.projects, state.tags, state.tasks, state.notes, state.reminders]
    .every(Array.isArray);
}

function readStoredState(): BrowserState {
  if (typeof window === "undefined") return EMPTY_STATE;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return EMPTY_STATE;
    const parsed: unknown = JSON.parse(value);
    return validState(parsed) ? parsed : EMPTY_STATE;
  } catch {
    return EMPTY_STATE;
  }
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

function load(): void {
  if (loaded || typeof window === "undefined") return;
  currentState = readStoredState();
  loaded = true;
}

function attachStorageListener(): void {
  if (storageListenerAttached || typeof window === "undefined") return;
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    currentState = readStoredState();
    loaded = true;
    notify();
  });
  storageListenerAttached = true;
}

function save(state: BrowserState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function subscribeBrowserState(listener: () => void): () => void {
  listeners.add(listener);
  const wasLoaded = loaded;
  load();
  attachStorageListener();
  if (!wasLoaded) queueMicrotask(notify);
  return () => listeners.delete(listener);
}

export function getBrowserStateSnapshot(): BrowserState {
  return currentState;
}

export function useBrowserState(): BrowserState {
  return useSyncExternalStore(
    subscribeBrowserState,
    getBrowserStateSnapshot,
    () => EMPTY_STATE,
  );
}

export async function updateBrowserState(
  updater: (state: BrowserState) => BrowserState,
): Promise<BrowserState> {
  load();
  const nextState = {
    ...updater(currentState),
    schemaVersion: 1 as const,
    updatedAt: new Date().toISOString(),
  };
  save(nextState);
  currentState = nextState;
  notify();
  return nextState;
}

export function useBrowserCollection<T>(
  field: CollectionField,
  initial: T,
): [T, Dispatch<SetStateAction<T>>] {
  const initialRef = useRef(initial);
  const value = useSyncExternalStore(
    subscribeBrowserState,
    useCallback(() => getBrowserStateSnapshot()[field] as T, [field]),
    useCallback(() => initialRef.current, []),
  );

  const setValue = useCallback<Dispatch<SetStateAction<T>>>((next) => {
    void updateBrowserState((state) => {
      const previous = state[field] as T;
      const resolved = typeof next === "function"
        ? (next as (value: T) => T)(previous)
        : next;
      return { ...state, [field]: resolved };
    });
  }, [field]);

  return [value, setValue];
}
