// Behavioural tests for the pure derivations. No Dexie, no DOM — these run
// under `node --test` against a plain tsc build (see scripts/test-logic.sh).

import assert from "node:assert/strict";
import { test } from "node:test";

import { colorForName, PALETTE } from "./palette";
import { groupDoneByProject, matchTask, sortTasks } from "./selectors";
import {
  DEFAULT_SORT,
  DETAIL_FIELDS,
  EMPTY_DETAILS,
  hasDetails,
  isBlocked,
  isComplete,
  SORT_OPTIONS,
} from "./types";
import type { Project, Tag, Task } from "./types";

const projects: Record<string, Project> = {
  p1: { id: "p1", name: "Website Redesign", color: "#6252e8" },
  p2: { id: "p2", name: "Mobile App", color: "#3b82f6" },
};

const tags: Record<string, Tag> = {
  t1: { id: "t1", name: "Design", color: "#10b981" },
  t2: { id: "t2", name: "Engineering", color: "#f59e0b" },
};

function task(over: Partial<Task> & Pick<Task, "id">): Task {
  return {
    title: "Untitled",
    projectId: "p1",
    tagId: "t1",
    progress: 0,
    completedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...EMPTY_DETAILS,
    ...over,
  };
}

/* --------------------------------- types -------------------------------- */

test("a task is complete only at 100", () => {
  assert.equal(isComplete(task({ id: "a", progress: 99 })), false);
  assert.equal(isComplete(task({ id: "a", progress: 100 })), true);
});

test("DEFAULT_SORT is one of the offered options", () => {
  assert.ok(SORT_OPTIONS.some((o) => o.value === DEFAULT_SORT));
});

test("every sort label carries the 'Group: detail' shape the header splits on", () => {
  for (const option of SORT_OPTIONS) {
    assert.ok(
      option.label.includes(":"),
      `"${option.label}" has no colon; the narrow-viewport header label would show it in full`
    );
  }
});

/* ----------------------------- task details ------------------------------ */

test("a task with no details is neither annotated nor blocked", () => {
  const t = task({ id: "a" });
  assert.equal(hasDetails(t), false);
  assert.equal(isBlocked(t), false);
});

test("whitespace-only details do not count as content", () => {
  const t = task({ id: "a", notes: "   \n  ", blocker: "\t" });
  assert.equal(hasDetails(t), false);
  assert.equal(isBlocked(t), false);
});

test("any one populated detail field marks the task as annotated", () => {
  for (const field of DETAIL_FIELDS) {
    const t = task({ id: "a", [field]: "something" });
    assert.equal(hasDetails(t), true, `${field} should mark the task annotated`);
  }
});

test("only the blocker field marks a task as blocked", () => {
  assert.equal(isBlocked(task({ id: "a", notes: "x" })), false);
  assert.equal(isBlocked(task({ id: "a", progressNote: "x" })), false);
  assert.equal(isBlocked(task({ id: "a", blocker: "waiting on finance" })), true);
});

// Rows written before the v2 migration can reach the UI with these fields
// absent; the helpers must not throw on them.
test("details helpers tolerate rows predating the v2 migration", () => {
  const legacy = task({ id: "a" }) as Partial<Task> & Task;
  delete (legacy as Partial<Task>).progressNote;
  delete (legacy as Partial<Task>).blocker;
  delete (legacy as Partial<Task>).notes;
  assert.equal(hasDetails(legacy), false);
  assert.equal(isBlocked(legacy), false);
});

/* -------------------------------- palette -------------------------------- */

test("colours are stable for a given name and drawn from the palette", () => {
  assert.equal(colorForName("Website Redesign"), colorForName("Website Redesign"));
  assert.ok(PALETTE.includes(colorForName("Mobile App") as (typeof PALETTE)[number]));
  assert.equal(colorForName(""), PALETTE[0]);
});

/* ------------------------------- matchTask ------------------------------- */

test("empty filter matches everything", () => {
  const t = task({ id: "a", title: "Anything" });
  assert.equal(
    matchTask(t, { search: "", projectId: null, tagId: null }, projects, tags),
    true
  );
});

test("search matches the project name, not just the title", () => {
  const t = task({ id: "a", title: "Ship the icon set", projectId: "p1" });
  assert.equal(
    matchTask(t, { search: "redesign", projectId: null, tagId: null }, projects, tags),
    true
  );
});

test("search matches the tag name", () => {
  const t = task({ id: "a", title: "Ship the icon set", tagId: "t2" });
  assert.equal(
    matchTask(t, { search: "engineer", projectId: null, tagId: null }, projects, tags),
    true
  );
});

