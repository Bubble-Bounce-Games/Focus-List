import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { colorForName } from "./palette";
import {
  EMPTY_DETAILS,
  MAX_PROGRESS,
  MIN_PROGRESS,
  type DetailField,
  type Project,
  type Tag,
  type Task,
} from "./types";

type StoredTask = {
  id: string;
  title: string;
  projectId: string;
  tagId: string;
  progress: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  progressNote: string;
  blocker: string;
  notes: string;
};

export type FocusListSnapshot = {
  tasks: Task[];
  projects: Project[];
  tags: Tag[];
};

let instance: DatabaseSync | null = null;

function databasePath() {
  const dataDirectory = process.env.FOCUS_LIST_DATA_DIR ?? path.join(process.cwd(), "data");
  return process.env.FOCUS_LIST_DB_PATH ?? path.join(dataDirectory, "focus-list.sqlite");
}

function db() {
  if (instance) return instance;
  const file = databasePath();
  mkdirSync(path.dirname(file), { recursive: true });
  instance = new DatabaseSync(file);
  instance.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL COLLATE NOCASE UNIQUE,
      color TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL COLLATE NOCASE UNIQUE,
      color TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      project_id TEXT NOT NULL REFERENCES projects(id),
      tag_id TEXT NOT NULL REFERENCES tags(id),
      progress INTEGER NOT NULL CHECK (progress BETWEEN 0 AND 100),
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      progress_note TEXT NOT NULL DEFAULT '',
      blocker TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT ''
    ) STRICT;
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      expires_at TEXT NOT NULL
    ) STRICT;
  `);
  return instance;
}

function timestamp() {
  return new Date().toISOString();
}

function clampProgress(value: number) {
  if (!Number.isFinite(value)) return MIN_PROGRESS;
  return Math.min(MAX_PROGRESS, Math.max(MIN_PROGRESS, Math.round(value)));
}

function taskFromRow(row: StoredTask): Task {
  return {
    ...row,
    progressNote: row.progressNote ?? "",
    blocker: row.blocker ?? "",
    notes: row.notes ?? "",
  };
}

function getTask(id: string): Task | null {
  const row = db()
    .prepare(`SELECT id, title, project_id AS projectId, tag_id AS tagId, progress,
      completed_at AS completedAt, created_at AS createdAt, updated_at AS updatedAt,
      progress_note AS progressNote, blocker, notes FROM tasks WHERE id = ?`)
    .get(id) as StoredTask | undefined;
  return row ? taskFromRow(row) : null;
}

function requireProject(id: string) {
  const project = db().prepare("SELECT id, name, color FROM projects WHERE id = ?").get(id) as
    | Project
    | undefined;
  if (!project) throw new Error("Choose a project that has already been created.");
  return project;
}

function findOrCreateTag(name: string): Tag {
  const cleanName = name.trim();
  if (!cleanName) throw new Error("A tag name is required.");
  const existing = db()
    .prepare("SELECT id, name, color FROM tags WHERE name = ?")
    .get(cleanName) as Tag | undefined;
  if (existing) return existing;
  const tag: Tag = { id: randomUUID(), name: cleanName, color: colorForName(cleanName) };
  db().prepare("INSERT INTO tags (id, name, color) VALUES (?, ?, ?)").run(tag.id, tag.name, tag.color);
  return tag;
}

export function readSnapshot(): FocusListSnapshot {
  const database = db();
  const tasks = database
    .prepare(`SELECT id, title, project_id AS projectId, tag_id AS tagId, progress,
      completed_at AS completedAt, created_at AS createdAt, updated_at AS updatedAt,
      progress_note AS progressNote, blocker, notes FROM tasks ORDER BY created_at ASC`)
    .all() as StoredTask[];
  const projects = database.prepare("SELECT id, name, color FROM projects ORDER BY name COLLATE NOCASE").all() as Project[];
  const tags = database.prepare("SELECT id, name, color FROM tags ORDER BY name COLLATE NOCASE").all() as Tag[];
  return { tasks: tasks.map(taskFromRow), projects, tags };
}

export function createProject(name: string): Project {
  const cleanName = name.trim();
  if (!cleanName) throw new Error("A project name is required.");
  const existing = db()
    .prepare("SELECT id, name, color FROM projects WHERE name = ?")
    .get(cleanName) as Project | undefined;
  if (existing) return existing;
  const project: Project = { id: randomUUID(), name: cleanName, color: colorForName(cleanName) };
  db().prepare("INSERT INTO projects (id, name, color) VALUES (?, ?, ?)").run(project.id, project.name, project.color);
  return project;
}

export function createTask(input: {
  title: string;
  projectId: string;
  tagName: string;
  progress: number;
}): Task {
  const title = input.title.trim();
  if (!title) throw new Error("A task title is required.");
  requireProject(input.projectId);
  const tag = findOrCreateTag(input.tagName);
  const progress = clampProgress(input.progress);
  const createdAt = timestamp();
  const task: Task = {
    id: randomUUID(),
    title,
    projectId: input.projectId,
    tagId: tag.id,
    progress,
    completedAt: progress === MAX_PROGRESS ? createdAt : null,
    createdAt,
    updatedAt: createdAt,
    ...EMPTY_DETAILS,
  };
  db().prepare(`INSERT INTO tasks (
    id, title, project_id, tag_id, progress, completed_at, created_at, updated_at,
    progress_note, blocker, notes
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(task.id, task.title, task.projectId, task.tagId, task.progress, task.completedAt,
      task.createdAt, task.updatedAt, task.progressNote, task.blocker, task.notes);
  return task;
}

