"use client";

import {
  useCallback,
  useRef,
  useSyncExternalStore,
  type Dispatch,
  type SetStateAction,
} from "react";
import { getCognitoIdToken, hasCurrentCognitoUser } from "@/lib/cognito/client";
import type { Project, Tag, Task } from "./types";

export type PrivateS3State = {
  schemaVersion: 1;
  projects: Project[];
  tags: Tag[];
  tasks: Task[];
  notes: unknown[];
  reminders: unknown[];
  updatedAt: string | null;
};

export type VersionedPrivateS3State = {
  state: PrivateS3State;
  etag: string | null;
};

type CollectionField = "notes" | "reminders";

const EMPTY_STATE: PrivateS3State = {
  schemaVersion: 1,
  projects: [],
  tags: [],
  tasks: [],
  notes: [],
  reminders: [],
  updatedAt: null,
};

let currentState = EMPTY_STATE;
let currentEtag: string | null = null;
let loaded = false;
let loadPromise: Promise<PrivateS3State> | null = null;
let mutationQueue: Promise<unknown> = Promise.resolve();
const listeners = new Set<() => void>();

function dataApiUrl(): string | null {
  const value = process.env.NEXT_PUBLIC_FOCUS_LIST_DATA_API_URL?.trim();
  return value ? value.replace(/\/$/, "") : null;
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

function publish(state: PrivateS3State, etag: string | null): void {
  currentState = state;
  currentEtag = etag;
  loaded = true;
  notify();
}

async function stateRequest(
  method: "GET" | "PUT",
  state?: PrivateS3State,
  etag?: string | null,
): Promise<VersionedPrivateS3State> {
  const baseUrl = dataApiUrl();
  if (!baseUrl) throw new Error("Private S3 data API is not configured");

  const token = await getCognitoIdToken();
  const response = await fetch(`${baseUrl}/state`, {
    method,
    cache: "no-store",
    headers: {
      authorization: `Bearer ${token}`,
      ...(state ? { "content-type": "application/json" } : {}),
      ...(etag ? { "if-match": etag } : {}),
    },
    ...(state ? { body: JSON.stringify(state) } : {}),
  });

  const text = await response.text();
  let payload: PrivateS3State | { error?: string } = {};
  try {
    payload = text ? JSON.parse(text) as PrivateS3State | { error?: string } : {};
  } catch {
    // API Gateway can return a non-JSON authorization error.
  }

  if (!response.ok) {
    const message = "error" in payload && payload.error
      ? payload.error
      : `Private data request failed with status ${response.status}`;
    throw new Error(message);
  }

  return {
    state: payload as PrivateS3State,
    etag: response.headers.get("etag"),
  };
}

export async function loadPrivateS3State(): Promise<VersionedPrivateS3State> {
  return stateRequest("GET");
}

export async function savePrivateS3State(
  state: PrivateS3State,
  etag?: string | null,
): Promise<VersionedPrivateS3State> {
  return stateRequest("PUT", state, etag);
}

export function ensurePrivateS3State(): Promise<PrivateS3State> {
  if (loaded) return Promise.resolve(currentState);
  if (!hasCurrentCognitoUser()) {
    loaded = true;
    return Promise.resolve(currentState);
  }
  loadPromise ??= loadPrivateS3State()
    .then(({ state, etag }) => {
      publish(state, etag);
      return state;
    })
    .finally(() => {
      loadPromise = null;
    });
  return loadPromise;
}

export function resetPrivateS3State(): void {
  currentState = EMPTY_STATE;
  currentEtag = null;
  loaded = false;
  loadPromise = null;
  mutationQueue = Promise.resolve();
  notify();
}

export function subscribePrivateS3State(listener: () => void): () => void {
  listeners.add(listener);
  void ensurePrivateS3State().catch(() => notify());
  return () => listeners.delete(listener);
}

export function getPrivateS3Snapshot(): PrivateS3State {
  return currentState;
}

export function usePrivateS3State(): PrivateS3State {
  return useSyncExternalStore(
    subscribePrivateS3State,
    getPrivateS3Snapshot,
    () => EMPTY_STATE,
  );
}

export function updatePrivateS3State(
  updater: (state: PrivateS3State) => PrivateS3State,
): Promise<PrivateS3State> {
  const operation = mutationQueue.then(async () => {
    await ensurePrivateS3State();
    const previousState = currentState;
    const previousEtag = currentEtag;
    const nextState = updater(previousState);
    publish(nextState, previousEtag);

    try {
      const saved = await savePrivateS3State(nextState, previousEtag);
      publish(saved.state, saved.etag);
      return saved.state;
    } catch (error) {
      publish(previousState, previousEtag);
      throw error;
    }
  });
  mutationQueue = operation.catch(() => undefined);
  return operation;
}

export function usePrivateS3Collection<T>(
  field: CollectionField,
  initial: T,
): [T, Dispatch<SetStateAction<T>>] {
  const initialRef = useRef(initial);
  const value = useSyncExternalStore(
    subscribePrivateS3State,
    useCallback(() => getPrivateS3Snapshot()[field] as T, [field]),
    useCallback(() => initialRef.current, []),
  );

  const setValue = useCallback<Dispatch<SetStateAction<T>>>((next) => {
    void updatePrivateS3State((state) => {
      const previous = state[field] as T;
      const resolved = typeof next === "function"
        ? (next as (value: T) => T)(previous)
        : next;
      return { ...state, [field]: resolved };
    });
  }, [field]);

  return [value, setValue];
}
