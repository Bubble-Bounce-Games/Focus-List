import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";

process.env.FOCUS_LIST_DB_PATH = path.join(process.cwd(), ".test-build", "focus-list.sqlite");

test("SQLite persistence starts empty, validates projects, and survives a reopen", async () => {
  const database: typeof import("./server-db") = await import("./server-db");
  assert.deepEqual(database.readSnapshot(), { tasks: [], projects: [], tags: [] });

  assert.throws(
    () => database.createTask({ title: "Should fail", projectId: "missing", tagName: "Admin", progress: 0 }),
    /project that has already been created/
  );

  const project = database.createProject("Reporting");
  const task = database.createTask({
    title: "  Write the report  ",
    projectId: project.id,
    tagName: "Writing",
    progress: 25,
  });
  assert.equal(task.title, "Write the report");
  assert.equal(task.progress, 25);

  const detail = database.setTaskDetail(task.id, "blocker", "Waiting on finance");
  assert.equal(detail.blocker, "Waiting on finance");
  const complete = database.updateTask(task.id, { progress: 100, tagName: "Review" });
  assert.ok(complete.completedAt);

  database.closeDatabaseForTests();
  const reopened = database.readSnapshot();
  assert.equal(reopened.projects.length, 1);
  assert.equal(reopened.tasks.length, 1);
  assert.equal(reopened.tasks[0].title, "Write the report");
  assert.equal(reopened.tasks[0].blocker, "Waiting on finance");
  assert.equal(reopened.tasks[0].progress, 100);
  assert.equal(reopened.tags[0].name, "Review");
  database.closeDatabaseForTests();
});
