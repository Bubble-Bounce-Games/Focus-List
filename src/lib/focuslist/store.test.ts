// Tests the real Dexie persistence layer against fake-indexeddb, so create,
// edit and delete are proven against an actual IndexedDB implementation rather
// than a stand-in. Run by scripts/test-logic.sh alongside the pure-logic tests.

import "fake-indexeddb/auto";

import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import { seedIfEmpty } from "./seed";
import {
  createTask,
  deleteTask,
  duplicateTask,
  findOrCreateProject,
  findOrCreateTag,
  getDb,
  setProgress,
  setTaskDetail,
  updateTask,
  SEEDED_KEY,
} from "./store";
import { isComplete } from "./types";

function db() {
  const instance = getDb();
  assert.ok(instance, "expected an IndexedDB-backed database");
  return instance;
}

beforeEach(async () => {
  const d = db();
  await d.open();
  await Promise.all([
    d.tasks.clear(),
    d.projects.clear(),
    d.tags.clear(),
    d.meta.clear(),
  ]);
});

async function makeTask(title = "Write the report", progress = 0) {
  const project = await findOrCreateProject("Reporting", "#3b82f6");
  const tag = await findOrCreateTag("Writing");
  const task = await createTask({
    title,
    projectId: project.id,
    tagId: tag.id,
    progress,
  });
  assert.ok(task);
  return { task, project, tag };
}

/* ------------------------------- the basics ------------------------------ */

test("a created task is persisted and readable back", async () => {
  const { task } = await makeTask("Write the report", 25);

  const stored = await db().tasks.get(task.id);
  assert.ok(stored);
  assert.equal(stored.title, "Write the report");
  assert.equal(stored.progress, 25);
  assert.equal(stored.completedAt, null);
  assert.deepEqual(
    { p: stored.progressNote, b: stored.blocker, n: stored.notes },
    { p: "", b: "", n: "" }
  );
});

test("titles are trimmed and progress is clamped on the way in", async () => {
  const project = await findOrCreateProject("P");
  const tag = await findOrCreateTag("T");
  const task = await createTask({
    title: "   padded   ",
    projectId: project.id,
    tagId: tag.id,
    progress: 999,
  });
  const stored = await db().tasks.get(task!.id);
  assert.equal(stored!.title, "padded");
  assert.equal(stored!.progress, 100);
});

test("an edit is written through to the database", async () => {
  const { task } = await makeTask();
  await updateTask(task.id, { title: "Renamed", progress: 60 });

  const stored = await db().tasks.get(task.id);
  assert.equal(stored!.title, "Renamed");
  assert.equal(stored!.progress, 60);
});

test("detail fields save independently and survive a reread", async () => {
  const { task } = await makeTask();
  await setTaskDetail(task.id, "blocker", "waiting on finance");
  await setTaskDetail(task.id, "notes", "check the Q3 figures");

  const stored = await db().tasks.get(task.id);
  assert.equal(stored!.blocker, "waiting on finance");
  assert.equal(stored!.notes, "check the Q3 figures");
  assert.equal(stored!.progressNote, "");
});

test("a deleted task is really gone", async () => {
  const { task } = await makeTask();
  assert.equal(await db().tasks.count(), 1);

  await deleteTask(task.id);
  assert.equal(await db().tasks.count(), 0);
  assert.equal(await db().tasks.get(task.id), undefined);
});

test("duplicating gives a distinct row, not a second reference", async () => {
  const { task } = await makeTask("Original", 30);
  const copy = await duplicateTask(task.id);

  assert.ok(copy);
  assert.notEqual(copy.id, task.id);
  assert.equal(copy.title, "Original (copy)");
  assert.equal(await db().tasks.count(), 2);

  await updateTask(copy.id, { title: "Changed" });
  const original = await db().tasks.get(task.id);
  assert.equal(original!.title, "Original", "editing the copy touched the original");
});

/* ------------------------------- completion ------------------------------ */

