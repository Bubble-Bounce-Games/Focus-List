import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Project, Tag, Task } from "./types";

const PINNED_NOTES_KEY = "fl.pinnedNotes";
const CALENDAR_REMINDERS_KEY = "fl.calendarReminders";

export type PrivateS3State = {
  schemaVersion: 1;
  projects: Project[];
  tags: Tag[];
  tasks: Task[];
  notes: unknown[];
  reminders: unknown[];
  updatedAt: string | null;
};

export type VersionedPrivateS3State = {
  state: PrivateS3State;
  etag: string | null;
};

export type PrivateS3MigrationResult = {
  status: "already-migrated" | "migrated";
  counts: {
    projects: number;
    tags: number;
    tasks: number;
    notes: number;
    reminders: number;
  };
};

type SupabaseRow = Record<string, unknown>;

let migrationPromise: Promise<PrivateS3MigrationResult> | null = null;

function dataApiUrl(): string | null {
  const value = process.env.NEXT_PUBLIC_FOCUS_LIST_DATA_API_URL?.trim();
  return value ? value.replace(/\/$/, "") : null;
}

async function accessToken(): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase authentication is not configured");

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error("A valid login session is required");
  }

  return data.session.access_token;
}

async function stateRequest(
  method: "GET" | "PUT",
  state?: PrivateS3State,
  etag?: string | null,
): Promise<VersionedPrivateS3State> {
  const baseUrl = dataApiUrl();
  if (!baseUrl) throw new Error("Private S3 data API is not configured");

  const token = await accessToken();
  const response = await fetch(`${baseUrl}/state`, {
    method,
    cache: "no-store",
    headers: {
      authorization: `Bearer ${token}`,
      ...(state ? { "content-type": "application/json" } : {}),
      ...(etag ? { "if-match": etag } : {}),
    },
    ...(state ? { body: JSON.stringify(state) } : {}),
  });

  const payload = (await response.json()) as PrivateS3State | { error?: string };
  if (!response.ok) {
    const message = "error" in payload && payload.error
      ? payload.error
      : `Private data request failed with status ${response.status}`;
    throw new Error(message);
  }

  return {
    state: payload as PrivateS3State,
    etag: response.headers.get("etag"),
  };
}

export async function loadPrivateS3State(): Promise<VersionedPrivateS3State> {
  return stateRequest("GET");
}

export async function savePrivateS3State(
  state: PrivateS3State,
  etag?: string | null,
): Promise<VersionedPrivateS3State> {
  return stateRequest("PUT", state, etag);
}

function mapProject(row: SupabaseRow): Project {
  return {
    id: String(row.id),
    name: String(row.name),
    color: String(row.color),
  };
}

function mapTag(row: SupabaseRow): Tag {
  return {
    id: String(row.id),
    name: String(row.name),
    color: String(row.color),
  };
}

function mapTask(row: SupabaseRow): Task {
  return {
    id: String(row.id),
    title: String(row.title),
    projectId: String(row.project_id),
    tagId: String(row.tag_id),
    progress: Number(row.progress),
    completedAt: row.completed_at ? String(row.completed_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    progressNote: String(row.progress_note ?? ""),
    blocker: String(row.blocker ?? ""),
    notes: String(row.notes ?? ""),
    dueDate: row.due_date ? String(row.due_date) : null,
    archivedAt: row.archived_at ? String(row.archived_at) : null,
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
  };
}

function localArray(key: string): unknown[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function counts(state: PrivateS3State): PrivateS3MigrationResult["counts"] {
  return {
    projects: state.projects.length,
    tags: state.tags.length,
    tasks: state.tasks.length,
    notes: state.notes.length,
    reminders: state.reminders.length,
  };
}

function ids(values: unknown[]): string[] {
  return values
    .map((value) => {
      if (!value || typeof value !== "object" || !("id" in value)) return "";
      return String(value.id);
    })
    .filter(Boolean)
    .sort();
}

function sameIds(left: unknown[], right: unknown[]): boolean {
  return JSON.stringify(ids(left)) === JSON.stringify(ids(right));
}

function verified(source: PrivateS3State, stored: PrivateS3State): boolean {
  return (
    sameIds(source.projects, stored.projects) &&
    sameIds(source.tags, stored.tags) &&
    sameIds(source.tasks, stored.tasks) &&
    sameIds(source.notes, stored.notes) &&
    sameIds(source.reminders, stored.reminders)
  );
}

async function runMigration(): Promise<PrivateS3MigrationResult> {
  const existing = await loadPrivateS3State();
  if (existing.state.updatedAt) {
    return { status: "already-migrated", counts: counts(existing.state) };
  }

  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase authentication is not configured");

  const [projectsResult, tagsResult, tasksResult] = await Promise.all([
    supabase.from("projects").select("*"),
    supabase.from("tags").select("*"),
    supabase.from("tasks").select("*"),
  ]);

  const queryError = projectsResult.error ?? tagsResult.error ?? tasksResult.error;
  if (queryError) throw new Error(`Unable to read Supabase data: ${queryError.message}`);

  const source: PrivateS3State = {
    schemaVersion: 1,
    projects: (projectsResult.data ?? []).map(mapProject),
    tags: (tagsResult.data ?? []).map(mapTag),
    tasks: (tasksResult.data ?? []).map(mapTask),
    notes: localArray(PINNED_NOTES_KEY),
    reminders: localArray(CALENDAR_REMINDERS_KEY),
    updatedAt: null,
  };

  await savePrivateS3State(source, existing.etag);
  const stored = await loadPrivateS3State();
  if (!verified(source, stored.state)) {
    throw new Error("Private S3 verification did not match the Supabase source");
  }

  return { status: "migrated", counts: counts(stored.state) };
}

export function migrateCurrentUserToPrivateS3(): Promise<PrivateS3MigrationResult> {
  migrationPromise ??= runMigration().finally(() => {
    migrationPromise = null;
  });
  return migrationPromise;
}
