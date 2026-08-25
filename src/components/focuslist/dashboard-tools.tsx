"use client";

import { useMemo, useState } from "react";
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

function dateTitle(value: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function CalendarTool({ tasks, onSetReminder }: Pick<DashboardToolsProps, "tasks" | "onSetReminder">) {
  const todayKey = toDateKey(new Date());
  const year = new Date().getFullYear();
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const activeTasks = tasks.filter((task) => !task.completedAt && !task.archivedAt && !task.deletedAt);
  const reminders = useMemo(() => {
    const rows = new Map<string, Task[]>();
    for (const task of activeTasks) {
      if (!task.dueDate) continue;
      const dayRows = rows.get(task.dueDate) ?? [];
      dayRows.push(task);
      rows.set(task.dueDate, dayRows);
    }
    return rows;
  }, [activeTasks]);
  const selectedReminders = reminders.get(selectedDate) ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="border border-border bg-app p-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground-strong">{year} Calendar</p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{dateTitle(selectedDate)}</p>
      </div>

      <div className="space-y-4">
        {Array.from({ length: 12 }, (_, monthIndex) => {
          const month = new Date(year, monthIndex, 1);
          const first = new Date(year, monthIndex, 1);
          const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
          const leading = first.getDay();
          const calendarCells = [
            ...Array.from({ length: leading }, () => null),
            ...Array.from({ length: daysInMonth }, (_, index) => new Date(year, monthIndex, index + 1)),
          ];

          return (
            <section key={monthIndex} className="border border-border bg-card p-3">
              <p className="mb-2 text-sm font-semibold text-foreground-strong">
                {new Intl.DateTimeFormat("en", { month: "long" }).format(month)}
              </p>
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="py-1 font-semibold text-muted-foreground">
                    {day}
                  </div>
                ))}
                {calendarCells.map((cell, index) => {
                  const key = cell ? toDateKey(cell) : `blank-${monthIndex}-${index}`;
                  const dayTasks = cell ? reminders.get(key) ?? [] : [];
                  const isToday = key === todayKey;
                  const isSelected = key === selectedDate;
                  return (
                    <div key={key} className="min-h-12">
                      {cell && (
                        <button
                          type="button"
                          onClick={() => setSelectedDate(key)}
                          className={`relative flex h-full min-h-12 w-full flex-col border p-1 text-left transition hover:border-primary hover:bg-[#edf5ff] ${
                            cell ? "border-border bg-card" : "border-transparent"
                          } ${isToday ? "bg-[#d0e2ff] ring-2 ring-primary" : ""} ${
                            isSelected ? "border-primary bg-[#eaf2ff]" : ""
                          }`}
                          aria-label={`Open ${dateTitle(key)}`}
                        >
                          <span
                            className={`inline-flex h-5 min-w-5 items-center justify-center text-xs font-semibold ${
                              isToday ? "bg-primary px-1 text-white" : "text-foreground-strong"
                            }`}
                          >
                            {cell.getDate()}
                          </span>
                          {dayTasks.length > 0 && (
                            <span className="absolute bottom-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#da1e28]" />
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Create reminder
          </p>
          <span className="text-xs font-medium text-foreground-strong">
            {dateTitle(selectedDate)}
          </span>
          {selectedReminders.length > 0 && (
            <span className="ml-auto rounded-full bg-[#fff1f1] px-2 py-1 text-[11px] font-bold text-[#da1e28]">
              {selectedReminders.length} set
            </span>
          )}
        </div>
        {activeTasks.length === 0 ? (
          <div className="border border-border bg-card p-4 text-sm text-muted-foreground">
            Add an active task first, then set its reminder date here.
          </div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {activeTasks.map((task) => (
              <div key={task.id} className="border border-border bg-card p-3">
                <p className="truncate text-sm font-medium text-foreground-strong">{task.title}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSetReminder?.(task.id, selectedDate)}
                    className="h-9 bg-primary px-3 text-xs font-semibold text-white hover:bg-[#0353e9]"
                  >
                    {task.dueDate === selectedDate ? "Reminder set" : "Set reminder"}
                  </button>
                  {task.dueDate && (
                    <span className="text-xs font-medium text-muted-foreground">{dateTitle(task.dueDate)}</span>
                  )}
                  {task.dueDate && task.dueDate !== selectedDate && (
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
