"use client";

import { useEffect, useState } from "react";
import { v4 as uuid } from "uuid";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { colorForName } from "./palette";
import { MAX_PROGRESS, MIN_PROGRESS, type DetailField, type Project, type Tag, type Task } from "./types";

export function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return MIN_PROGRESS;
  return Math.min(MAX_PROGRESS, Math.max(MIN_PROGRESS, Math.round(value)));
}
function now() { return new Date().toISOString(); }
function completionStamp(progress: number, previous: string | null) { return progress < MAX_PROGRESS ? null : previous ?? now(); }
export function projectMap(projects: Project[]): Record<string, Project> { return Object.fromEntries(projects.map((project) => [project.id, project])); }
export function tagMap(tags: Tag[]): Record<string, Tag> { return Object.fromEntries(tags.map((tag) => [tag.id, tag])); }

type Row = Record<string, unknown>;
function mapProject(row: Row): Project { return { id: String(row.id), name: String(row.name), color: String(row.color) }; }
function mapTag(row: Row): Tag { return { id: String(row.id), name: String(row.name), color: String(row.color) }; }
function mapTask(row: Row): Task {
  return { id: String(row.id), title: String(row.title), projectId: String(row.project_id), tagId: String(row.tag_id), progress: Number(row.progress), completedAt: row.completed_at ? String(row.completed_at) : null, createdAt: String(row.created_at), updatedAt: String(row.updated_at), progressNote: String(row.progress_note ?? ""), blocker: String(row.blocker ?? ""), notes: String(row.notes ?? ""), dueDate: row.due_date ? String(row.due_date) : null, archivedAt: row.archived_at ? String(row.archived_at) : null, deletedAt: row.deleted_at ? String(row.deleted_at) : null };
}

function useCloudRows<T>(table: "tasks" | "projects" | "tags"): T[] {
  const [rows, setRows] = useState<T[]>([]);
  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    let active = true;
    const load = async () => { const { data } = await client.from(table).select("*"); if (active && data) setRows(data as T[]); };
    void load();
    const channel = client.channel(`focus-list-${table}`).on("postgres_changes", { event: "*", schema: "public", table }, () => void load()).subscribe();
    return () => { active = false; void client.removeChannel(channel); };
  }, [table]);
  return rows;
}
export function useAllTasks(): Task[] { return useCloudRows<Row>("tasks").map(mapTask); }
export function useProjects(): Project[] { return useCloudRows<Row>("projects").map(mapProject).sort((a, b) => a.name.localeCompare(b.name)); }
export function useTags(): Tag[] { return useCloudRows<Row>("tags").map(mapTag).sort((a, b) => a.name.localeCompare(b.name)); }

async function context() {
  const client = getSupabaseBrowserClient();
  if (!client) return null;
  const { data } = await client.auth.getUser();
  return data.user ? { client, userId: data.user.id } : null;
}
export type NewTaskInput = { title: string; projectId: string; tagId: string; progress: number };
export type TaskPatch = Partial<Pick<Task, "title" | "projectId" | "tagId" | "progress" | "progressNote" | "blocker" | "notes" | "dueDate">>;

export async function createTask(input: NewTaskInput): Promise<Task | undefined> {
  const c = await context(); if (!c) return undefined;
  const progress = clampProgress(input.progress);
  const { data } = await c.client.from("tasks").insert({ id: uuid(), user_id: c.userId, title: input.title.trim(), project_id: input.projectId, tag_id: input.tagId, progress, completed_at: completionStamp(progress, null) }).select().single();
  return data ? mapTask(data) : undefined;
}
export async function updateTask(id: string, patch: TaskPatch): Promise<void> {
  const c = await context(); if (!c) return;
  const { data: existing } = await c.client.from("tasks").select("*").eq("id", id).single(); if (!existing) return;
  const progress = patch.progress === undefined ? Number(existing.progress) : clampProgress(patch.progress);
  await c.client.from("tasks").update({ ...(patch.title === undefined ? {} : { title: patch.title.trim() }), ...(patch.projectId === undefined ? {} : { project_id: patch.projectId }), ...(patch.tagId === undefined ? {} : { tag_id: patch.tagId }), ...(patch.progressNote === undefined ? {} : { progress_note: patch.progressNote }), ...(patch.blocker === undefined ? {} : { blocker: patch.blocker }), ...(patch.notes === undefined ? {} : { notes: patch.notes }), ...(patch.dueDate === undefined ? {} : { due_date: patch.dueDate }), progress, completed_at: completionStamp(progress, existing.completed_at), updated_at: now() }).eq("id", id);
}
export async function setProgress(id: string, value: number) { await updateTask(id, { progress: value }); }
export async function setTaskDetail(id: string, field: DetailField, value: string) { await updateTask(id, { [field]: value }); }
export async function deleteTask(id: string) { const c = await context(); if (c) await c.client.from("tasks").update({ deleted_at: now(), updated_at: now() }).eq("id", id); }
export async function archiveTask(id: string) { const c = await context(); if (c) await c.client.from("tasks").update({ archived_at: now(), updated_at: now() }).eq("id", id); }
export async function duplicateTask(id: string): Promise<Task | undefined> {
  const c = await context(); if (!c) return undefined;
  const { data: source } = await c.client.from("tasks").select("*").eq("id", id).single(); if (!source) return undefined;
  const timestamp = now(); const { data } = await c.client.from("tasks").insert({ id: uuid(), user_id: c.userId, project_id: source.project_id, tag_id: source.tag_id, title: `${source.title} (copy)`, progress: source.progress, completed_at: completionStamp(Number(source.progress), null), progress_note: source.progress_note, blocker: source.blocker, notes: source.notes, created_at: timestamp, updated_at: timestamp }).select().single();
  return data ? mapTask(data) : undefined;
}
export async function findOrCreateProject(name: string): Promise<Project> {
  const c = await context(); const trimmed = name.trim(); const fallback = { id: uuid(), name: trimmed, color: colorForName(trimmed) }; if (!c) return fallback;
  const { data: existing } = await c.client.from("projects").select("*").eq("name", trimmed).maybeSingle(); if (existing) return mapProject(existing);
  const { data } = await c.client.from("projects").insert({ ...fallback, user_id: c.userId }).select().single(); return data ? mapProject(data) : fallback;
}
export async function findOrCreateTag(name: string): Promise<Tag> {
  const c = await context(); const trimmed = name.trim(); const fallback = { id: uuid(), name: trimmed, color: colorForName(trimmed) }; if (!c) return fallback;
  const { data: existing } = await c.client.from("tags").select("*").eq("name", trimmed).maybeSingle(); if (existing) return mapTag(existing);
  const { data } = await c.client.from("tags").insert({ ...fallback, user_id: c.userId }).select().single(); return data ? mapTag(data) : fallback;
}
