"use client";

import { v4 as uuid } from "uuid";
import { colorForName } from "./palette";
import {
  updatePrivateS3State,
  usePrivateS3State,
} from "./private-s3-state";
import {
  MAX_PROGRESS,
  MIN_PROGRESS,
  type DetailField,
  type Project,
  type Tag,
  type Task,
} from "./types";

export function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return MIN_PROGRESS;
  return Math.min(MAX_PROGRESS, Math.max(MIN_PROGRESS, Math.round(value)));
}

function now(): string {
  return new Date().toISOString();
}

function completionStamp(progress: number, previous: string | null): string | null {
  return progress < MAX_PROGRESS ? null : previous ?? now();
}

export function projectMap(projects: Project[]): Record<string, Project> {
  return Object.fromEntries(projects.map((project) => [project.id, project]));
}

export function tagMap(tags: Tag[]): Record<string, Tag> {
  return Object.fromEntries(tags.map((tag) => [tag.id, tag]));
}

export function useAllTasks(): Task[] {
  return usePrivateS3State().tasks;
}

export function useProjects(): Project[] {
  return usePrivateS3State().projects.slice().sort((a, b) => a.name.localeCompare(b.name));
}

export function useTags(): Tag[] {
  return usePrivateS3State().tags.slice().sort((a, b) => a.name.localeCompare(b.name));
}

export type NewTaskInput = {
  title: string;
  projectId: string;
  tagId: string;
  progress: number;
};

export type TaskPatch = Partial<
  Pick<Task, "title" | "projectId" | "tagId" | "progress" | "progressNote" | "blocker" | "notes" | "dueDate">
>;

export async function createTask(input: NewTaskInput): Promise<Task> {
  const timestamp = now();
  const progress = clampProgress(input.progress);
  const task: Task = {
    id: uuid(),
    title: input.title.trim(),
    projectId: input.projectId,
    tagId: input.tagId,
    progress,
    completedAt: completionStamp(progress, null),
    createdAt: timestamp,
    updatedAt: timestamp,
    progressNote: "",
    blocker: "",
    notes: "",
    dueDate: null,
    archivedAt: null,
    deletedAt: null,
  };
  await updatePrivateS3State((state) => ({ ...state, tasks: [...state.tasks, task] }));
  return task;
}

export async function updateTask(id: string, patch: TaskPatch): Promise<void> {
  await updatePrivateS3State((state) => ({
    ...state,
    tasks: state.tasks.map((task) => {
      if (task.id !== id) return task;
      const progress = patch.progress === undefined ? task.progress : clampProgress(patch.progress);
      return {
        ...task,
        ...patch,
        ...(patch.title === undefined ? {} : { title: patch.title.trim() }),
        progress,
        completedAt: completionStamp(progress, task.completedAt),
        updatedAt: now(),
      };
    }),
  }));
}

export async function setProgress(id: string, value: number): Promise<void> {
  await updateTask(id, { progress: value });
}

export async function setTaskDetail(id: string, field: DetailField, value: string): Promise<void> {
  await updateTask(id, { [field]: value });
}

export async function deleteTask(id: string): Promise<void> {
  const timestamp = now();
  await updatePrivateS3State((state) => ({
    ...state,
    tasks: state.tasks.map((task) => task.id === id
      ? { ...task, deletedAt: timestamp, updatedAt: timestamp }
      : task),
  }));
}

export async function archiveTask(id: string): Promise<void> {
  const timestamp = now();
  await updatePrivateS3State((state) => ({
    ...state,
    tasks: state.tasks.map((task) => task.id === id
      ? { ...task, archivedAt: timestamp, updatedAt: timestamp }
      : task),
  }));
}

export async function duplicateTask(id: string): Promise<Task | undefined> {
  let duplicate: Task | undefined;
  await updatePrivateS3State((state) => {
    const source = state.tasks.find((task) => task.id === id);
    if (!source) return state;
    const timestamp = now();
    const copy: Task = {
      ...source,
      id: uuid(),
      title: `${source.title} (copy)`,
      completedAt: completionStamp(source.progress, null),
      createdAt: timestamp,
      updatedAt: timestamp,
      archivedAt: null,
      deletedAt: null,
    };
    duplicate = copy;
    return { ...state, tasks: [...state.tasks, copy] };
  });
  return duplicate;
}

export async function findOrCreateProject(name: string): Promise<Project> {
  const trimmed = name.trim();
  let project: Project | undefined;
  await updatePrivateS3State((state) => {
    project = state.projects.find((item) => item.name === trimmed);
    if (project) return state;
    const created = { id: uuid(), name: trimmed, color: colorForName(trimmed) };
    project = created;
    return { ...state, projects: [...state.projects, created] };
  });
  return project as Project;
}

export async function renameProject(id: string, name: string): Promise<Project | undefined> {
  const trimmed = name.trim();
  if (!trimmed) return undefined;
  let project: Project | undefined;
  await updatePrivateS3State((state) => ({
    ...state,
    projects: state.projects.map((item) => {
      if (item.id !== id) return item;
      project = { ...item, name: trimmed, color: colorForName(trimmed) };
      return project;
    }),
  }));
  return project;
}

export async function findOrCreateTag(name: string): Promise<Tag> {
  const trimmed = name.trim();
  let tag: Tag | undefined;
  await updatePrivateS3State((state) => {
    tag = state.tags.find((item) => item.name === trimmed);
    if (tag) return state;
    const created = { id: uuid(), name: trimmed, color: colorForName(trimmed) };
    tag = created;
    return { ...state, tags: [...state.tags, created] };
  });
  return tag as Tag;
}
