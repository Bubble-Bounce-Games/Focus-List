"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, ClipboardList } from "lucide-react";
import { toast } from "sonner";

import { Header } from "@/components/focuslist/header";
import { FilterToolbar } from "@/components/focuslist/filter-toolbar";
import { ActiveTaskList } from "@/components/focuslist/active-task-list";
import { DoneSection } from "@/components/focuslist/done-section";
import {
  AddTaskPanel,
  type TaskFormData,
} from "@/components/focuslist/add-task-panel";
import { DeleteConfirm } from "@/components/focuslist/delete-confirm";

import {
  createTask,
  deleteTask,
  duplicateTask,
  setProgress,
  setTaskDetail,
  updateTask,
  useAllTasks,
  useProjects,
  useTags,
  findOrCreateProject,
  findOrCreateTag,
  projectMap,
  tagMap,
} from "@/lib/focuslist/store";
import {
  groupDoneByProject,
  matchTask,
  sortTasks,
} from "@/lib/focuslist/selectors";
import {
  DEFAULT_SORT,
  isComplete,
  type DetailField,
  type SortKey,
  type Task,
} from "@/lib/focuslist/types";
import { usePersistentState } from "@/lib/focuslist/use-persistent-state";
import { AuthPage } from "@/components/auth-page";
import { useAuth } from "@/components/auth-provider";
import { DashboardTools } from "@/components/focuslist/dashboard-tools";

