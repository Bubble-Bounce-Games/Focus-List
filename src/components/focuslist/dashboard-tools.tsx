"use client";

import { CalendarDays, CheckCircle2, Clock3, FolderArchive, Trash2, X } from "lucide-react";
import type { Task } from "@/lib/focuslist/types";

type ToolView = "calendar" | "archive" | "trash";
type DashboardToolsProps = {
  view: ToolView;
  tasks: Task[];
  onClose: () => void;
  onRestore?: (task: Task) => void;
  onSetReminder?: (taskId: string, date: string | null) => void;
};

function createdLabel(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function CalendarTool({ tasks, onSetReminder }: Pick<DashboardToolsProps, "tasks" | "onSetReminder">) {
  const month = new Date();
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const first = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const leading = first.getDay();
  const calendarCells = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => new Date(year, monthIndex, index + 1)),
  ];
  const activeTasks = tasks.filter((task) => !task.completedAt && !task.archivedAt && !task.deletedAt);
  const reminders = new Map<string, Task[]>();
  for (const task of activeTasks) {
    if (!task.dueDate) continue;
    const rows = reminders.get(task.dueDate) ?? [];
    rows.push(task);
    reminders.set(task.dueDate, rows);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="border border-border bg-app p-4">
        <p className="text-sm font-semibold text-foreground-strong">
          {new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(month)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Pick a date on a task row below to mark a reminder.
        </p>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="py-1 font-semibold text-muted-foreground">
            {day}
          </div>
        ))}
        {calendarCells.map((cell, index) => {
          const key = cell ? toDateKey(cell) : `blank-${index}`;
          const dayTasks = cell ? reminders.get(key) ?? [] : [];
          return (
            <div
              key={key}
              className={`min-h-12 border p-1 text-left ${
                cell ? "border-border bg-card" : "border-transparent"
              } ${dayTasks.length > 0 ? "ring-2 ring-[#f1c21b]" : ""}`}
            >
              {cell && (
                <>
                  <span className="text-xs font-semibold text-foreground-strong">
                    {cell.getDate()}
                  </span>
                  {dayTasks.length > 0 && (
                    <div className="mt-1 h-1.5 rounded-full bg-[#f1c21b]" />
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
          Reminder tasks
        </p>
        {activeTasks.length === 0 ? (
          <div className="border border-border bg-card p-4 text-sm text-muted-foreground">
            Add an active task first, then mark its reminder date here.
          </div>
        ) : (
          <div className="space-y-2">
            {activeTasks.map((task) => (
              <div key={task.id} className="border border-border bg-card p-3">
                <p className="truncate text-sm font-medium text-foreground-strong">{task.title}</p>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="date"
                    value={task.dueDate ?? ""}
                    onChange={(event) => onSetReminder?.(task.id, event.target.value || null)}
                    className="h-9 flex-1 border border-border bg-app px-2 text-sm text-foreground-strong outline-none focus:border-primary"
                    aria-label={`Reminder date for ${task.title}`}
                  />
                  {task.dueDate && (
                    <button
                      type="button"
                      onClick={() => onSetReminder?.(task.id, null)}
                      className="h-9 px-2 text-xs font-medium text-muted-foreground hover:bg-secondary"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function DashboardTools({ view, tasks, onClose, onRestore, onSetReminder }: DashboardToolsProps) {
  const dueTasks = tasks.filter((task) => !task.completedAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const title = view === "calendar" ? "Reminder calendar" : view === "archive" ? "Archive" : "Deleted items";
  const Icon = view === "calendar" ? CalendarDays : view === "archive" ? FolderArchive : Trash2;
  const rows = view === "archive" ? tasks.filter((task) => task.archivedAt) : view === "trash" ? tasks.filter((task) => task.deletedAt) : dueTasks;

  return (
    <aside className="fixed right-0 top-0 z-50 flex h-full w-[420px] max-w-[100vw] flex-col border-l border-border bg-card shadow-2xl" aria-label={title}>
      <header className="flex items-center gap-3 border-b border-border px-6 py-5"><Icon className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold text-foreground-strong">{title}</h2><button onClick={onClose} aria-label="Close panel" className="ml-auto p-2 text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button></header>
      <div className="fl-scroll flex-1 overflow-y-auto p-6">
        {view === "calendar" ? (
          <CalendarTool tasks={tasks} onSetReminder={onSetReminder} />
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center"><CheckCircle2 className="h-8 w-8 text-[#198038]" /><p className="mt-3 text-sm font-medium text-foreground-strong">Nothing here yet</p><p className="mt-1 text-xs text-muted-foreground">Your workspace is clear.</p></div>
        ) : (
          <div className="space-y-2">{rows.map((task) => <div key={task.id} className="border border-border bg-card p-4"><div className="flex items-start gap-3"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div className="min-w-0 flex-1"><p className="text-sm font-medium text-foreground-strong">{task.title}</p><p className="mt-1 text-xs text-muted-foreground">{task.deletedAt ? "Deleted" : task.archivedAt ? "Archived" : `Created · ${createdLabel(task.createdAt)}`}</p></div>{(view === "archive" || view === "trash") && onRestore && <button onClick={() => onRestore(task)} className="text-xs font-medium text-primary hover:underline">Restore</button>}</div></div>)}</div>
        )}
      </div>
    </aside>
  );
}