test("project and tag filters combine with search", () => {
  const t = task({ id: "a", title: "Audit contrast", projectId: "p1", tagId: "t1" });
  assert.equal(
    matchTask(t, { search: "audit", projectId: "p2", tagId: null }, projects, tags),
    false
  );
  assert.equal(
    matchTask(t, { search: "audit", projectId: "p1", tagId: "t2" }, projects, tags),
    false
  );
  assert.equal(
    matchTask(t, { search: "audit", projectId: "p1", tagId: "t1" }, projects, tags),
    true
  );
});

test("search ignores surrounding whitespace and case", () => {
  const t = task({ id: "a", title: "Draft the copy" });
  assert.equal(
    matchTask(t, { search: "  DRAFT ", projectId: null, tagId: null }, projects, tags),
    true
  );
});

/* ------------------------------- sortTasks ------------------------------- */

test("sortTasks does not mutate its input", () => {
  const input = [
    task({ id: "a", progress: 10 }),
    task({ id: "b", progress: 90 }),
  ];
  const before = input.map((t) => t.id);
  sortTasks(input, "progress-desc", projects);
  assert.deepEqual(input.map((t) => t.id), before);
});

test("progress-desc puts the highest first, ties broken by title", () => {
  const sorted = sortTasks(
    [
      task({ id: "a", title: "Zebra", progress: 50 }),
      task({ id: "b", title: "Apple", progress: 50 }),
      task({ id: "c", title: "Middle", progress: 90 }),
    ],
    "progress-desc",
    projects
  );
  assert.deepEqual(sorted.map((t) => t.id), ["c", "b", "a"]);
});

test("progress-asc is the exact reverse ordering of progress-desc", () => {
  const tasks = [
    task({ id: "a", progress: 10 }),
    task({ id: "b", progress: 90 }),
    task({ id: "c", progress: 50 }),
  ];
  assert.deepEqual(
    sortTasks(tasks, "progress-asc", projects).map((t) => t.id),
    ["a", "c", "b"]
  );
});

test("project-asc orders by project name", () => {
  const sorted = sortTasks(
    [task({ id: "a", projectId: "p1" }), task({ id: "b", projectId: "p2" })],
    "project-asc",
    projects
  );
  // "Mobile App" < "Website Redesign"
  assert.deepEqual(sorted.map((t) => t.id), ["b", "a"]);
});

test("recent orders newest-created first, oldest is its mirror", () => {
  const tasks = [
    task({ id: "old", createdAt: "2026-01-01T00:00:00.000Z" }),
    task({ id: "new", createdAt: "2026-06-01T00:00:00.000Z" }),
  ];
  assert.deepEqual(sortTasks(tasks, "recent", projects).map((t) => t.id), [
    "new",
    "old",
  ]);
  assert.deepEqual(sortTasks(tasks, "oldest", projects).map((t) => t.id), [
    "old",
    "new",
  ]);
});

// README advertises sorting by progress (low/high), newest, oldest, project
// and task name. Every one of those must be reachable from the header menu.
test("all six documented sort options are offered and implemented", () => {
  assert.equal(SORT_OPTIONS.length, 6);
  const sample = [
    task({ id: "a", title: "Beta", progress: 20 }),
    task({ id: "b", title: "Alpha", progress: 80 }),
  ];
  for (const option of SORT_OPTIONS) {
    const sorted = sortTasks(sample, option.value, projects);
    assert.equal(
      sorted.length,
      2,
      `sort "${option.value}" dropped or duplicated tasks`
    );
  }
});

/* --------------------------- groupDoneByProject -------------------------- */

test("done tasks bucket under their project, groups ordered by project name", () => {
  const groups = groupDoneByProject(
    [
      task({ id: "a", projectId: "p1", progress: 100 }),
      task({ id: "b", projectId: "p2", progress: 100 }),
      task({ id: "c", projectId: "p1", progress: 100 }),
    ],
    projects
  );
  assert.deepEqual(groups.map((g) => g.project.name), [
    "Mobile App",
    "Website Redesign",
  ]);
  assert.deepEqual(groups[1].tasks.map((t) => t.id).sort(), ["a", "c"]);
});

test("a task whose project no longer exists lands in Unassigned rather than vanishing", () => {
  const groups = groupDoneByProject(
    [task({ id: "orphan", projectId: "deleted-project", progress: 100 })],
    projects
  );
  assert.equal(groups.length, 1);
  assert.equal(groups[0].project.name, "Unassigned");
  assert.equal(groups[0].tasks[0].id, "orphan");
});

test("within a group the most recently completed comes first", () => {
  const groups = groupDoneByProject(
    [
      task({ id: "older", progress: 100, completedAt: "2026-01-01T00:00:00.000Z" }),
      task({ id: "newer", progress: 100, completedAt: "2026-05-01T00:00:00.000Z" }),
    ],
    projects
  );
  assert.deepEqual(groups[0].tasks.map((t) => t.id), ["newer", "older"]);
});

test("grouping an empty list yields no groups", () => {
  assert.deepEqual(groupDoneByProject([], projects), []);
});
