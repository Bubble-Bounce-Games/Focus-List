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
import { labelsFreedByPatch } from "./selectors";
import {
  EMPTY_DETAILS,
  MAX_PROGRESS,
  MIN_PROGRESS,
  type DetailField,
  type Project,
  type Tag,
  type Task,
} from "./types";

export type MetaRow = { key: string; value: unknown };

/** Set once the sample data has been inserted, so it is never inserted twice. */
export const SEEDED_KEY = "seeded";

export class FocusListDB extends Dexie {
  tasks!: Table<Task, string>;
  projects!: Table<Project, string>;
  tags!: Table<Tag, string>;
  meta!: Table<MetaRow, string>;

  constructor(name = "focuslist") {
    super(name);

    const schema = {
      tasks: "id, projectId, tagId, progress, createdAt, completedAt",
      projects: "id, name",
      tags: "id, name",
    };

    this.version(1).stores(schema);

    // v2 adds progressNote / blocker / notes. They are not indexed, so the
    // store definition is unchanged — but existing rows are backfilled so the
    // detail editors never bind to undefined and turn into uncontrolled inputs.
    this.version(2)
      .stores(schema)
      .upgrade((tx) =>
        tx
          .table<Task>("tasks")
          .toCollection()
          .modify((task) => {
            task.progressNote ??= "";
            task.blocker ??= "";
            task.notes ??= "";
          })
      );

    // v3 records whether the samples have been inserted. Previously that was
    // inferred from "are there zero tasks?", which meant deleting every task
    // brought the sample data back on the next reload — the app silently
    // undoing a deliberate deletion.
    //
    // upgrade() runs only when migrating from an older version, never on a
    // fresh database. So an existing install is marked as already seeded (it
    // has either its samples or the user's own data, and in both cases must be
    // left alone), while a brand-new database has no flag and gets seeded once.
    this.version(3)
      .stores({ ...schema, meta: "key" })
      .upgrade((tx) => tx.table<MetaRow>("meta").put({ key: SEEDED_KEY, value: true }));
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
  return useLiveQuery(
    async () => (await getDb()?.tasks.toArray()) ?? [],
    [],
    [] as Task[]
  );
}

export function useProjects(): Project[] {
  const rows = useLiveQuery(
    async () => (await getDb()?.projects.toArray()) ?? [],
    [],
    [] as Project[]
  );
  return rows.slice().sort((a, b) => a.name.localeCompare(b.name));
}

export function useTags(): Tag[] {
  const rows = useLiveQuery(
    async () => (await getDb()?.tags.toArray()) ?? [],
    [],
    [] as Tag[]
  );
  return rows.slice().sort((a, b) => a.name.localeCompare(b.name));
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
    ...EMPTY_DETAILS,
  };

  await db.tasks.add(task);
  return task;
}

export type TaskPatch = Partial<
  Pick<
    Task,
    "title" | "projectId" | "tagId" | "progress" | "progressNote" | "blocker" | "notes"
  >
>;

export async function updateTask(id: string, patch: TaskPatch): Promise<void> {
  const db = getDb();
  if (!db) return;

  await db.transaction("rw", db.tasks, db.projects, db.tags, async () => {
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

    // Moving the last task out of a project or tag orphans the old label.
    const freed = labelsFreedByPatch(existing, patch);
    await pruneOrphanLabels(db, freed.projectId, freed.tagId);
  });
}

export async function setProgress(id: string, value: number): Promise<void> {
  await updateTask(id, { progress: value });
}

/**
 * Writes one field of the detail panel. Called from a debounced autosave, so
 * it stays a single narrow write rather than round-tripping the whole task.
 */
export async function setTaskDetail(
  id: string,
  field: DetailField,
  value: string
): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.tasks.update(id, { [field]: value, updatedAt: now() });
}

/**
 * Projects and tags exist only to label tasks — they are created implicitly
 * when a task names one. So when the last task referencing one goes away, the
 * label goes with it, rather than lingering in the filter menus forever.
 * Callers must already hold a readwrite transaction over the three tables.
 */
async function pruneOrphanLabels(
  db: FocusListDB,
  projectId: string | null,
  tagId: string | null
): Promise<void> {
  if (projectId) {
    const remaining = await db.tasks.where("projectId").equals(projectId).count();
    if (remaining === 0) await db.projects.delete(projectId);
  }
  if (tagId) {
    const remaining = await db.tasks.where("tagId").equals(tagId).count();
    if (remaining === 0) await db.tags.delete(tagId);
  }
}

export async function deleteTask(id: string): Promise<void> {
  const db = getDb();
  if (!db) return;

  await db.transaction("rw", db.tasks, db.projects, db.tags, async () => {
    const task = await db.tasks.get(id);
    if (!task) return;
    await db.tasks.delete(id);
    await pruneOrphanLabels(db, task.projectId, task.tagId);
  });
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
 *
 * `color` applies only when the project is created — an existing project keeps
 * the colour it already has, so the same project never renders two ways.
 */
export async function findOrCreateProject(
  name: string,
  color?: string
): Promise<Project> {
  const trimmed = name.trim();
  const fallback: Project = {
    id: uuid(),
    name: trimmed,
    color: color ?? colorForName(trimmed),
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
