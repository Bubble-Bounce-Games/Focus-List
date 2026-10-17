// Core domain types for Focus List. These shapes map to the private S3 state that
// the components render.

export type Project = {
  id: string;
  name: string;
  color: string;
  archivedAt?: string | null;
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
  /** Free-text log of what has been done so far. */
  progressNote: string;
  /** What is currently standing in the way, if anything. */
  blocker: string;
  /** Anything else worth remembering about the task. */
  notes: string;
  dueDate?: string | null;
  archivedAt?: string | null;
  deletedAt?: string | null;
};

export type DailyTask = {
  id: string;
  title: string;
  dateKey: string;
  timeSetup: string;
  tag: string;
  intensity: number;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
  deletedAt?: string | null;
};

/** The three free-text fields shown in a task's expandable detail panel. */
export const DETAIL_FIELDS = ["progressNote", "blocker", "notes"] as const;

export type DetailField = (typeof DETAIL_FIELDS)[number];

export type TaskDetails = Pick<Task, DetailField>;

export const EMPTY_DETAILS: TaskDetails = {
  progressNote: "",
  blocker: "",
  notes: "",
};

/** True when any detail field has content — drives the collapsed-row marker. */
export function hasDetails(task: Task): boolean {
  return DETAIL_FIELDS.some((field) => (task[field] ?? "").trim() !== "");
}

/** A blocker is called out separately: it is the one detail that needs chasing. */
export function isBlocked(task: Task): boolean {
  return (task.blocker ?? "").trim() !== "";
}

export const MIN_PROGRESS = 0;
export const MAX_PROGRESS = 100;

export type SortKey =
  | "progress-desc"
  | "progress-asc"
  | "title-asc"
  | "project-asc"
  | "recent"
  | "oldest";

// Labels are "Group: detail" — the header shows the part before the colon
// when the viewport is too narrow for the full label.
export const SORT_OPTIONS: ReadonlyArray<{ value: SortKey; label: string }> = [
  { value: "progress-desc", label: "Progress: High to low" },
  { value: "progress-asc", label: "Progress: Low to high" },
  { value: "recent", label: "Created: Newest first" },
  { value: "oldest", label: "Created: Oldest first" },
  { value: "project-asc", label: "Project: A to Z" },
  { value: "title-asc", label: "Title: A to Z" },
];

export const DEFAULT_SORT: SortKey = "progress-desc";

// A task is complete once it hits 100%. There is no separate "done" flag —
// progress is the single source of truth, which is why a task dragged back
// below 100 returns to Active on its own.
export function isComplete(task: Task): boolean {
  return task.progress >= MAX_PROGRESS;
}

export type WorkspaceState = {
  schemaVersion: 1;
  projects: Project[];
  tags: Tag[];
  tasks: Task[];
  dailyTasks: DailyTask[];
  notes: unknown[];
  reminders: unknown[];
  updatedAt: string | null;
};

export function workspaceHasData(state: Partial<WorkspaceState> | null | undefined): boolean {
  if (!state) return false;
  return [
    state.projects,
    state.tags,
    state.tasks,
    state.dailyTasks,
    state.notes,
    state.reminders,
  ].some((collection) => Array.isArray(collection) && collection.length > 0);
}

export function pickLatestWorkspaceState(
  localState: Partial<WorkspaceState> | null | undefined,
  cloudState: Partial<WorkspaceState> | null | undefined,
): Partial<WorkspaceState> | null {
  const localHasData = workspaceHasData(localState);
  const cloudHasData = workspaceHasData(cloudState);
  if (!localHasData && !cloudHasData) return null;
  if (!localHasData) return cloudState ?? null;
  if (!cloudHasData) return localState ?? null;

  const localStamp = localState?.updatedAt ? Date.parse(localState.updatedAt) : Number.NEGATIVE_INFINITY;
  const cloudStamp = cloudState?.updatedAt ? Date.parse(cloudState.updatedAt) : Number.NEGATIVE_INFINITY;
  if (Number.isNaN(localStamp) && Number.isNaN(cloudStamp)) return localState ?? cloudState ?? null;
  if (Number.isNaN(localStamp)) return cloudState ?? null;
  if (Number.isNaN(cloudStamp)) return localState ?? null;
  return localStamp >= cloudStamp ? localState ?? null : cloudState ?? null;
}