test("reaching 100 stamps completedAt; dropping back clears it", async () => {
  const { task } = await makeTask("Ship it", 50);
  assert.equal(isComplete((await db().tasks.get(task.id))!), false);

  await setProgress(task.id, 100);
  const done = await db().tasks.get(task.id);
  assert.ok(done!.completedAt, "completedAt should be stamped at 100");
  assert.equal(isComplete(done!), true);

  await setProgress(task.id, 40);
  const reopened = await db().tasks.get(task.id);
  assert.equal(reopened!.completedAt, null);
  assert.equal(isComplete(reopened!), false);
});

test("re-saving an already complete task keeps the original timestamp", async () => {
  const { task } = await makeTask("Ship it", 100);
  const first = (await db().tasks.get(task.id))!.completedAt;
  assert.ok(first);

  await updateTask(task.id, { title: "Ship it now" });
  assert.equal((await db().tasks.get(task.id))!.completedAt, first);
});

/* --------------------------- projects and tags --------------------------- */

test("an existing project is reused, case-insensitively, and keeps its colour", async () => {
  const first = await findOrCreateProject("Reporting", "#3b82f6");
  const again = await findOrCreateProject("  reporting  ", "#ef7234");

  assert.equal(again.id, first.id);
  assert.equal(again.color, "#3b82f6", "an existing project must not be recoloured");
  assert.equal(await db().projects.count(), 1);
});

test("a new project keeps the colour chosen for it", async () => {
  const project = await findOrCreateProject("Design", "#ec4899");
  assert.equal(project.color, "#ec4899");
  assert.equal((await db().projects.get(project.id))!.color, "#ec4899");
});

test("deleting the last task in a project removes the project and tag", async () => {
  const { task, project, tag } = await makeTask();
  assert.equal(await db().projects.count(), 1);

  await deleteTask(task.id);
  assert.equal(await db().projects.get(project.id), undefined);
  assert.equal(await db().tags.get(tag.id), undefined);
});

test("a project with other tasks still in it survives a delete", async () => {
  const { project, tag } = await makeTask("First");
  const second = await createTask({
    title: "Second",
    projectId: project.id,
    tagId: tag.id,
    progress: 0,
  });

  await deleteTask(second!.id);
  assert.ok(await db().projects.get(project.id), "project removed while still in use");
  assert.equal(await db().tasks.count(), 1);
});

test("moving the only task to a new project retires the old one", async () => {
  const { task, project } = await makeTask();
  const moved = await findOrCreateProject("Elsewhere");

  await updateTask(task.id, { projectId: moved.id });

  assert.equal(await db().projects.get(project.id), undefined, "old project lingered");
  assert.ok(await db().projects.get(moved.id));
});

/* -------------------------------- seeding -------------------------------- */

test("seeding fills an empty database once", async () => {
  await seedIfEmpty();
  const afterFirst = await db().tasks.count();
  assert.ok(afterFirst > 0, "expected sample tasks");

  await seedIfEmpty();
  assert.equal(await db().tasks.count(), afterFirst, "seeded twice");
});

// The bug this guards: seeding used to trigger on "zero tasks", so clearing the
// list brought the samples back on the next load and silently undid the delete.
test("deleting every task does NOT bring the samples back", async () => {
  await seedIfEmpty();
  for (const task of await db().tasks.toArray()) {
    await deleteTask(task.id);
  }
  assert.equal(await db().tasks.count(), 0);

  await seedIfEmpty();

  assert.equal(await db().tasks.count(), 0, "samples reappeared after a full delete");
  assert.equal(await db().projects.count(), 0, "orphaned projects were left behind");
  assert.equal(await db().tags.count(), 0, "orphaned tags were left behind");
});

test("the seeded flag is recorded in the database", async () => {
  assert.equal(await db().meta.get(SEEDED_KEY), undefined);
  await seedIfEmpty();
  assert.ok(await db().meta.get(SEEDED_KEY));
});
