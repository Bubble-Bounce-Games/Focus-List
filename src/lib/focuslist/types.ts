// Core domain types for Focus List. Everything is local-first: these shapes
// are what lives in IndexedDB and what the components render.

export type Project = {
  id: string;
  name: string;
  color: string;
};

export type Tag = {
  id: string;
  name: string;
  color: string;
};

export type Task = {
  id: string;
  title: string;
  projectId: string;
  tagId: string;
  /** 0–100, always an integer. 100 means the task is done. */
  progress: number;
  /** ISO timestamp of the moment progress first reached 100, else null. */
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export const MIN_PROGRESS = 0;
export const MAX_PROGRESS = 100;

export type SortKey =
  | "progress-desc"
  | "progress-asc"
  | "title-asc"
  | "project-asc"
  | "recent";

// Labels are "Group: detail" — the header shows the part before the colon
// when the viewport is too narrow for the full label.
export const SORT_OPTIONS: ReadonlyArray<{ value: SortKey; label: string }> = [
  { value: "progress-desc", label: "Progress: High to low" },
  { value: "progress-asc", label: "Progress: Low to high" },
  { value: "title-asc", label: "Title: A to Z" },
  { value: "project-asc", label: "Project: A to Z" },
  { value: "recent", label: "Recent: Newest first" },
];

export const DEFAULT_SORT: SortKey = "progress-desc";

// A task is complete once it hits 100%. There is no separate "done" flag —
// progress is the single source of truth, which is why a task dragged back
// below 100 returns to Active on its own.
export function isComplete(task: Task): boolean {
  return task.progress >= MAX_PROGRESS;
}
