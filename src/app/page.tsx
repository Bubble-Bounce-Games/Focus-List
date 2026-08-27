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
  renameProject,
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
import {
  CALENDAR_REMINDERS_KEY,
  asCalendarReminders,
  type CalendarReminder,
} from "@/lib/focuslist/calendar-reminders";
import { useAuth } from "@/components/auth-provider";
import { DashboardTools } from "@/components/focuslist/dashboard-tools";
import Link from "next/link";
import {
  ArrowRight,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  Eye,
  Italic,
  List,
  Palette,
  Pin,
  RotateCcw,
  StickyNote,
  Underline,
} from "lucide-react";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const faviconPath = `${basePath}/Favicon.png`;
type WorkspaceTab = "active" | "completed";
type PinnedNote = {
  id: string;
  text: string;
  color: string;
  createdAt: string;
  fontFamily?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: NoteAlign;
};

type NoteAlign = "left" | "center" | "right";

type ReminderRow =
  | {
      kind: "task";
      id: string;
      title: string;
      dueDate: string;
      color: string;
      progress: number;
      task: Task;
    }
  | {
      kind: "calendar";
      id: string;
      title: string;
      dueDate: string;
      color: string;
      progress: number;
      reminder: CalendarReminder;
    };

const markerColors = ["#111827", "#f1c21b", "#ff7eb6", "#42be65", "#82cfff", "#be95ff"];
const noteFontFamilies = [
  { label: "Sans", value: "Inter, Arial, sans-serif" },
  { label: "Serif", value: "Georgia, serif" },
  { label: "Mono", value: "ui-monospace, SFMono-Regular, Menlo, monospace" },
  { label: "Hand", value: '"Comic Sans MS", "Bradley Hand", cursive' },
];
const noteFontSizes = [13, 15, 17, 19, 22];

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function asNoteFontSize(value: unknown): number {
  return typeof value === "number" && noteFontSizes.includes(value) ? value : 15;
}

function asNoteFontFamily(value: unknown): string {
  return typeof value === "string" && noteFontFamilies.some((font) => font.value === value)
    ? value
    : noteFontFamilies[0].value;
}

function asNoteAlign(value: unknown): NoteAlign {
  return value === "center" || value === "right" ? value : "left";
}

function asPinnedNotes(value: unknown): PinnedNote[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is PinnedNote =>
      item !== null &&
      typeof item === "object" &&
      typeof (item as PinnedNote).id === "string" &&
      typeof (item as PinnedNote).text === "string" &&
      typeof (item as PinnedNote).color === "string" &&
      typeof (item as PinnedNote).createdAt === "string"
  );
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function timestampLabel(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function notePreview(text: string): { title: string; description: string } {
  const lines = text
    .trim()
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length > 1) {
    return {
      title: lines[0],
      description: lines.slice(1).join(" "),
    };
  }
  const words = (lines[0] ?? "").split(/\s+/).filter(Boolean);
  return {
    title: words.slice(0, 4).join(" ") || "Untitled note",
    description: words.slice(4).join(" ") || lines[0] || "",
  };
}

function reminderTone(value: string): {
  label: string;
  className: string;
} {
  const today = toDateKey(new Date());
  if (value < today) {
    return {
      label: "Overdue",
      className: "bg-[#fff1f1] text-[#da1e28]",
    };
  }
  if (value === today) {
    return {
      label: "Today",
      className: "bg-[#defbe6] text-[#198038]",
    };
  }
  return {
    label: "Upcoming",
    className: "bg-[#eaf2ff] text-primary",
  };
}

