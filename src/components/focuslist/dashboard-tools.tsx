"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, FolderArchive, Trash2, X } from "lucide-react";
import type { Task } from "@/lib/focuslist/types";
import { CALENDAR_REMINDERS_KEY, asCalendarReminders } from "@/lib/focuslist/calendar-reminders";
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

function CalendarTool({ tasks }: Pick<DashboardToolsProps, "tasks">) {
  const today = new Date();
  const todayKey = toDateKey(today);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const [startYear, setStartYear] = useState(currentYear);
  const [startMonth, setStartMonth] = useState(currentMonth);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [draft, setDraft] = useState("");
  const startMonthRef = useRef<HTMLElement | null>(null);
  const monthNames = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) =>
        new Intl.DateTimeFormat("en", { month: "long" }).format(new Date(2026, index, 1))
      ),
    []
  );
  const yearOptions = Array.from({ length: 8 }, (_, index) => currentYear - 1 + index);
  const visibleMonths = Array.from({ length: 12 }, (_, offset) => new Date(startYear, startMonth + offset, 1));
  const [calendarReminderValue, setCalendarReminders] = usePersistentState<unknown>(
    CALENDAR_REMINDERS_KEY,
    []
  );
  const calendarReminders = asCalendarReminders(calendarReminderValue);
  const activeTasks = tasks.filter((task) => !task.completedAt && !task.archivedAt && !task.deletedAt);
  const reminders = useMemo(() => {
    const rows = new Map<string, number>();
    for (const task of activeTasks) {
      if (!task.dueDate) continue;
      rows.set(task.dueDate, (rows.get(task.dueDate) ?? 0) + 1);
    }
    for (const reminder of calendarReminders) {
      rows.set(reminder.dueDate, (rows.get(reminder.dueDate) ?? 0) + 1);
    }
    return rows;
  }, [activeTasks, calendarReminders]);
  const selectedReminderCount = reminders.get(selectedDate) ?? 0;

  useEffect(() => {
    startMonthRef.current?.scrollIntoView({ block: "start" });
  }, [startMonth, startYear]);

  function selectCalendarStart(nextYear: number, nextMonth: number) {
    setStartYear(nextYear);
    setStartMonth(nextMonth);
    setSelectedDate(toDateKey(new Date(nextYear, nextMonth, 1)));
  }

  function handleAddReminder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = draft.trim();
    if (!title) return;
    setCalendarReminders((current) => [
      {
        id: crypto.randomUUID(),
        title,
        dueDate: selectedDate,
        createdAt: new Date().toISOString(),
      },
      ...asCalendarReminders(current),
    ]);
    setDraft("");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="border border-border bg-app p-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground-strong">{startYear} Calendar</p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{dateTitle(selectedDate)}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <select
            value={startMonth}
            onChange={(event) => selectCalendarStart(startYear, Number(event.target.value))}
            className="h-9 border border-border bg-card px-2 text-sm text-foreground-strong outline-none focus:border-primary"
            aria-label="Calendar month"
          >
            {monthNames.map((name, index) => (
              <option key={name} value={index}>
                {name}
              </option>
            ))}
          </select>
          <select
            value={startYear}
            onChange={(event) => selectCalendarStart(Number(event.target.value), startMonth)}
            className="h-9 border border-border bg-card px-2 text-sm text-foreground-strong outline-none focus:border-primary"
            aria-label="Calendar year"
          >
            {yearOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {visibleMonths.map((month, monthIndex) => {
          const year = month.getFullYear();
          const monthNumber = month.getMonth();
          const first = new Date(year, monthNumber, 1);
          const daysInMonth = new Date(year, monthNumber + 1, 0).getDate();
          const leading = first.getDay();
          const calendarCells = [
            ...Array.from({ length: leading }, () => null),
            ...Array.from({ length: daysInMonth }, (_, index) => new Date(year, monthNumber, index + 1)),
          ];
          const monthKey = `${year}-${String(monthNumber + 1).padStart(2, "0")}`;

          return (
            <section
              key={monthKey}
              ref={monthIndex === 0 ? startMonthRef : undefined}
              className="border border-border bg-card p-3"
            >
              <p className="mb-2 text-sm font-semibold text-foreground-strong">
                {new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(month)}
              </p>
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="py-1 font-semibold text-muted-foreground">
                    {day}
                  </div>
                ))}
                {calendarCells.map((cell, index) => {
                  const key = cell ? toDateKey(cell) : `blank-${monthIndex}-${index}`;
                  const dayReminderCount = cell ? reminders.get(key) ?? 0 : 0;
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
                          {dayReminderCount > 0 && (
                            <span className="absolute bottom-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#da1e28]" />
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              {selectedDate.startsWith(monthKey) && (
                <form onSubmit={handleAddReminder} className="mt-3 flex items-center gap-2">
                  <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    className="h-9 min-w-0 flex-1 border border-border bg-app px-2 text-sm text-foreground-strong outline-none focus:border-primary"
                    placeholder="Add reminder"
                    aria-label={`Add reminder for ${dateTitle(selectedDate)}`}
                  />
                  <button
                    type="submit"
                    className="h-9 bg-primary px-3 text-xs font-semibold text-white hover:bg-[#0353e9]"
                  >
                    Add
                  </button>
                  {selectedReminderCount > 0 && (
                    <span className="text-[11px] font-bold text-[#da1e28]">{selectedReminderCount} set</span>
                  )}
                </form>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function DashboardTools({ view, tasks, onClose, onRestore }: DashboardToolsProps) {
  const dueTasks = tasks.filter((task) => !task.completedAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const title = view === "calendar" ? "Reminder calendar" : view === "archive" ? "Archive" : "Deleted items";
  const Icon = view === "calendar" ? CalendarDays : view === "archive" ? FolderArchive : Trash2;
  const rows = view === "archive" ? tasks.filter((task) => task.archivedAt) : view === "trash" ? tasks.filter((task) => task.deletedAt) : dueTasks;

  return (
    <aside className="fixed right-0 top-0 z-50 flex h-full w-[420px] max-w-[100vw] flex-col border-l border-border bg-card shadow-2xl" aria-label={title}>
      <header className="flex items-center gap-3 border-b border-border px-6 py-5"><Icon className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold text-foreground-strong">{title}</h2><button onClick={onClose} aria-label="Close panel" className="ml-auto p-2 text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button></header>
      <div className="fl-scroll flex-1 overflow-y-auto p-6">
        {view === "calendar" ? (
          <CalendarTool tasks={tasks} />
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center"><CheckCircle2 className="h-8 w-8 text-[#198038]" /><p className="mt-3 text-sm font-medium text-foreground-strong">Nothing here yet</p><p className="mt-1 text-xs text-muted-foreground">Your workspace is clear.</p></div>
        ) : (
          <div className="space-y-2">{rows.map((task) => <div key={task.id} className="border border-border bg-card p-4"><div className="flex items-start gap-3"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div className="min-w-0 flex-1"><p className="text-sm font-medium text-foreground-strong">{task.title}</p><p className="mt-1 text-xs text-muted-foreground">{task.deletedAt ? "Deleted" : task.archivedAt ? "Archived" : `Created · ${createdLabel(task.createdAt)}`}</p></div>{(view === "archive" || view === "trash") && onRestore && <button onClick={() => onRestore(task)} className="text-xs font-medium text-primary hover:underline">Restore</button>}</div></div>)}</div>
        )}
      </div>
    </aside>
  );
}
