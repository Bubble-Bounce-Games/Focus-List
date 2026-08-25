"use client";

import { useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, FolderArchive, Trash2, X } from "lucide-react";
import type { Task } from "@/lib/focuslist/types";
import { usePersistentState } from "@/lib/focuslist/use-persistent-state";

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

function asCalendarNotes(value: unknown): Record<string, string> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string")
  );
}

function CalendarTool({ tasks, onSetReminder }: Pick<DashboardToolsProps, "tasks" | "onSetReminder">) {
  const todayKey = toDateKey(new Date());
  const year = new Date().getFullYear();
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [notesValue, setNotes] = usePersistentState<unknown>("fl.calendarNotes", {});
  const calendarNotes = asCalendarNotes(notesValue);
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
  const selectedNote = calendarNotes[selectedDate] ?? "";

  function saveSelectedNote(value: string) {
    setNotes((current) => {
      const next = { ...asCalendarNotes(current) };
      if (value.trim()) {
        next[selectedDate] = value;
      } else {
        delete next[selectedDate];
      }
      return next;
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)]">
        <div className="border border-border bg-app p-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground-strong">{year} Calendar</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Choose a date, add a note, then attach that date to a task reminder.
          </p>
        </div>

        <div className="border border-border bg-[#f7f9fc] p-4">
          <p className="text-sm font-semibold text-foreground-strong">{dateTitle(selectedDate)}</p>
          <textarea
            value={selectedNote}
            onChange={(event) => saveSelectedNote(event.target.value)}
            className="mt-3 h-24 w-full resize-none border border-border bg-white p-3 text-sm text-foreground-strong outline-none focus:border-primary"
            placeholder="Add date notes..."
            aria-label={`Notes for ${dateTitle(selectedDate)}`}
          />
          {selectedReminders.length > 0 && (
            <div className="mt-3 space-y-2">
              {selectedReminders.slice(0, 3).map((task) => (
                <div key={task.id} className="flex items-center gap-2 border border-border bg-white px-3 py-2">
                  <p className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground-strong">{task.title}</p>
                  <button
                    type="button"
                    onClick={() => onSetReminder?.(task.id, null)}
                    className="text-xs font-medium text-muted-foreground hover:text-destructive"
                  >
                    Clear
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
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
              <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
                {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                  <div key={`${day}-${index}`} className="py-1 font-semibold text-muted-foreground">
                    {day}
                  </div>
                ))}
                {calendarCells.map((cell, index) => {
                  const key = cell ? toDateKey(cell) : `blank-${monthIndex}-${index}`;
                  const dayTasks = cell ? reminders.get(key) ?? [] : [];
                  const isToday = key === todayKey;
                  const isSelected = key === selectedDate;
                  const note = cell ? calendarNotes[key] : "";
                  return (
                    <div key={key} className="min-h-[50px]">
                      {cell && (
                        <button
                          type="button"
                          onClick={() => setSelectedDate(key)}
                          className={`flex h-full min-h-[50px] w-full flex-col border p-1.5 text-left transition hover:border-primary hover:bg-[#edf5ff] ${
                            dayTasks.length > 0 || note ? "border-[#f1c21b] bg-[#fff8d6]" : "border-border bg-white"
                          } ${isToday ? "ring-2 ring-primary" : ""} ${
                            isSelected ? "border-primary bg-[#d0e2ff]" : ""
                          }`}
                          aria-label={`Open ${dateTitle(key)}`}
                        >
                          <span
                            className={`inline-flex h-5 min-w-5 items-center justify-center self-start text-xs font-bold ${
                              isToday ? "bg-primary px-1 text-white" : "text-foreground-strong"
                            }`}
                          >
                            {cell.getDate()}
                          </span>
                          {(dayTasks.length > 0 || note) && (
                            <span className="mt-auto line-clamp-2 text-[10px] font-semibold leading-3 text-muted-foreground">
                              {dayTasks.length > 1
                                ? `${dayTasks.length} reminders`
                                : dayTasks[0]?.title ?? "Note"}
                            </span>
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
        <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
          Set reminder for {dateTitle(selectedDate)}
        </p>
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
  const widthClass = view === "calendar" ? "w-[860px]" : "w-[420px]";

  return (
    <aside className={`fixed right-0 top-0 z-50 flex h-full ${widthClass} max-w-[100vw] flex-col border-l border-border bg-card shadow-2xl`} aria-label={title}>
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