function FocusSidePanel() {
  const tasks = useAllTasks();
  const projects = useProjects();
  const projectsById = projectMap(projects);
  const [noteValue, setNote] = usePersistentState<unknown>(
    "fl.noteDraft",
    "Pin quick notes here while you plan your next task."
  );
  const [pinnedNotesValue, setPinnedNotes] = usePersistentState<unknown>(
    "fl.pinnedNotes",
    []
  );
  const [calendarReminderValue, setCalendarReminders] = usePersistentState<unknown>(
    CALENDAR_REMINDERS_KEY,
    []
  );
  const [markerValue, setMarker] = usePersistentState<unknown>("fl.markerColor", markerColors[0]);
  const [noteFontValue, setNoteFont] = usePersistentState<unknown>(
    "fl.noteFont",
    noteFontFamilies[0].value
  );
  const [noteFontSizeValue, setNoteFontSize] = usePersistentState<unknown>(
    "fl.noteFontSize",
    15
  );
  const [noteBoldValue, setNoteBold] = usePersistentState<unknown>("fl.noteBold", false);
  const [noteItalicValue, setNoteItalic] = usePersistentState<unknown>("fl.noteItalic", false);
  const [noteUnderlineValue, setNoteUnderline] = usePersistentState<unknown>(
    "fl.noteUnderline",
    false
  );
  const [noteAlignValue, setNoteAlign] = usePersistentState<unknown>("fl.noteAlign", "left");
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [formatMenuOpen, setFormatMenuOpen] = useState(false);
  const [listMenuOpen, setListMenuOpen] = useState(false);
  const [alignMenuOpen, setAlignMenuOpen] = useState(false);
  const note = asString(noteValue);
  const pinnedNotes = asPinnedNotes(pinnedNotesValue);
  const calendarReminders = asCalendarReminders(calendarReminderValue);
  const marker = markerColors.includes(asString(markerValue))
    ? asString(markerValue)
    : markerColors[0];
  const noteFont = asNoteFontFamily(noteFontValue);
  const noteFontSize = asNoteFontSize(noteFontSizeValue);
  const noteBold = asBoolean(noteBoldValue);
  const noteItalic = asBoolean(noteItalicValue);
  const noteUnderline = asBoolean(noteUnderlineValue);
  const noteAlign = asNoteAlign(noteAlignValue);
  const noteTextStyle = {
    color: marker,
    fontFamily: noteFont,
    fontSize: `${noteFontSize}px`,
    fontWeight: noteBold ? 700 : 500,
    fontStyle: noteItalic ? "italic" : "normal",
    textDecoration: noteUnderline ? "underline" : "none",
    textAlign: noteAlign,
  } as const;
  const taskReminderRows: ReminderRow[] = tasks
    .filter((task) => !task.archivedAt && !task.deletedAt && !isComplete(task))
    .filter((task) => task.dueDate)
    .map((task) => {
      const project = projectsById[task.projectId];
      return {
        kind: "task",
        id: task.id,
        title: task.title,
        dueDate: task.dueDate ?? "",
        color: project?.color ?? "#8d8d99",
        progress: task.progress,
        task,
      };
    });
  const calendarReminderRows: ReminderRow[] = calendarReminders.map((reminder) => ({
    kind: "calendar",
    id: reminder.id,
    title: reminder.title,
    dueDate: reminder.dueDate,
    color: "#da1e28",
    progress: 0,
    reminder,
  }));
  const allReminderRows = [...taskReminderRows, ...calendarReminderRows].sort(
    (a, b) => a.dueDate.localeCompare(b.dueDate) || b.id.localeCompare(a.id)
  );
  const reminderRows = allReminderRows.slice(0, 5);
  const overdueCount = allReminderRows.filter(
    (reminder) => reminder.dueDate < toDateKey(new Date())
  ).length;
  const nextReminderDate = allReminderRows[0]?.dueDate ?? null;

  const handleFinishReminder = useCallback(
    (reminder: ReminderRow) => {
      if (reminder.kind === "task") {
        void setProgress(reminder.task.id, 100);
      } else {
        setCalendarReminders((current) =>
          asCalendarReminders(current).filter((item) => item.id !== reminder.id)
        );
      }
      toast.success("Reminder completed", { description: reminder.title });
    },
    [setCalendarReminders]
  );

  const handleClearReminder = useCallback(
    (reminder: ReminderRow) => {
      if (reminder.kind === "task") {
        void updateTask(reminder.task.id, { dueDate: null });
      } else {
        setCalendarReminders((current) =>
          asCalendarReminders(current).filter((item) => item.id !== reminder.id)
        );
      }
      toast.success("Reminder cleared", { description: reminder.title });
    },
    [setCalendarReminders]
  );

  const handleSaveNote = useCallback(() => {
    const text = note.trim();
    if (!text) return;
    setPinnedNotes((current) => {
      const currentNotes = asPinnedNotes(current);
      const savedAt = new Date().toISOString();
      if (activeNoteId && currentNotes.some((item) => item.id === activeNoteId)) {
        return currentNotes.map((item) =>
          item.id === activeNoteId
            ? {
                ...item,
                text,
                color: marker,
                fontFamily: noteFont,
                fontSize: noteFontSize,
                bold: noteBold,
                italic: noteItalic,
                underline: noteUnderline,
                align: noteAlign,
                createdAt: savedAt,
              }
            : item
        );
      }
      return [
        {
          id: crypto.randomUUID(),
          text,
          color: marker,
          fontFamily: noteFont,
          fontSize: noteFontSize,
          bold: noteBold,
          italic: noteItalic,
          underline: noteUnderline,
          align: noteAlign,
          createdAt: savedAt,
        },
        ...currentNotes,
      ];
    });
    setNote("");
    setActiveNoteId(null);
  }, [
    activeNoteId,
    marker,
    note,
    noteAlign,
    noteBold,
    noteFont,
    noteFontSize,
    noteItalic,
    noteUnderline,
    setNote,
    setPinnedNotes,
  ]);

  const handleViewNote = useCallback(
    (item: PinnedNote) => {
      setNote(item.text);
      if (markerColors.includes(item.color)) {
        setMarker(item.color);
      }
      setNoteFont(asNoteFontFamily(item.fontFamily));
      setNoteFontSize(asNoteFontSize(item.fontSize));
      setNoteBold(item.bold === true);
      setNoteItalic(item.italic === true);
      setNoteUnderline(item.underline === true);
      setNoteAlign(asNoteAlign(item.align));
      setActiveNoteId(item.id);
    },
    [setMarker, setNote, setNoteAlign, setNoteBold, setNoteFont, setNoteFontSize, setNoteItalic, setNoteUnderline]
  );

  const handleDeleteNote = useCallback(
    (id: string) => {
      setPinnedNotes((current) => asPinnedNotes(current).filter((item) => item.id !== id));
      setActiveNoteId((current) => (current === id ? null : current));
    },
    [setPinnedNotes]
  );

  const insertListLines = useCallback(
    (kind: "bullet" | "number" | "numerical" | "dash") => {
      const lines = note.split("\n");
      const hasContent = lines.some((line) => line.trim());
      const formatLine = (text: string, index: number) => {
        if (kind === "bullet") return `• ${text}`;
        if (kind === "dash") return `- ${text}`;
        if (kind === "numerical") return `${index + 1}) ${text}`;
        return `${index + 1}. ${text}`;
      };
      const next = hasContent
        ? lines
            .map((line, index) => {
              const trimmed = line.trim();
              if (!trimmed) return line;
              const bare = trimmed.replace(/^(•\s+|-+\s+|\d+[\).]\s+)/, "");
              return formatLine(bare, index);
            })
            .join("\n")
        : kind === "bullet"
          ? "• "
          : kind === "dash"
            ? "- "
            : kind === "numerical"
              ? "1) "
              : "1. ";
      setNote(next);
    },
    [note, setNote]
  );

  return (
    <aside className="flex min-h-0 flex-col border-t border-border bg-card lg:border-l lg:border-t-0">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3">
        <StickyNote className="h-5 w-5 text-[#f1c21b]" />
        <h2 className="text-sm font-bold text-foreground-strong">Pinned Notes</h2>
        <Pin className="ml-auto h-4 w-4 text-muted-foreground" />
      </div>

      <div className="fl-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
        <section className="grid min-h-[380px] flex-1 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(150px,0.85fr)]">
          <div className="flex min-h-0 flex-col border border-border bg-[#fff8d6] p-4 shadow-[0_12px_28px_rgb(32_48_64_/_10%)]">
            <div className="mb-2 flex min-w-0 items-center gap-1.5">
              <StickyNote className="h-4 w-4 text-[#f1c21b]" />
              <span className="min-w-0 shrink truncate text-xs font-semibold uppercase text-muted-foreground">
                Sticky note
              </span>

              <div className="relative ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    setFormatMenuOpen((open) => !open);
                    setPaletteOpen(false);
                    setListMenuOpen(false);
                    setAlignMenuOpen(false);
                  }}
                  className="flex h-7 w-7 items-center justify-center border border-border bg-white text-foreground-strong hover:bg-secondary"
                  aria-label="Text format"
                  title="Text format"
                >
                  <Bold className="h-3.5 w-3.5" />
                </button>
                {formatMenuOpen && (
                  <div className="absolute right-0 top-8 z-10 min-w-32 border border-border bg-white p-1 shadow-lg">
                    {[
                      {
                        icon: <Bold className="h-3.5 w-3.5" />,
                        label: "Bold",
                        active: noteBold,
                        action: () => setNoteBold(!noteBold),
                      },
                      {
                        icon: <Italic className="h-3.5 w-3.5" />,
                        label: "Italic",
                        active: noteItalic,
                        action: () => setNoteItalic(!noteItalic),
                      },
                      {
                        icon: <Underline className="h-3.5 w-3.5" />,
                        label: "Underline",
                        active: noteUnderline,
                        action: () => setNoteUnderline(!noteUnderline),
                      },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={item.action}
                        className={`flex h-7 w-full items-center gap-2 px-2 text-xs font-semibold ${
                          item.active
                            ? "bg-[#eaf2ff] text-primary"
                            : "text-foreground-strong hover:bg-secondary"
                        }`}
                      >
                        {item.icon}
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setPaletteOpen((open) => !open);
                    setFormatMenuOpen(false);
                    setListMenuOpen(false);
                    setAlignMenuOpen(false);
                  }}
                  className="flex h-7 w-7 items-center justify-center border border-border bg-white text-foreground-strong hover:bg-secondary"
                  aria-label="Choose note color"
                  title="Color"
                >
                  <Palette className="h-3.5 w-3.5" style={{ color: marker }} />
                </button>
                {paletteOpen && (
                  <div className="absolute right-0 top-8 z-10 flex gap-1 border border-border bg-white p-1 shadow-lg">
                    {markerColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => {
                          setMarker(color);
                          setPaletteOpen(false);
                        }}
                        className={`h-6 w-6 border ${
                          marker === color ? "border-foreground-strong" : "border-transparent"
                        }`}
                        style={{ backgroundColor: color }}
                        aria-label={`Use note color ${color}`}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setListMenuOpen((open) => !open);
                    setFormatMenuOpen(false);
                    setPaletteOpen(false);
                    setAlignMenuOpen(false);
                  }}
                  className="flex h-7 w-7 items-center justify-center border border-border bg-white text-foreground-strong hover:bg-secondary"
                  aria-label="List style"
                  title="List style"
                >
                  <List className="h-3.5 w-3.5" />
                </button>
                {listMenuOpen && (
                  <div className="absolute right-0 top-8 z-10 min-w-36 border border-border bg-white p-1 shadow-lg">
                    {[
                      { kind: "bullet" as const, label: "Bullet point", mark: "•" },
                      { kind: "number" as const, label: "Number", mark: "1." },
                      { kind: "numerical" as const, label: "Numerical", mark: "1)" },
                      { kind: "dash" as const, label: "-", mark: "-" },
                    ].map((item) => (
                      <button
                        key={item.kind}
                        type="button"
                        onClick={() => {
                          insertListLines(item.kind);
                          setListMenuOpen(false);
                        }}
                        className="flex h-7 w-full items-center gap-2 px-2 text-xs font-semibold text-foreground-strong hover:bg-secondary"
                      >
                        <span className="w-5 text-left">{item.mark}</span>
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setAlignMenuOpen((open) => !open);
                    setFormatMenuOpen(false);
                    setPaletteOpen(false);
                    setListMenuOpen(false);
                  }}
                  className="flex h-7 w-7 items-center justify-center border border-border bg-white text-foreground-strong hover:bg-secondary"
                  aria-label="Paragraph alignment"
                  title="Paragraph alignment"
                >
                  {noteAlign === "center" ? (
                    <AlignCenter className="h-3.5 w-3.5" />
                  ) : noteAlign === "right" ? (
                    <AlignRight className="h-3.5 w-3.5" />
                  ) : (
                    <AlignLeft className="h-3.5 w-3.5" />
                  )}
                </button>
                {alignMenuOpen && (
                  <div className="absolute right-0 top-8 z-10 min-w-28 border border-border bg-white p-1 shadow-lg">
                    {[
                      { align: "left" as const, icon: <AlignLeft className="h-3.5 w-3.5" />, label: "Left" },
                      { align: "center" as const, icon: <AlignCenter className="h-3.5 w-3.5" />, label: "Center" },
                      { align: "right" as const, icon: <AlignRight className="h-3.5 w-3.5" />, label: "Right" },
                    ].map((item) => (
                      <button
                        key={item.align}
                        type="button"
                        onClick={() => {
                          setNoteAlign(item.align);
                          setAlignMenuOpen(false);
                        }}
                        className={`flex h-7 w-full items-center gap-2 px-2 text-xs font-semibold ${
                          noteAlign === item.align
                            ? "bg-[#eaf2ff] text-primary"
                            : "text-foreground-strong hover:bg-secondary"
                        }`}
                      >
                        {item.icon}
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleSaveNote}
                className="flex h-7 w-7 items-center justify-center bg-primary text-white hover:bg-[#0353e9]"
                aria-label="Save pinned note"
                title="Save pin"
              >
                <Pin className="h-3.5 w-3.5" />
              </button>
            </div>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="min-h-[220px] flex-1 w-full resize-none border-0 bg-transparent py-3 leading-6 outline-none placeholder:text-muted-foreground"
              style={noteTextStyle}
              placeholder="Write a quick note..."
              aria-label="Pinned note"
            />
          </div>

          <div className="flex min-h-[260px] flex-col overflow-hidden border border-border bg-card p-3">
            <div className="mb-2 flex items-center gap-2">
              <Pin className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Saved notes
              </p>
            </div>
            {pinnedNotes.length === 0 ? (
              <div className="flex h-[140px] items-center border border-dashed border-border px-3 text-xs leading-5 text-muted-foreground">
                Saved pins will appear here next to your note.
              </div>
            ) : (
              <div className="fl-scroll min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                {pinnedNotes.map((item) => {
                  const preview = notePreview(item.text);
                  const savedNoteStyle = {
                    color: item.color,
                    fontFamily: asNoteFontFamily(item.fontFamily),
                    fontSize: `${Math.max(12, asNoteFontSize(item.fontSize) - 2)}px`,
                    fontWeight: item.bold ? 700 : 600,
                    fontStyle: item.italic ? "italic" : "normal",
                    textDecoration: item.underline ? "underline" : "none",
                    textAlign: asNoteAlign(item.align),
                  } as const;
                  return (
                    <div
                      key={item.id}
                      className={`bg-[#fff8d6] p-2.5 shadow-sm ${
                        activeNoteId === item.id ? "ring-1 ring-primary" : ""
                      }`}
                    >
                      <div className="flex items-start gap-1.5">
                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate text-sm font-semibold leading-5"
                            style={savedNoteStyle}
                          >
                            {preview.title}
                          </p>
                          <p
                            className="line-clamp-2 text-xs leading-4 text-muted-foreground"
                            style={{ textAlign: asNoteAlign(item.align) }}
                          >
                            {preview.description || preview.title}
                          </p>
                          <p className="mt-1.5 text-[11px] font-medium leading-4 text-muted-foreground">
                            {timestampLabel(item.createdAt)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleViewNote(item)}
                          className="inline-flex h-6 shrink-0 items-center gap-1 px-1.5 text-[11px] font-semibold text-primary hover:bg-white"
                          aria-label="View saved note"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(item.id)}
                          className="h-6 shrink-0 px-1 text-base leading-none text-muted-foreground hover:text-destructive"
                          aria-label="Delete saved note"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="shrink-0 border border-border bg-[#f7f9fc] p-4">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground-strong">Reminder Board</h3>
            <span className="ml-auto bg-white px-2.5 py-1 text-xs font-semibold text-muted-foreground">
              {overdueCount} overdue
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="border border-border bg-white p-3">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                Reminders
              </p>
              <p className="mt-1 text-2xl font-bold text-primary">{allReminderRows.length}</p>
            </div>
            <div className="border border-border bg-white p-3">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                Overdue
              </p>
              <p className="mt-1 text-2xl font-bold text-[#da1e28]">{overdueCount}</p>
            </div>
            <div className="border border-border bg-white p-3">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                Date
              </p>
              <p className="mt-2 truncate text-sm font-bold text-foreground-strong">
                {nextReminderDate ? dateLabel(nextReminderDate) : "None"}
              </p>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {reminderRows.length === 0 ? (
              <div className="border border-dashed border-border bg-white p-4 text-xs leading-5 text-muted-foreground">
                Mark dates in the calendar tool and your reminders will appear here.
              </div>
            ) : (
              reminderRows.map((reminder) => {
                const tone = reminderTone(reminder.dueDate);
                return (
                  <div
                    key={`${reminder.kind}-${reminder.id}`}
                    className="grid gap-3 border border-border bg-white p-3 sm:grid-cols-[minmax(0,1fr)_auto]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: reminder.color }}
                        />
                        <span className={`px-2 py-0.5 text-[11px] font-bold ${tone.className}`}>
                          {tone.label}
                        </span>
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          {dateLabel(reminder.dueDate)}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-xs font-semibold leading-5 text-foreground-strong">
                        {reminder.title}
                      </p>
                      {reminder.kind === "task" && (
                        <div className="mt-2 h-1.5 overflow-hidden bg-[#dfe5ec]">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${reminder.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 sm:flex-col sm:items-stretch">
                      <button
                        type="button"
                        onClick={() => handleFinishReminder(reminder)}
                        className="h-8 bg-[#198038] px-3 text-xs font-semibold text-white hover:bg-[#14662d]"
                      >
                        Done
                      </button>
                      <button
                        type="button"
                        onClick={() => handleClearReminder(reminder)}
                        className="flex h-8 items-center justify-center border border-border bg-card px-2 text-muted-foreground hover:bg-secondary"
                        aria-label={`Clear reminder for ${reminder.title}`}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </aside>
  );
}

function AuthenticatedPage({
  user,
  signOut,
}: {
  user: { email?: string };
  signOut: () => Promise<void>;
}) {
  const projects = useProjects();
  const tags = useTags();
  const allTasks = useAllTasks();

  const [ready] = useState(true);
  const [searchValue, setSearch] = usePersistentState<unknown>("fl.search", "");
  const [sortValue, setSort] = usePersistentState<SortKey>("fl.sort", DEFAULT_SORT);
  const [selectedProjectValue, setSelectedProjectId] = usePersistentState<unknown>(
    "fl.project",
    null
  );
  const [selectedTagValue, setSelectedTagId] = usePersistentState<unknown>(
    "fl.tag",
    null
  );
  const [projectSortValue, setProjectSort] = usePersistentState<"name" | "color">(
    "fl.projectSort",
    "name"
  );

  const [progressOverride, setProgressOverride] = useState<
    Record<string, number>
  >({});
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<"create" | "edit">("create");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [initialProjectName, setInitialProjectName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [toolView, setToolView] = useState<"calendar" | "archive" | "trash" | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("active");
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [projectCreateFrameOpen, setProjectCreateFrameOpen] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const search = asString(searchValue);
  const sort = ["progress-desc", "progress-asc", "title-asc", "project-asc", "recent", "oldest"].includes(sortValue)
    ? sortValue
    : DEFAULT_SORT;
  const selectedProjectId = asNullableString(selectedProjectValue);
  const selectedTagId = asNullableString(selectedTagValue);
  const projectSort = projectSortValue === "color" ? "color" : "name";

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
  const selectedProject = selectedProjectId ? pMap[selectedProjectId] : null;

  const isFiltering =
    search.trim() !== "" || selectedProjectId !== null || selectedTagId !== null;
  const activeListHasSearchFilters = search.trim() !== "" || selectedTagId !== null;

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
    setInitialProjectName(selectedProject?.name ?? "");
    setPanelMode("create");
    setPanelOpen(true);
  }, [selectedProject?.name]);

  const openEdit = useCallback((task: Task) => {
    setEditingTask(task);
    setInitialProjectName("");
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
      if (selectedProjectId === null || selectedProjectId !== project.id) {
        setSelectedProjectId(project.id);
      }
    },
    [panelMode, editingTask, selectedProjectId, setSelectedProjectId]
  );

  const handleCreateProject = useCallback(async (name: string) => {
    const project = await findOrCreateProject(name);
    setSelectedProjectId(project.id);
    setInitialProjectName(project.name);
    setEditingTask(null);
    toast.success("Project created", { description: project.name });
  }, [setSelectedProjectId]);

  const openProjectCreateFrame = useCallback(() => {
    setProjectMenuOpen(true);
    setProjectCreateFrameOpen(true);
  }, []);

  const handleRenameProject = useCallback(async (id: string, name: string) => {
    const project = await renameProject(id, name);
    if (!project) return;
    if (selectedProjectId === id) {
      setInitialProjectName(project.name);
    }
    toast.success("Project renamed", { description: project.name });
  }, [selectedProjectId]);

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setSelectedProjectId(null);
    setSelectedTagId(null);
  }, [setSearch, setSelectedProjectId, setSelectedTagId]);

  const handleSetReminder = useCallback((taskId: string, date: string | null) => {
    void updateTask(taskId, { dueDate: date });
    const task = allTasks.find((item) => item.id === taskId);
    toast.success(date ? "Reminder date marked" : "Reminder cleared", {
      description: task?.title,
    });
  }, [allTasks]);

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
        activeTab={activeTab}
        completedCount={doneTasks.length}
        selectedProjectId={selectedProjectId}
        selectedTagId={selectedTagId}
        projectMenuOpen={projectMenuOpen}
        createFrameOpen={projectCreateFrameOpen}
        onTabChange={setActiveTab}
        onSelectProject={setSelectedProjectId}
        onSelectTag={setSelectedTagId}
        onProjectMenuOpenChange={setProjectMenuOpen}
        onCreateFrameOpenChange={setProjectCreateFrameOpen}
        onCreateProject={handleCreateProject}
        onRenameProject={handleRenameProject}
        onClear={handleClearFilters}
        isFiltering={isFiltering}
        projectSort={projectSort}
        onProjectSortChange={setProjectSort}
      />

      <main className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,6fr)_minmax(360px,4fr)]">
        <section className="flex min-h-0 flex-1 flex-col px-6 xl:px-10">
          {activeTab === "active" ? (
            <>
              <div className="flex items-center gap-2.5 py-3">
                <ClipboardList className="h-5 w-5 text-muted-foreground" />
                <h1 className="text-base font-bold text-foreground-strong">
                  {selectedProject ? selectedProject.name : "Active Tasks"}
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
                  isFiltered={activeListHasSearchFilters}
                  hasProjects={projects.length > 0}
                  selectedProjectName={selectedProject?.name ?? null}
                  onProgressChange={handleProgressChange}
                  onProgressCommit={handleProgressCommit}
                  onEdit={openEdit}
                  onDuplicate={handleDuplicate}
                  onComplete={handleComplete}
                  onDelete={handleRequestDelete}
                  onDetailSave={handleDetailSave}
                  onClearFilters={handleClearFilters}
                  onAddTask={openCreate}
                  onCreateProject={openProjectCreateFrame}
                />
              </div>
            </>
          ) : (
            <DoneSection
              groups={doneGroups}
              totalCount={doneTasks.length}
              tags={tMap}
              isFiltered={isFiltering}
              onEdit={openEdit}
              onDuplicate={handleDuplicate}
              onDelete={handleRequestDelete}
            />
          )}
        </section>

        <FocusSidePanel />
      </main>

      <AddTaskPanel
        open={panelOpen}
        mode={panelMode}
        editingTask={editingTask}
        initialProjectName={initialProjectName}
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
      {toolView && (
        <DashboardTools
          view={toolView}
          tasks={allTasks}
          onClose={() => setToolView(null)}
          onSetReminder={handleSetReminder}
        />
      )}
    </div>
  );
}

export default function Page() {
  const { loading, user, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-app">
        <div className="flex items-center gap-3 text-muted-foreground">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: "#6252e8" }}
          >
            <ClipboardList className="h-5 w-5" />
          </span>
          <span className="text-sm font-medium">Loading Focus List...</span>
        </div>
      </div>
    );
  }

  if (!user) return <LandingPage />;

  return <AuthenticatedPage user={user} signOut={signOut} />;
}

function LandingPage() {
  return (
    <main className="landing-page min-h-screen overflow-auto bg-app">
      <header className="flex items-center justify-between border-b border-border bg-card px-6 py-4 lg:px-12">
        <div className="flex items-center gap-3 text-lg font-semibold text-foreground-strong">
          <img src={faviconPath} alt="" className="h-9 w-9 object-contain" />
          Focus List
        </div>
        <Link href="/login" className="flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0353e9]">
          Sign in <ArrowRight className="h-4 w-4" />
        </Link>
      </header>
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:px-12 lg:py-20">
        <div className="max-w-xl">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-primary">A clearer workday</p>
          <h1 className="max-w-lg text-5xl font-semibold leading-[1.05] text-foreground-strong sm:text-6xl">Your work, in focus.</h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-muted-foreground">Capture what matters, see your momentum, and make steady progress without losing the thread.</p>
          <Link href="/login" className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-white shadow-[0_10px_24px_rgb(15_98_254_/_20%)] hover:bg-[#0353e9]">Start your workspace <ArrowRight className="h-4 w-4" /></Link>
          <div className="mt-8 flex flex-wrap gap-5 text-sm text-muted-foreground"><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#198038]" /> Progress you can see</span><span className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-primary" /> Less mental overhead</span></div>
        </div>
        <div className="landing-board relative mx-auto w-full max-w-2xl border border-[#cbd5df] bg-white p-5 shadow-[0_24px_70px_rgb(32_48_64_/_12%)] sm:p-8">
          <div className="mb-7 flex items-center justify-between border-b border-border pb-5"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Today</p><p className="mt-1 text-2xl font-semibold text-foreground-strong">Active Tasks</p></div><CalendarDays className="h-6 w-6 text-muted-foreground" /></div>
          <div className="space-y-3"><div className="landing-task"><Circle className="text-primary" /><div className="min-w-0 flex-1"><p>Prepare the project brief</p><span>Planning</span><i><em className="w-[72%]" /></i></div><b>72%</b></div><div className="landing-task"><Circle className="text-[#8a3ffc]" /><div className="min-w-0 flex-1"><p>Review the week’s priorities</p><span>Personal</span><i><em className="w-[48%] bg-[#8a3ffc]" /></i></div><b>48%</b></div><div className="landing-task"><Circle className="text-[#198038]" /><div className="min-w-0 flex-1"><p>Make time for deep work</p><span>Focus</span><i><em className="w-[24%] bg-[#198038]" /></i></div><b>24%</b></div></div>
          <div className="mt-8 flex items-center justify-between border-t border-border pt-5 text-sm"><span className="text-muted-foreground">Completed today</span><strong className="text-[#198038]">2 tasks</strong></div>
        </div>
      </section>
    </main>
  );
}
