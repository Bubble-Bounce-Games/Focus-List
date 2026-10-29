// Pure derivations over the task list: filtering, sorting, and grouping.
// No Dexie, no React — everything here is a plain function so the behaviour
// is testable without a database or a DOM.

import { colorForName } from "./palette";
import { sumDailyTaskIntensityByDate, type DailyTask, type Project, type SortKey, type Tag, type Task } from "./types";
import { toDateKey } from "./calendar-reminders";

export type TaskFilter = {
  search: string;
  projectId: string | null;
  tagId: string | null;
};

export type DoneGroup = {
  project: Project;
  tasks: Task[];
};

/** Shown when a completed task points at a project that no longer exists. */
const UNASSIGNED: Project = {
  id: "__unassigned__",
  name: "Unassigned",
  color: colorForName("Unassigned"),
};

/**
 * Free-text search covers the task title plus its project and tag names, so
 * typing "design" finds tasks in the Design project even when the word is
 * absent from the title.
 */
export function matchTask(
  task: Task,
  filter: TaskFilter,
  projects: Record<string, Project>,
  tags: Record<string, Tag>
): boolean {
  if (filter.projectId !== null && task.projectId !== filter.projectId) {
    return false;
  }
  if (filter.tagId !== null && task.tagId !== filter.tagId) {
    return false;
  }

  const needle = filter.search.trim().toLowerCase();
  if (needle === "") return true;

  const haystack = [
    task.title,
    projects[task.projectId]?.name ?? "",
    tags[task.tagId]?.name ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(needle);
}

/** Sorts a copy — the input array is never mutated. */
export function sortTasks(
  tasks: Task[],
  sort: SortKey,
  projects: Record<string, Project>
): Task[] {
  const sorted = tasks.slice();

  switch (sort) {
    case "progress-desc":
      sorted.sort((a, b) => b.progress - a.progress || byTitle(a, b));
      break;
    case "progress-asc":
      sorted.sort((a, b) => a.progress - b.progress || byTitle(a, b));
      break;
    case "title-asc":
      sorted.sort(byTitle);
      break;
    case "project-asc":
      sorted.sort(
        (a, b) =>
          (projects[a.projectId]?.name ?? "").localeCompare(
            projects[b.projectId]?.name ?? ""
          ) || byTitle(a, b)
      );
      break;
    case "recent":
      sorted.sort(
        (a, b) => b.createdAt.localeCompare(a.createdAt) || byTitle(a, b)
      );
      break;
    case "oldest":
      sorted.sort(
        (a, b) => a.createdAt.localeCompare(b.createdAt) || byTitle(a, b)
      );
      break;
  }

  return sorted;
}

function byTitle(a: Task, b: Task): number {
  return a.title.localeCompare(b.title);
}

/**
 * Buckets completed tasks under their project. Groups are ordered by project
 * name; within a group the most recently completed task comes first.
 */
export function groupDoneByProject(
  tasks: Task[],
  projects: Record<string, Project>
): DoneGroup[] {
  const groups = new Map<string, DoneGroup>();

  for (const task of tasks) {
    const project = projects[task.projectId] ?? UNASSIGNED;
    const group = groups.get(project.id);
    if (group) {
      group.tasks.push(task);
    } else {
      groups.set(project.id, { project, tasks: [task] });
    }
  }

  const result = Array.from(groups.values());
  for (const group of result) {
    group.tasks.sort((a, b) =>
      (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt)
    );
  }
  result.sort((a, b) => a.project.name.localeCompare(b.project.name));

  return result;
}

function contributionLevel(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil(value / 25)));
}