function AuthenticatedPage({
  user,
  signOut,
}: {
  user: NonNullable<ReturnType<typeof useAuth>["user"]>;
  signOut: () => Promise<void>;
}) {
  const projects = useProjects();
  const tags = useTags();
  const allTasks = useAllTasks();

  const [ready] = useState(true);
  const [search, setSearch] = usePersistentState("fl.search", "");
  const [sort, setSort] = usePersistentState<SortKey>("fl.sort", DEFAULT_SORT);
  const [selectedProjectId, setSelectedProjectId] = usePersistentState<
    string | null
  >("fl.project", null);
  const [selectedTagId, setSelectedTagId] = usePersistentState<string | null>(
    "fl.tag",
    null
  );
  const [projectSort, setProjectSort] = usePersistentState<"name" | "color">(
    "fl.projectSort",
    "name"
  );

  const [progressOverride, setProgressOverride] = useState<
    Record<string, number>
  >({});
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<"create" | "edit">("create");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [toolView, setToolView] = useState<"calendar" | "notifications" | "archive" | "trash" | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K focuses search.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const pMap = projectMap(projects);
  const tMap = tagMap(tags);
  const sortedProjects = projects.slice().sort((a, b) =>
    projectSort === "color"
      ? a.color.localeCompare(b.color) || a.name.localeCompare(b.name)
      : a.name.localeCompare(b.name)
  );

  const isFiltering =
    search.trim() !== "" || selectedProjectId !== null || selectedTagId !== null;

  // Derived active list (compiler auto-memoizes).
  const visibleTasks = allTasks.filter((task) => !task.archivedAt && !task.deletedAt);
  const activeTasks = visibleTasks
    .filter((t) => !isComplete(t))
    .filter((t) =>
      matchTask(
        t,
        { search, projectId: selectedProjectId, tagId: selectedTagId },
        pMap,
        tMap
      )
    );
  const activeTasksSorted = sortTasks(activeTasks, sort, pMap);

  // Derived done list (compiler auto-memoizes).
  const doneTasks = visibleTasks
    .filter((t) => isComplete(t))
    .filter((t) =>
      matchTask(
        t,
        { search, projectId: selectedProjectId, tagId: selectedTagId },
        pMap,
        tMap
      )
    );
  const doneGroups = groupDoneByProject(doneTasks, pMap);

  // Apply live drag overrides to active tasks for responsive labels.
  const activeTasksRendered = activeTasksSorted.map((t) =>
    progressOverride[t.id] !== undefined
      ? { ...t, progress: progressOverride[t.id] }
      : t
  );

  /* --------------------------- Task operations --------------------------- */

  const handleProgressChange = useCallback((id: string, value: number) => {
    setProgressOverride((o) => ({ ...o, [id]: value }));
  }, []);

  const handleProgressCommit = useCallback(
    (id: string, value: number) => {
      setProgressOverride((o) => {
        if (!o[id]) return o;
        const rest = { ...o };
        delete rest[id];
        return rest;
      });
      void setProgress(id, value);
      const task = allTasks.find((t) => t.id === id);
      if (value >= 100 && task && task.progress < 100) {
        toast.success("Task completed", {
          description: task.title,
        });
      }
    },
    [allTasks]
  );

  const handleComplete = useCallback(
    (id: string) => {
      void setProgress(id, 100);
      const task = allTasks.find((t) => t.id === id);
      if (task) {
        toast.success("Task completed", { description: task.title });
      }
    },
    [allTasks]
  );

  const handleDuplicate = useCallback(
    async (id: string) => {
      const copy = await duplicateTask(id);
      if (copy) toast.success("Task duplicated", { description: copy.title });
    },
    []
  );

  const handleRequestDelete = useCallback((task: Task) => {
    setDeleteTarget(task);
  }, []);

  // Autosaved from the row's detail panel — deliberately silent, since a toast
  // on every pause in typing would be noise.
  const handleDetailSave = useCallback(
    (id: string, field: DetailField, value: string) => {
      void setTaskDetail(id, field, value);
    },
    []
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await deleteTask(deleteTarget.id);
    toast.success("Task deleted", { description: deleteTarget.title });
    setDeleteTarget(null);
  }, [deleteTarget]);

  /* ----------------------------- Panel flow ------------------------------ */

  const openCreate = useCallback(() => {
    setEditingTask(null);
    setPanelMode("create");
    setPanelOpen(true);
  }, []);

  const openEdit = useCallback((task: Task) => {
    setEditingTask(task);
    setPanelMode("edit");
    setPanelOpen(true);
  }, []);

  const closePanel = useCallback(() => setPanelOpen(false), []);

  const handleSubmit = useCallback(
    async (data: TaskFormData) => {
      const project = await findOrCreateProject(data.projectName);
      const tag = await findOrCreateTag(data.tagName);
      if (panelMode === "edit" && editingTask) {
        await updateTask(editingTask.id, {
          title: data.title,
          projectId: project.id,
          tagId: tag.id,
          progress: data.progress,
        });
        const becameComplete =
          data.progress >= 100 && editingTask.progress < 100;
        const leftComplete =
          data.progress < 100 && editingTask.progress >= 100;
        if (becameComplete) {
          toast.success("Task completed", { description: data.title });
        } else if (leftComplete) {
          toast.success("Task restored to Active", { description: data.title });
        } else {
          toast.success("Task updated", { description: data.title });
        }
      } else {
        await createTask({
          title: data.title,
          projectId: project.id,
          tagId: tag.id,
          progress: data.progress,
        });
        if (data.progress >= 100) {
          toast.success("Task added to Done", { description: data.title });
        } else {
          toast.success("Task added", { description: data.title });
        }
      }
      setPanelOpen(false);
    },
    [panelMode, editingTask]
  );

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setSelectedProjectId(null);
    setSelectedTagId(null);
  }, [setSearch, setSelectedProjectId, setSelectedTagId]);

  /* ------------------------------- Render -------------------------------- */

  if (!ready) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-app">
        <div className="flex items-center gap-3 text-muted-foreground">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: "#6252e8" }}
          >
            <ClipboardList className="h-5 w-5" />
          </span>
          <span className="text-sm font-medium">Loading Focus List…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-app">
      <Header
        search={search}
        onSearchChange={setSearch}
        sort={sort}
        onSortChange={setSort}
        onAddTask={openCreate}
        userEmail={user.email}
        onSignOut={() => void signOut()}
        onOpenTool={setToolView}
        searchInputRef={searchRef}
      />

      <FilterToolbar
        projects={sortedProjects}
        tags={tags}
        selectedProjectId={selectedProjectId}
        selectedTagId={selectedTagId}
        onSelectProject={setSelectedProjectId}
        onSelectTag={setSelectedTagId}
        onClear={handleClearFilters}
        isFiltering={isFiltering}
        projectSort={projectSort}
        onProjectSortChange={setProjectSort}
      />

      <main className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-2">
        {/* Active Tasks section */}
        <section className="flex min-h-0 flex-1 flex-col border-b border-border px-6 xl:px-10 md:border-b-0 md:border-r">
          <div className="flex items-center gap-2.5 py-3">
            <ClipboardList className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-base font-bold text-foreground-strong">
              Active Tasks
            </h1>
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{
                backgroundColor: "color-mix(in srgb, #6252e8 14%, #ffffff)",
                color: "#6252e8",
              }}
            >
              {activeTasksRendered.length}
            </span>
            <span className="ml-auto hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex">
              <Sparkles className="h-3.5 w-3.5" />
              Tasks at 100% move to Done automatically.
            </span>
          </div>
          <div className="min-h-0 flex-1 pb-3">
            <ActiveTaskList
              tasks={activeTasksRendered}
              projects={pMap}
              tags={tMap}
              isFiltered={isFiltering}
              onProgressChange={handleProgressChange}
              onProgressCommit={handleProgressCommit}
              onEdit={openEdit}
              onDuplicate={handleDuplicate}
              onComplete={handleComplete}
              onDelete={handleRequestDelete}
              onDetailSave={handleDetailSave}
              onClearFilters={handleClearFilters}
              onAddTask={openCreate}
            />
          </div>
        </section>

        {/* Completed Tasks section */}
        <DoneSection
          groups={doneGroups}
          totalCount={doneTasks.length}
          tags={tMap}
          isFiltered={isFiltering}
          onEdit={openEdit}
          onDuplicate={handleDuplicate}
          onDelete={handleRequestDelete}
        />
      </main>

      <AddTaskPanel
        open={panelOpen}
        mode={panelMode}
        editingTask={editingTask}
        projects={projects}
        tags={tags}
        onClose={closePanel}
        onSubmit={handleSubmit}
      />

      <DeleteConfirm
        open={deleteTarget !== null}
        taskTitle={deleteTarget?.title ?? ""}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
      {toolView && <DashboardTools view={toolView} tasks={allTasks} onClose={() => setToolView(null)} />}
    </div>
  );
}

export default function Page() {
  const { configured, loading, user, signOut } = useAuth();
  if (!configured || loading || !user) {
    return <AuthPage configured={configured} />;
  }
  return <AuthenticatedPage user={user} signOut={signOut} />;
}
