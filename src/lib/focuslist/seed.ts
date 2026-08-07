"use client";

// First-launch sample data. Runs once: if the tasks table already has a row,
// or IndexedDB is unavailable, this is a no-op. Clearing site data brings the
// samples back, which makes the app easy to demo from a clean state.

import { v4 as uuid } from "uuid";

import { colorForName } from "./palette";
import { getDb, SEEDED_KEY } from "./store";
import { MAX_PROGRESS, type Project, type Tag, type Task } from "./types";

const SAMPLE_PROJECTS = ["Website Redesign", "Mobile App", "Research"] as const;
const SAMPLE_TAGS = ["Design", "Engineering", "Writing"] as const;

type SampleTask = {
  title: string;
  project: number;
  tag: number;
  progress: number;
  progressNote?: string;
  blocker?: string;
  notes?: string;
};

const SAMPLE_TASKS: readonly SampleTask[] = [
  {
    title: "Draft the new landing page copy",
    project: 0,
    tag: 2,
    progress: 65,
    progressNote: "Hero and features sections drafted. Pricing copy still open.",
    notes: "Keep the tone plain — no superlatives.",
  },
  {
    title: "Rebuild the pricing section with the new three-tier layout and annual toggle",
    project: 0,
    tag: 0,
    progress: 40,
    progressNote: "Tier cards laid out; annual/monthly toggle not wired yet.",
    blocker: "Waiting on final pricing numbers from finance.",
  },
  {
    title: "Audit colour contrast for accessibility",
    project: 0,
    tag: 0,
    progress: 15,
    notes: "Target WCAG AA. The muted grey on white is the likely failure.",
  },
  {
    title: "Wire up offline task storage",
    project: 1,
    tag: 1,
    progress: 80,
    progressNote: "IndexedDB layer done and migrating cleanly between versions.",
  },
  { title: "Add pull-to-refresh gesture", project: 1, tag: 1, progress: 0 },
  {
    title: "Summarise competitor onboarding flows",
    project: 2,
    tag: 2,
    progress: 100,
    notes: "Six products reviewed. Shortest flow was four screens.",
  },
  { title: "Ship the icon set", project: 0, tag: 0, progress: 100 },
];

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export async function seedIfEmpty(): Promise<void> {
  const db = getDb();
  if (!db) return;

  // Guarded by a recorded flag, not by "is the task list empty?" — otherwise
  // deleting every task would resurrect the samples on the next reload.
  if (await db.meta.get(SEEDED_KEY)) return;

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

  const tasks: Task[] = SAMPLE_TASKS.map((sample, i) => {
    const createdAt = daysAgo(SAMPLE_TASKS.length - i);
    return {
      id: uuid(),
      title: sample.title,
      projectId: projects[sample.project].id,
      tagId: tags[sample.tag].id,
      progress: sample.progress,
      completedAt: sample.progress >= MAX_PROGRESS ? daysAgo(1) : null,
      createdAt,
      updatedAt: createdAt,
      progressNote: sample.progressNote ?? "",
      blocker: sample.blocker ?? "",
      notes: sample.notes ?? "",
    };
  });

  await db.transaction(
    "rw",
    db.projects,
    db.tags,
    db.tasks,
    db.meta,
    async () => {
      // Re-check inside the transaction: two tabs opening at once must not
      // both decide the database is unseeded and insert the samples twice.
      if (await db.meta.get(SEEDED_KEY)) return;
      await db.projects.bulkAdd(projects);
      await db.tags.bulkAdd(tags);
      await db.tasks.bulkAdd(tasks);
      // Same transaction as the inserts, so a crash midway cannot leave the
      // database marked seeded but empty.
      await db.meta.put({ key: SEEDED_KEY, value: true });
    }
  );
}
