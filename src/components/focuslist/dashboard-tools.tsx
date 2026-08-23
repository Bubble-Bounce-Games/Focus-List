"use client";

import { Bell, CalendarDays, CheckCircle2, Clock3, FolderArchive, Trash2, X } from "lucide-react";
import type { Task } from "@/lib/focuslist/types";

type ToolView = "calendar" | "notifications" | "archive" | "trash";
type DashboardToolsProps = { view: ToolView; tasks: Task[]; onClose: () => void; onRestore?: (task: Task) => void };

function createdLabel(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export function DashboardTools({ view, tasks, onClose, onRestore }: DashboardToolsProps) {
  const dueTasks = tasks.filter((task) => !task.completedAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const month = new Date();
  const title = view === "calendar" ? "Task calendar" : view === "notifications" ? "Notifications" : view === "archive" ? "Archive" : "Deleted items";
  const Icon = view === "calendar" ? CalendarDays : view === "notifications" ? Bell : view === "archive" ? FolderArchive : Trash2;
  const rows = view === "archive" ? tasks.filter((task) => task.archivedAt) : view === "trash" ? tasks.filter((task) => task.deletedAt) : dueTasks;

  return (
    <aside className="fixed right-0 top-0 z-50 flex h-full w-[420px] max-w-[100vw] flex-col border-l border-border bg-card shadow-2xl" aria-label={title}>
      <header className="flex items-center gap-3 border-b border-border px-6 py-5"><Icon className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold text-foreground-strong">{title}</h2><button onClick={onClose} aria-label="Close panel" className="ml-auto p-2 text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button></header>
      <div className="fl-scroll flex-1 overflow-y-auto p-6">
        {view === "calendar" && <div className="mb-5 border border-border bg-app p-4"><p className="text-sm font-semibold text-foreground-strong">{new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(month)}</p><p className="mt-1 text-xs text-muted-foreground">Tasks with due dates appear below. Overdue work is highlighted.</p></div>}
        {rows.length === 0 ? <div className="flex flex-col items-center justify-center py-20 text-center"><CheckCircle2 className="h-8 w-8 text-[#198038]" /><p className="mt-3 text-sm font-medium text-foreground-strong">Nothing here yet</p><p className="mt-1 text-xs text-muted-foreground">Your workspace is clear.</p></div> : <div className="space-y-2">{rows.map((task) => <div key={task.id} className="border border-border bg-card p-4"><div className="flex items-start gap-3"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div className="min-w-0 flex-1"><p className="text-sm font-medium text-foreground-strong">{task.title}</p><p className="mt-1 text-xs text-muted-foreground">{task.deletedAt ? "Deleted" : task.archivedAt ? "Archived" : `Created · ${createdLabel(task.createdAt)}`}</p></div>{(view === "archive" || view === "trash") && onRestore && <button onClick={() => onRestore(task)} className="text-xs font-medium text-primary hover:underline">Restore</button>}</div></div>)}</div>}
      </div>
    </aside>
  );
}
