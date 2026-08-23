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
import { useAuth } from "@/components/auth-provider";
import { DashboardTools } from "@/components/focuslist/dashboard-tools";
import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, Circle, Clock3 } from "lucide-react";

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
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-app text-sm text-muted-foreground">Loading Focus List...</div>;
  }
  if (!user) {
    return <LandingPage configured={configured} />;
  }
  return <AuthenticatedPage user={user} signOut={signOut} />;
}

function LandingPage({ configured }: { configured: boolean }) {
  return (
    <main className="landing-page min-h-screen overflow-auto bg-app">
      <header className="flex items-center justify-between border-b border-border bg-card px-6 py-4 lg:px-12">
        <div className="flex items-center gap-3 text-lg font-semibold text-foreground-strong">
          <img src="/Favicon.png" alt="" className="h-9 w-9 object-contain" />
          Focus List
        </div>
        <Link href={configured ? "/login" : "#setup"} className="flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0353e9]">
          Sign in <ArrowRight className="h-4 w-4" />
        </Link>
      </header>
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:px-12 lg:py-20">
        <div className="max-w-xl">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-primary">A clearer workday</p>
          <h1 className="max-w-lg text-5xl font-semibold leading-[1.05] text-foreground-strong sm:text-6xl">Your work, in focus.</h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-muted-foreground">Capture what matters, see your momentum, and make steady progress without losing the thread.</p>
          <Link href={configured ? "/login" : "#setup"} className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-white shadow-[0_10px_24px_rgb(15_98_254_/_20%)] hover:bg-[#0353e9]">Start your workspace <ArrowRight className="h-4 w-4" /></Link>
          <div className="mt-8 flex flex-wrap gap-5 text-sm text-muted-foreground"><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#198038]" /> Progress you can see</span><span className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-primary" /> Less mental overhead</span></div>
        </div>
        <div className="landing-board relative mx-auto w-full max-w-2xl border border-[#cbd5df] bg-white p-5 shadow-[0_24px_70px_rgb(32_48_64_/_12%)] sm:p-8">
          <div className="mb-7 flex items-center justify-between border-b border-border pb-5"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Today</p><p className="mt-1 text-2xl font-semibold text-foreground-strong">Active Tasks</p></div><CalendarDays className="h-6 w-6 text-muted-foreground" /></div>
          <div className="space-y-3"><div className="landing-task"><Circle className="text-primary" /><div className="min-w-0 flex-1"><p>Prepare the project brief</p><span>Planning</span><i><em className="w-[72%]" /></i></div><b>72%</b></div><div className="landing-task"><Circle className="text-[#8a3ffc]" /><div className="min-w-0 flex-1"><p>Review the week’s priorities</p><span>Personal</span><i><em className="w-[48%] bg-[#8a3ffc]" /></i></div><b>48%</b></div><div className="landing-task"><Circle className="text-[#198038]" /><div className="min-w-0 flex-1"><p>Make time for deep work</p><span>Focus</span><i><em className="w-[24%] bg-[#198038]" /></i></div><b>24%</b></div></div>
          <div className="mt-8 flex items-center justify-between border-t border-border pt-5 text-sm"><span className="text-muted-foreground">Completed today</span><strong className="text-[#198038]">2 tasks</strong></div>
        </div>
      </section>
      {!configured && <p id="setup" className="mx-auto max-w-xl px-6 pb-8 text-center text-sm text-muted-foreground">Your workspace connection needs to be configured before you can sign in.</p>}
    </main>
  );
}