export function buildContributionGrid(
  tasks: Task[],
  dailyTasks: DailyTask[],
  year: number,
): { cells: Array<{ date: string; count: number; weekIndex: number; dayIndex: number }>; total: number } {
  const counts = new Map<string, number>();

  for (const task of tasks.filter((entry) => !entry.archivedAt && !entry.deletedAt)) {
    const updatedAt = task.updatedAt ? new Date(task.updatedAt) : null;
    if (!updatedAt || Number.isNaN(updatedAt.getTime()) || updatedAt.getFullYear() !== year) continue;
    const dateKey = toDateKey(updatedAt);
    const nextValue = contributionLevel(task.progress);
    counts.set(dateKey, (counts.get(dateKey) ?? 0) + nextValue);
  }

  for (const [dateKey, intensity] of sumDailyTaskIntensityByDate(
    dailyTasks
      .filter((task) => !task.archivedAt && !task.deletedAt && !task.paused)
      .flatMap((task) => [
        { dateKey: task.dateKey, intensity: task.intensity },
        ...Object.entries(task.intensityByDate ?? {})
          .filter(([dateKey]) => dateKey > task.dateKey)
          .map(([dateKey, intensity]) => ({ dateKey, intensity })),
      ]),
  ).entries()) {
    if (!dateKey.startsWith(`${year}-`)) continue;
    const nextValue = contributionLevel(intensity);
    counts.set(dateKey, (counts.get(dateKey) ?? 0) + nextValue);
  }

  const anchor = new Date(year, 0, 1);
  anchor.setHours(0, 0, 0, 0);
  const start = new Date(anchor);
  const mondayOffset = (anchor.getDay() + 6) % 7;
  start.setDate(anchor.getDate() - mondayOffset);
  const end = new Date(year, 11, 31);
  end.setDate(end.getDate() + (6 - (end.getDay() + 6) % 7));

  const cells: Array<{ date: string; count: number; weekIndex: number; dayIndex: number }> = [];
  let total = 0;

  for (let index = 0, date = new Date(start); date <= end; index += 1, date.setDate(date.getDate() + 1)) {
    const key = toDateKey(date);
    const count = counts.get(key) ?? 0;
    if (date.getFullYear() === year && count > 0) total += 1;
    cells.push({
      date: key,
      count,
      weekIndex: Math.floor(index / 7),
      dayIndex: index % 7,
    });
  }

  return { cells, total };
}

/** A daily task starts fresh each day while retaining earlier intensity values. */
export function dailyTaskIntensityOnDate(task: DailyTask, dateKey: string): number {
  if (dateKey < task.dateKey) return 0;
  return dateKey === task.dateKey ? task.intensity : task.intensityByDate?.[dateKey] ?? 0;
}

export function dailyTaskHistoryOffsets(startDateKey: string, selectedDateKey: string, todayDateKey: string): number[] {
  const endDateKey = selectedDateKey < todayDateKey ? selectedDateKey : todayDateKey;
  const start = new Date(`${startDateKey}T00:00:00Z`);
  const end = new Date(`${endDateKey}T00:00:00Z`);
  const days = Math.round((end.getTime() - start.getTime()) / 86400000);
  if (!Number.isFinite(days) || days < 0) return [];
  return Array.from({ length: days + 1 }, (_, index) => index);
}

/** Set the chosen intensity for one date without changing any other day. */
export function setDailyTaskIntensityForDate(task: DailyTask, dateKey: string, requested: number): Pick<DailyTask, "intensity" | "intensityByDate"> {
  if (dateKey < task.dateKey) return { intensity: task.intensity };
  const current = dailyTaskIntensityOnDate(task, dateKey);
  const next = Number.isFinite(requested) ? Math.min(100, Math.max(0, Math.round(requested))) : current;
  return dateKey === task.dateKey
    ? { intensity: next }
    : { intensity: task.intensity, intensityByDate: { ...task.intensityByDate, [dateKey]: next } };
}

/** Calendar weeks always display Monday first and Sunday last. */
export function dailyTaskWeekDates(dateKey: string): string[] {
  const monday = new Date(`${dateKey}T12:00:00`);
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return toDateKey(date);
  });
}

/** History contains the seven completed calendar days before the selected date. */
export function dailyTaskRollingDates(dateKey: string): string[] {
  const end = new Date(`${dateKey}T12:00:00`);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(end);
    date.setDate(end.getDate() - 7 + index);
    return toDateKey(date);
  });
}
