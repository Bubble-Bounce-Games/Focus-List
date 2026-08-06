// Pure derivations over the task list: filtering, sorting, and grouping.
// No Dexie, no React — everything here is a plain function so the behaviour
// is testable without a database or a DOM.

import { colorForName } from "./palette";
import type { Project, SortKey, Tag, Task } from "./types";

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