export function updateTask(
  id: string,
  patch: Partial<Pick<Task, "title" | "projectId" | "tagId" | "progress">> & { tagName?: string }
): Task {
  const current = getTask(id);
  if (!current) throw new Error("This task no longer exists.");
  const title = patch.title === undefined ? current.title : patch.title.trim();
  if (!title) throw new Error("A task title is required.");
  const projectId = patch.projectId ?? current.projectId;
  requireProject(projectId);
  const tagId = patch.tagName === undefined ? (patch.tagId ?? current.tagId) : findOrCreateTag(patch.tagName).id;
  const tag = db().prepare("SELECT id FROM tags WHERE id = ?").get(tagId);
  if (!tag) throw new Error("Choose a valid tag.");
  const progress = patch.progress === undefined ? current.progress : clampProgress(patch.progress);
  const completedAt = progress === MAX_PROGRESS ? current.completedAt ?? timestamp() : null;
  const updatedAt = timestamp();
  db().prepare(`UPDATE tasks SET title = ?, project_id = ?, tag_id = ?, progress = ?,
    completed_at = ?, updated_at = ? WHERE id = ?`)
    .run(title, projectId, tagId, progress, completedAt, updatedAt, id);
  return getTask(id)!;
}

export function setTaskDetail(id: string, field: DetailField, value: string): Task {
  const current = getTask(id);
  if (!current) throw new Error("This task no longer exists.");
  const columns: Record<DetailField, string> = {
    progressNote: "progress_note",
    blocker: "blocker",
    notes: "notes",
  };
  const column = columns[field];
  db().prepare(`UPDATE tasks SET ${column} = ?, updated_at = ? WHERE id = ?`).run(value, timestamp(), id);
  return getTask(id)!;
}

export function deleteTask(id: string) {
  db().prepare("DELETE FROM tasks WHERE id = ?").run(id);
}

export function duplicateTask(id: string): Task {
  const source = getTask(id);
  if (!source) throw new Error("This task no longer exists.");
  const createdAt = timestamp();
  const copy: Task = {
    ...source,
    id: randomUUID(),
    title: `${source.title} (copy)`,
    completedAt: source.progress === MAX_PROGRESS ? createdAt : null,
    createdAt,
    updatedAt: createdAt,
  };
  db().prepare(`INSERT INTO tasks (
    id, title, project_id, tag_id, progress, completed_at, created_at, updated_at,
    progress_note, blocker, notes
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(copy.id, copy.title, copy.projectId, copy.tagId, copy.progress, copy.completedAt,
      copy.createdAt, copy.updatedAt, copy.progressNote, copy.blocker, copy.notes);
  return copy;
}

export function createSession(): string {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  db().prepare("INSERT INTO sessions (token, expires_at) VALUES (?, ?)").run(token, expiresAt);
  return token;
}

export function isSessionValid(token: string | undefined): boolean {
  if (!token) return false;
  db().prepare("DELETE FROM sessions WHERE expires_at <= ?").run(timestamp());
  return Boolean(db().prepare("SELECT token FROM sessions WHERE token = ?").get(token));
}

export function closeDatabaseForTests() {
  instance?.close();
  instance = null;
}
