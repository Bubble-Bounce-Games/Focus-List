"use client";

// First-launch sample data. Runs once: if the tasks table already has a row,
// or IndexedDB is unavailable, this is a no-op. Clearing site data brings the
// samples back, which makes the app easy to demo from a clean state.

import { v4 as uuid } from "uuid";

import { colorForName } from "./palette";
import { getDb } from "./store";
import { MAX_PROGRESS, type Project, type Tag, type Task } from "./types";

const SAMPLE_PROJECTS = ["Website Redesign", "Mobile App", "Research"] as const;
const SAMPLE_TAGS = ["Design", "Engineering", "Writing"] as const;

// [title, project index, tag index, progress]
const SAMPLE_TASKS: ReadonlyArray<[string, number, number, number]> = [
  ["Draft the new landing page copy", 0, 2, 65],
  ["Rebuild the pricing section", 0, 0, 40],
  ["Audit colour contrast for accessibility", 0, 0, 15],
  ["Wire up offline task storage", 1, 1, 80],
  ["Add pull-to-refresh gesture", 1, 1, 0],
  ["Summarise competitor onboarding flows", 2, 2, 100],
  ["Ship the icon set", 0, 0, 100],
];

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export async function seedIfEmpty(): Promise<void> {
  const db = getDb();
  if (!db) return;

  if ((await db.tasks.count()) > 0) return;

  const projects: Project[] = SAMPLE_PROJECTS.map((name) => ({
    id: uuid(),
    name,
    color: colorForName(name),
  }));

  const tags: Tag[] = SAMPLE_TAGS.map((name) => ({
    id: uuid(),
    name,
    color: colorForName(name),
  }));

  const tasks: Task[] = SAMPLE_TASKS.map(
    ([title, projectIndex, tagIndex, progress], i) => {
      const createdAt = daysAgo(SAMPLE_TASKS.length - i);
      return {
        id: uuid(),
        title,
        projectId: projects[projectIndex].id,
        tagId: tags[tagIndex].id,
        progress,
        completedAt: progress >= MAX_PROGRESS ? daysAgo(1) : null,
        createdAt,
        updatedAt: createdAt,
      };
    }
  );

  await db.transaction("rw", db.projects, db.tags, db.tasks, async () => {
    // Re-check inside the transaction: two tabs opening at once must not
    // both decide the database is empty and seed it twice.
    if ((await db.tasks.count()) > 0) return;
    await db.projects.bulkAdd(projects);
    await db.tags.bulkAdd(tags);
    await db.tasks.bulkAdd(tasks);
  });
}
