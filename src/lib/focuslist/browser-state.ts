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

export type AccountSnapshot = {
  apiConfigured: boolean;
  status: "guest" | "loading" | "signed-in" | "error";
  username: string | null;
  message: string | null;
  syncStatus: "idle" | "syncing" | "saved" | "error";
};

type CollectionField = "notes" | "reminders";

const STORAGE_KEY = "focus-list.workspace.v1";
const SESSION_KEY = "focus-list.account.v1";
const ACCOUNT_API_URL = process.env.NEXT_PUBLIC_FOCUS_LIST_ACCOUNT_API_URL ?? "";
const EMPTY_STATE: BrowserState = {
  schemaVersion: 1,
  projects: [],
  tags: [],
  tasks: [],
  notes: [],
  reminders: [],
  updatedAt: null,
};

type AccountSession = {
  username: string;
  token: string;
};

let currentState = EMPTY_STATE;
let accountSnapshot: AccountSnapshot = {
  apiConfigured: ACCOUNT_API_URL.trim() !== "",
  status: "guest",
  username: null,
  message: null,
  syncStatus: "idle",
};
let loaded = false;
let accountLoadStarted = false;
let storageListenerAttached = false;
const listeners = new Set<() => void>();
const accountListeners = new Set<() => void>();

function validState(value: unknown): value is BrowserState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const state = value as Partial<BrowserState>;
  return [state.projects, state.tags, state.tasks, state.notes, state.reminders]
    .every(Array.isArray);
}

function normalizeState(value: unknown): BrowserState {
  if (!validState(value)) return EMPTY_STATE;
  return {
    schemaVersion: 1,
    projects: value.projects,
    tags: value.tags,
    tasks: value.tasks,
    notes: value.notes,
    reminders: value.reminders,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : null,
  };
}

function hasWorkspaceData(state: BrowserState): boolean {
  return [
    state.projects,
    state.tags,
    state.tasks,
    state.notes,
    state.reminders,
  ].some((collection) => collection.length > 0);
}

function readStoredState(): BrowserState {
  if (typeof window === "undefined") return EMPTY_STATE;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return EMPTY_STATE;
    const parsed: unknown = JSON.parse(value);
    return normalizeState(parsed);
  } catch {
    return EMPTY_STATE;
  }
}

function readSession(): AccountSession | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(SESSION_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<AccountSession>;
    if (typeof parsed.username !== "string" || typeof parsed.token !== "string") {
      return null;
    }
    return parsed as AccountSession;
  } catch {
    return null;
  }
}

function saveSession(session: AccountSession | null): void {
  if (typeof window === "undefined") return;
  if (session) {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(SESSION_KEY);
  }
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

function notifyAccount(): void {
  accountListeners.forEach((listener) => listener());
}

function setAccountSnapshot(patch: Partial<AccountSnapshot>): void {
  accountSnapshot = { ...accountSnapshot, ...patch };
  notifyAccount();
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
  if (accountSnapshot.status === "signed-in") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function accountApiUrl(path: string): string {
  return `${ACCOUNT_API_URL.replace(/\/+$/, "")}${path}`;
}

async function accountFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(accountApiUrl(path), {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => ({})) as {
    error?: string;
  } & T;
  if (!response.ok) {
    throw new Error(payload.error ?? "Account request failed");
  }
  return payload;
}

async function fetchCloudState(token: string): Promise<BrowserState> {
  const payload = await accountFetch<{ state?: unknown }>("/state", {
    headers: { authorization: `Bearer ${token}` },
  });
  return normalizeState(payload.state);
}

async function saveCloudState(state: BrowserState): Promise<void> {
  const session = readSession();
  if (!session || !ACCOUNT_API_URL) return;
  setAccountSnapshot({ syncStatus: "syncing" });
  try {
    await accountFetch("/state", {
      method: "PUT",
      headers: { authorization: `Bearer ${session.token}` },
      body: JSON.stringify({ state }),
    });
    setAccountSnapshot({ syncStatus: "saved", message: null });
  } catch (error) {
    setAccountSnapshot({
      syncStatus: "error",
      message: error instanceof Error ? error.message : "Cloud save failed",
    });
  }
}

async function loadAccountState(session: AccountSession): Promise<void> {
  if (!ACCOUNT_API_URL) return;
  setAccountSnapshot({
    status: "loading",
    username: session.username,
    message: null,
    syncStatus: "idle",
  });
  try {
    const guestState = readStoredState();
    const cloudState = await fetchCloudState(session.token);
    const nextState = !hasWorkspaceData(cloudState) && hasWorkspaceData(guestState)
      ? guestState
      : cloudState;
    currentState = nextState;
    loaded = true;
    setAccountSnapshot({
      status: "signed-in",
      username: session.username,
      message: null,
      syncStatus: "idle",
    });
    notify();
    if (nextState === guestState && hasWorkspaceData(guestState)) {
      void saveCloudState(nextState);
    }
  } catch (error) {
    saveSession(null);
    currentState = readStoredState();
    loaded = true;
    setAccountSnapshot({
      status: "error",
      username: null,
      message: error instanceof Error ? error.message : "Could not load account",
      syncStatus: "error",
    });
    notify();
  }
}

function startAccountLoad(): void {
  if (accountLoadStarted || typeof window === "undefined") return;
  accountLoadStarted = true;
  const session = readSession();
  if (!session || !ACCOUNT_API_URL) return;
  void loadAccountState(session);
}

export function subscribeBrowserState(listener: () => void): () => void {
  listeners.add(listener);
  const wasLoaded = loaded;
  load();
  startAccountLoad();
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
  if (accountSnapshot.status === "signed-in") {
    await saveCloudState(nextState);
  }
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

export function subscribeAccount(listener: () => void): () => void {
  accountListeners.add(listener);
  load();
  startAccountLoad();
  return () => accountListeners.delete(listener);
}

export function getAccountSnapshot(): AccountSnapshot {
  return accountSnapshot;
}

export function useAccountSnapshot(): AccountSnapshot {
  return useSyncExternalStore(
    subscribeAccount,
    getAccountSnapshot,
    () => accountSnapshot,
  );
}

export async function signUpAccount(
  username: string,
  password: string,
): Promise<void> {
  if (!ACCOUNT_API_URL) {
    throw new Error("Account storage is not configured yet.");
  }
  const payload = await accountFetch<AccountSession>("/signup", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  saveSession(payload);
  await loadAccountState(payload);
}

export async function signInAccount(
  username: string,
  password: string,
): Promise<void> {
  if (!ACCOUNT_API_URL) {
    throw new Error("Account storage is not configured yet.");
  }
  const payload = await accountFetch<AccountSession>("/signin", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  saveSession(payload);
  await loadAccountState(payload);
}

export function signOutAccount(): void {
  saveSession(null);
  currentState = readStoredState();
  loaded = true;
  setAccountSnapshot({
    status: "guest",
    username: null,
    message: null,
    syncStatus: "idle",
  });
  notify();
}
