"use client";

import { useCallback, useEffect, useState } from "react";

import type { DetailField, Project, Tag, Task } from "./types";

export type FocusListData = {
  tasks: Task[];
  projects: Project[];
  tags: Tag[];
};

type ApiResponse<T> = T & { error?: string };

class ApiError extends Error {}

async function request<T>(body?: unknown): Promise<T> {
  const response = await fetch(body === undefined ? "/api" : "/api", {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = (await response.json()) as ApiResponse<T>;
  if (!response.ok) throw new ApiError(payload.error ?? "The server could not save your change.");
  return payload;
}

function notifyDataChanged() {
  window.dispatchEvent(new Event("focuslist-data-changed"));
}

export function useFocusListData(enabled: boolean) {
  const [data, setData] = useState<FocusListData>({ tasks: [], projects: [], tags: [] });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      setError(null);
      const next = await request<FocusListData>();
      setData(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load saved data.");
    } finally {
      setReady(true);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const requestId = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(requestId);
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled) return;
    const handleChange = () => void refresh();
    window.addEventListener("focuslist-data-changed", handleChange);
    return () => window.removeEventListener("focuslist-data-changed", handleChange);
  }, [enabled, refresh]);

  return { ...data, ready, error, refresh };
}

export function useAuthentication() {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api?auth=1")
      .then((response) => response.json())
      .then((status: { authenticated?: boolean; configured?: boolean }) => {
        if (!active) return;
        setAuthenticated(status.authenticated === true);
        setConfigured(status.configured !== false);
      })
      .catch(() => {
        if (active) setConfigured(false);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    const result = await request<{ authenticated: boolean; configured: boolean }>({
      action: "login",
      username,
      password,
    });
    setAuthenticated(result.authenticated);
    setConfigured(result.configured);
  }, []);

  return { ready, authenticated, configured, signIn };
}

async function mutate<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  const result = await request<{ result: T }>({ action, ...payload });
  notifyDataChanged();
  return result.result;
}

export async function createTask(input: {
  title: string;
  projectId: string;
  tagName: string;
  progress: number;
}): Promise<Task> {
  return mutate<Task>("createTask", input);
}

export async function updateTask(
  id: string,
  patch: Partial<Pick<Task, "title" | "projectId" | "tagId" | "progress">> & { tagName?: string }
): Promise<Task> {
  return mutate<Task>("updateTask", { id, patch });
}

export async function setProgress(id: string, progress: number): Promise<Task> {
  return mutate<Task>("updateTask", { id, patch: { progress } });
}

export async function setTaskDetail(
  id: string,
  field: DetailField,
  value: string
): Promise<Task> {
  return mutate<Task>("setTaskDetail", { id, field, value });
}

export async function deleteTask(id: string): Promise<void> {
  await mutate<null>("deleteTask", { id });
}

export async function duplicateTask(id: string): Promise<Task> {
  return mutate<Task>("duplicateTask", { id });
}

export async function createProject(name: string): Promise<Project> {
  return mutate<Project>("createProject", { name });
}

export function projectMap(projects: Project[]): Record<string, Project> {
  return Object.fromEntries(projects.map((project) => [project.id, project]));
}

export function tagMap(tags: Tag[]): Record<string, Tag> {
  return Object.fromEntries(tags.map((tag) => [tag.id, tag]));
}
