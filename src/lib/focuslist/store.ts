"use client";

// Local-first persistence layer. Everything lives in IndexedDB via Dexie —
// there is no server, no account, and no network call anywhere in this file.
//
// Every entry point tolerates a missing IndexedDB (server render, or a browser
// with storage disabled) by returning empty data instead of throwing, so the
// app can render its loading shell and then hydrate.

import Dexie, { type Table } from "dexie";
import { useLiveQuery } from "dexie-react-hooks";
import { v4 as uuid } from "uuid";

import { colorForName } from "./palette";
import {
  MAX_PROGRESS,
  MIN_PROGRESS,
  type Project,
  type Tag,
  type Task,
} from "./types";

class FocusListDB extends Dexie {
  tasks!: Table<Task, string>;
  projects!: Table<Project, string>;
  tags!: Table<Tag, string>;

  constructor() {
    super("focus-list");
    this.version(1).stores({
      tasks: "id, projectId, tagId, progress, createdAt, completedAt",
      projects: "id, name",
      tags: "id, name",
    });
  }
}

let instance: FocusListDB | null = null;

/** The database, or null when IndexedDB is unavailable (e.g. during SSR). */
export function getDb(): FocusListDB | null {
  if (typeof indexedDB === "undefined") return null;
  if (!instance) instance = new FocusListDB();
  return instance;
}

/* ------------------------------- helpers -------------------------------- */

export function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return MIN_PROGRESS;
  return Math.min(MAX_PROGRESS, Math.max(MIN_PROGRESS, Math.round(value)));
}

function now(): string {
  return new Date().toISOString();
}

/**
 * completedAt tracks the moment a task first reached 100%. Re-saving a task
 * that is already complete keeps the original timestamp; dropping back below
 * 100% clears it, so the Done list's dates stay meaningful.
 */
function completionStamp(progress: number, previous: string | null): string | null {
  if (progress < MAX_PROGRESS) return null;
  return previous ?? now();
}

export function projectMap(projects: Project[]): Record<string, Project> {
  return Object.fromEntries(projects.map((p) => [p.id, p]));
}

export function tagMap(tags: Tag[]): Record<string, Tag> {
  return Object.fromEntries(tags.map((t) => [t.id, t]));
}

/* -------------------------------- hooks --------------------------------- */

export function useAllTasks(): Task[] {
  const rows = useLiveQuery<Task[]>(
    async () => (await getDb()?.tasks.toArray()) ?? [],
    [],
    []
  );
  return rows ?? [];
}

export function useProjects(): Project[] {
  const rows = useLiveQuery<Project[]>(
    async () => (await getDb()?.projects.toArray()) ?? [],
    [],
    []
  );
  return (rows ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
}

export function useTags(): Tag[] {
  const rows = useLiveQuery<Tag[]>(
    async () => (await getDb()?.tags.toArray()) ?? [],
    [],
    []
  );
  return (rows ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
}

/* ------------------------------ mutations ------------------------------- */

export type NewTaskInput = {
  title: string;
  projectId: string;
  tagId: string;
  progress: number;
};

export async function createTask(input: NewTaskInput): Promise<Task | undefined> {
  const db = getDb();
  if (!db) return undefined;

  const progress = clampProgress(input.progress);
  const timestamp = now();
  const task: Task = {
    id: uuid(),
    title: input.title.trim(),
    projectId: input.projectId,
    tagId: input.tagId,
    progress,
    completedAt: completionStamp(progress, null),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await db.tasks.add(task);
  return task;
}

export type TaskPatch = Partial<
  Pick<Task, "title" | "projectId" | "tagId" | "progress">
>;

export async function updateTask(id: string, patch: TaskPatch): Promise<void> {
  const db = getDb();
  if (!db) return;

  const existing = await db.tasks.get(id);
  if (!existing) return;

  const progress =
    patch.progress === undefined
      ? existing.progress
      : clampProgress(patch.progress);

  await db.tasks.update(id, {
    ...patch,
    title: patch.title === undefined ? existing.title : patch.title.trim(),
    progress,
    completedAt: completionStamp(progress, existing.completedAt),
    updatedAt: now(),
  });
}

export async function setProgress(id: string, value: number): Promise<void> {
  await updateTask(id, { progress: value });
}

export async function deleteTask(id: string): Promise<void> {
  await getDb()?.tasks.delete(id);
}

export async function duplicateTask(id: string): Promise<Task | undefined> {
  const db = getDb();
  if (!db) return undefined;

  const source = await db.tasks.get(id);
  if (!source) return undefined;

  const timestamp = now();
  const copy: Task = {
    ...source,
    id: uuid(),
    title: `${source.title} (copy)`,
    completedAt: completionStamp(source.progress, null),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await db.tasks.add(copy);
  return copy;
}

/* --------------------------- projects and tags --------------------------- */

/**
 * Look up a project by name, case-insensitively, creating it if absent. Runs
 * inside a transaction so two rapid submits cannot produce duplicate rows.
 */
export async function findOrCreateProject(name: string): Promise<Project> {
  const trimmed = name.trim();
  const fallback: Project = {
    id: uuid(),
    name: trimmed,
    color: colorForName(trimmed),
  };

  const db = getDb();
  if (!db) return fallback;

  return db.transaction("rw", db.projects, async () => {
    const existing = await db.projects
      .filter((p) => p.name.toLowerCase() === trimmed.toLowerCase())
      .first();
    if (existing) return existing;
    await db.projects.add(fallback);
    return fallback;
  });
}

export async function findOrCreateTag(name: string): Promise<Tag> {
  const trimmed = name.trim();
  const fallback: Tag = {
    id: uuid(),
    name: trimmed,
    color: colorForName(trimmed),
  };

  const db = getDb();
  if (!db) return fallback;

  return db.transaction("rw", db.tags, async () => {
    const existing = await db.tags
      .filter((t) => t.name.toLowerCase() === trimmed.toLowerCase())
      .first();
    if (existing) return existing;
    await db.tags.add(fallback);
    return fallback;
  });
}
