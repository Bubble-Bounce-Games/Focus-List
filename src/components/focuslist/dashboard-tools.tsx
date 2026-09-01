"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  FolderArchive,
  FolderOpen,
  Trash2,
  X,
} from "lucide-react";
import type { Project, Task } from "@/lib/focuslist/types";
import { asCalendarReminders } from "@/lib/focuslist/calendar-reminders";
import { useBrowserCollection } from "@/lib/focuslist/browser-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "./empty-state";

type ToolView = "calendar" | "archive" | "trash";
type DashboardToolsProps = {
  view: ToolView;
  tasks: Task[];
  projects?: Project[];
  onClose: () => void;
  onRestore?: (task: Task) => void;
  onRestoreProject?: (project: Project) => void;
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
  const [calendarReminderValue, setCalendarReminders] = useBrowserCollection<unknown>(
    "reminders",
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
      <div className="rounded-md border border-outline-variant bg-surface-container-lowest p-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-primary" />
          <p className="text-title-medium text-on-surface">{startYear} Calendar</p>
        </div>
        <p className="mt-1 text-body-medium text-on-surface-variant">{dateTitle(selectedDate)}</p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <select
            value={startMonth}
            onChange={(event) => selectCalendarStart(startYear, Number(event.target.value))}
            className="h-9 rounded-md border-2 border-outline-variant bg-transparent px-2 text-body-medium text-on-surface outline-none transition-[border-color,box-shadow] duration-[var(--duration-short)] [transition-timing-function:var(--ease-standard)] focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
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
            className="h-9 rounded-md border-2 border-outline-variant bg-transparent px-2 text-body-medium text-on-surface outline-none transition-[border-color,box-shadow] duration-[var(--duration-short)] [transition-timing-function:var(--ease-standard)] focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
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
              className="rounded-md border border-outline-variant bg-surface-container-low p-3"
            >
              <p className="mb-2 text-title-medium text-on-surface">
                {new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(month)}
              </p>
              <div className="grid grid-cols-7 gap-0.5 text-center text-label-small sm:gap-1">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="py-1 text-label-small font-medium text-on-surface-variant">
                    {day}
                  </div>
                ))}
                {calendarCells.map((cell, index) => {
                  const key = cell ? toDateKey(cell) : `blank-${monthIndex}-${index}`;
                  const dayReminderCount = cell ? reminders.get(key) ?? 0 : 0;
                  const isToday = key === todayKey;
                  const isSelected = key === selectedDate;
                  return (
                    <div key={key} className="flex min-h-9 items-center justify-center">
                      {cell && (
                        <button
                          type="button"
                          onClick={() => setSelectedDate(key)}
                          className={`relative flex size-9 items-center justify-center rounded-full text-label-medium transition-[background-color,color] duration-[var(--duration-short)] [transition-timing-function:var(--ease-standard)] hover:bg-on-surface/[0.08] focus-visible:bg-on-surface/[0.10] active:bg-on-surface/[0.12] focus-visible:outline-none ${
                            isToday
                              ? "bg-primary text-on-primary-foreground hover:bg-primary/90 focus-visible:bg-primary/90 active:bg-primary/85"
                              : isSelected
                              ? "bg-secondary-container text-on-secondary-container hover:bg-secondary-container/90 focus-visible:bg-secondary-container/90 active:bg-secondary-container/85"
                              : "text-on-surface"
                          }`}
                          aria-label={`Open ${dateTitle(key)}`}
                        >
                          {cell.getDate()}
                          {dayReminderCount > 0 && (
                            <span className="absolute bottom-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-error" />
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              {selectedDate.startsWith(monthKey) && (
                <form onSubmit={handleAddReminder} className="mt-3 flex items-center gap-2">
                  <Input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    className="h-9 min-w-0 flex-1"
                    placeholder="Add reminder"
                    aria-label={`Add reminder for ${dateTitle(selectedDate)}`}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="h-9 px-3"
                  >
                    Add
                  </Button>
                  {selectedReminderCount > 0 && (
                    <span className="text-label-small font-bold text-error">{selectedReminderCount} set</span>
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

export function DashboardTools({
  view,
  tasks,
  projects = [],
  onClose,
  onRestore,
  onRestoreProject,
}: DashboardToolsProps) {
  const dueTasks = tasks.filter((task) => !task.completedAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const title = view === "calendar" ? "Reminder calendar" : view === "archive" ? "Archive" : "Deleted items";
  const Icon = view === "calendar" ? CalendarDays : view === "archive" ? FolderArchive : Trash2;
  const rows = view === "archive" ? tasks.filter((task) => task.archivedAt) : view === "trash" ? tasks.filter((task) => task.deletedAt) : dueTasks;
  const archivedProjects = view === "archive" ? projects.filter((project) => project.archivedAt) : [];
  const hasArchiveRows = rows.length > 0 || archivedProjects.length > 0;

  return (
    <aside
      className="fixed inset-0 z-50 flex h-full w-full flex-col border-outline-variant bg-surface-container-low shadow-e3 sm:left-auto sm:w-[420px] sm:max-w-[100vw] sm:border-l"
      aria-label={title}
    >
      <header className="flex items-center gap-3 border-b border-outline-variant px-4 py-4 sm:px-6 sm:py-5">
        <Icon className="size-5 text-primary" />
        <h2 className="text-title-large text-on-surface">{title}</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close panel"
          className="ml-auto size-9 rounded-full text-on-surface-variant hover:bg-on-surface/[0.08] hover:text-on-surface focus-visible:bg-on-surface/[0.10] active:bg-on-surface/[0.12]"
        >
          <X className="size-4" />
        </Button>
      </header>
      <div className="fl-scroll flex-1 overflow-y-auto p-4 sm:p-6">
        {view === "calendar" ? (
          <CalendarTool tasks={tasks} />
        ) : !hasArchiveRows ? (
          <EmptyState
            icon={<CheckCircle2 className="size-6 text-success" />}
            title="Nothing here yet"
            description="Your workspace is clear."
          />
        ) : (
          <div className="space-y-2">
            {archivedProjects.map((project) => (
              <div
                key={project.id}
                className="rounded-md border border-outline-variant bg-surface-container-high p-4"
              >
                <div className="flex items-start gap-3">
                  <FolderOpen className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-body-medium font-medium text-on-surface">{project.name}</p>
                    <p className="mt-1 text-body-small text-on-surface-variant">
                      Project folder archived
                    </p>
                  </div>
                  {onRestoreProject && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRestoreProject(project)}
                      className="text-primary hover:bg-primary/[0.08] focus-visible:bg-primary/[0.10] active:bg-primary/[0.12]"
                    >
                      Restore
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {rows.map((task) => (
              <div
                key={task.id}
                className="rounded-md border border-outline-variant bg-surface-container-high p-4"
              >
                <div className="flex items-start gap-3">
                  <Clock3 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-body-medium font-medium text-on-surface">{task.title}</p>
                    <p className="mt-1 text-body-small text-on-surface-variant">
                      {task.deletedAt ? "Deleted" : task.archivedAt ? "Archived" : `Created · ${createdLabel(task.createdAt)}`}
                    </p>
                  </div>
                  {(view === "archive" || view === "trash") && onRestore && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRestore(task)}
                      className="text-primary hover:bg-primary/[0.08] focus-visible:bg-primary/[0.10] active:bg-primary/[0.12]"
                    >
                      Restore
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
