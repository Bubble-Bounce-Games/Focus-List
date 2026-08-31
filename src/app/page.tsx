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
import { useBrowserCollection } from "@/lib/focuslist/browser-state";
import {
  asCalendarReminders,
  type CalendarReminder,
} from "@/lib/focuslist/calendar-reminders";
import { DashboardTools } from "@/components/focuslist/dashboard-tools";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  CalendarDays,
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

// Retinted to MD3 role color tokens. The values are plain CSS color strings so
// they can be persisted verbatim in localStorage AND render theme-aware. Six
// distinct, accessible options aligned to MD3 brand/role roles.
const markerColors = [
  "var(--md-on-surface)",
  "var(--md-warning)",
  "var(--md-tertiary)",
  "var(--md-success)",
  "var(--md-info)",
  "var(--md-primary)",
];
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
      className: "bg-error-container text-on-error-container",
    };
  }
  if (value === today) {
    return {
      label: "Today",
      className: "bg-success-container text-on-success-container",
    };
  }
  return {
    label: "Upcoming",
    className: "bg-info-container text-on-info-container",
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
  const [pinnedNotesValue, setPinnedNotes] = useBrowserCollection<unknown>(
    "notes",
    []
  );
  const [calendarReminderValue, setCalendarReminders] = useBrowserCollection<unknown>(
    "reminders",
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
        color: project?.color ?? "var(--md-outline)",
        progress: task.progress,
        task,
      };
    });
  const calendarReminderRows: ReminderRow[] = calendarReminders.map((reminder) => ({
    kind: "calendar",
    id: reminder.id,
    title: reminder.title,
    dueDate: reminder.dueDate,
    color: "var(--md-error)",
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

  const toolbarButtonClass =
    "flex size-7 items-center justify-center rounded-full text-on-warning-container transition-[background-color] duration-[var(--duration-short)] [transition-timing-function:var(--ease-standard)] hover:bg-on-warning-container/[0.08] focus-visible:bg-on-warning-container/[0.10] active:bg-on-warning-container/[0.12]";

  return (
    <aside className="flex min-h-0 flex-col border-t border-outline-variant bg-surface-container-low lg:border-l lg:border-t-0">
      <div className="flex items-center gap-2 border-b border-outline-variant px-5 py-3">
        <StickyNote className="size-5 text-warning" />
        <h2 className="text-title-medium text-on-surface">Pinned Notes</h2>
        <Pin className="ml-auto size-4 text-on-surface-variant" />
      </div>

      <div className="fl-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
        <section className="grid min-h-[380px] flex-1 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(150px,0.85fr)]">
          <div className="flex min-h-0 flex-col rounded-lg border border-outline-variant bg-warning-container p-4 shadow-e1">
            <div className="mb-2 flex min-w-0 items-center gap-1.5">
              <StickyNote className="size-4 text-on-warning-container" />
              <span className="min-w-0 shrink truncate text-label-medium uppercase tracking-[0.08em] text-on-warning-container">
                Sticky note
              </span>

              <div className="ml-auto flex items-center gap-1">
                {/* Format popover (migrated to Radix Popover for outside-click
                    + keyboard nav + portal layering) */}
                <Popover
                  open={formatMenuOpen}
                  onOpenChange={(open) => {
                    setFormatMenuOpen(open);
                    if (open) {
                      setPaletteOpen(false);
                      setListMenuOpen(false);
                      setAlignMenuOpen(false);
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={toolbarButtonClass}
                      aria-label="Text format"
                      title="Text format"
                    >
                      <Bold className="size-3.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    sideOffset={6}
                    className="w-auto min-w-32 rounded-md border border-outline-variant bg-surface-container-high p-1 text-on-surface shadow-e2"
                  >
                    {[
                      {
                        icon: <Bold className="size-3.5" />,
                        label: "Bold",
                        active: noteBold,
                        action: () => setNoteBold(!noteBold),
                      },
                      {
                        icon: <Italic className="size-3.5" />,
                        label: "Italic",
                        active: noteItalic,
                        action: () => setNoteItalic(!noteItalic),
                      },
                      {
                        icon: <Underline className="size-3.5" />,
                        label: "Underline",
                        active: noteUnderline,
                        action: () => setNoteUnderline(!noteUnderline),
                      },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={item.action}
                        className={`flex h-9 w-full items-center gap-2 rounded-md px-3 text-label-large transition-[background-color] duration-[var(--duration-short)] [transition-timing-function:var(--ease-standard)] ${
                          item.active
                            ? "bg-secondary-container text-on-secondary-container"
                            : "text-on-surface hover:bg-on-surface/[0.08] focus-visible:bg-on-surface/[0.10] active:bg-on-surface/[0.12]"
                        }`}
                      >
                        {item.icon}
                        {item.label}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>

                {/* Palette popover */}
                <Popover
                  open={paletteOpen}
                  onOpenChange={(open) => {
                    setPaletteOpen(open);
                    if (open) {
                      setFormatMenuOpen(false);
                      setListMenuOpen(false);
                      setAlignMenuOpen(false);
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={toolbarButtonClass}
                      aria-label="Choose note color"
                      title="Color"
                    >
                      <Palette className="size-3.5" style={{ color: marker }} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    sideOffset={6}
                    className="flex w-auto gap-1.5 rounded-md border border-outline-variant bg-surface-container-high p-2 text-on-surface shadow-e2"
                  >
                    {markerColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => {
                          setMarker(color);
                          setPaletteOpen(false);
                        }}
                        className={`size-7 rounded-full border-2 transition-transform duration-[var(--duration-short)] [transition-timing-function:var(--ease-standard)] hover:scale-110 focus-visible:scale-110 ${
                          marker === color ? "border-outline" : "border-transparent"
                        }`}
                        style={{ backgroundColor: color }}
                        aria-label={`Use note color ${color}`}
                      />
                    ))}
                  </PopoverContent>
                </Popover>

                {/* List popover */}
                <Popover
                  open={listMenuOpen}
                  onOpenChange={(open) => {
                    setListMenuOpen(open);
                    if (open) {
                      setFormatMenuOpen(false);
                      setPaletteOpen(false);
                      setAlignMenuOpen(false);
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={toolbarButtonClass}
                      aria-label="List style"
                      title="List style"
                    >
                      <List className="size-3.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    sideOffset={6}
                    className="w-auto min-w-36 rounded-md border border-outline-variant bg-surface-container-high p-1 text-on-surface shadow-e2"
                  >
                    {[
                      { kind: "bullet" as const, label: "Bullet point", mark: "•" },
                      { kind: "number" as const, label: "Number", mark: "1." },
                      { kind: "numerical" as const, label: "Numerical", mark: "1)" },
                      { kind: "dash" as const, label: "Dash", mark: "-" },
                    ].map((item) => (
                      <button
                        key={item.kind}
                        type="button"
                        onClick={() => {
                          insertListLines(item.kind);
                          setListMenuOpen(false);
                        }}
                        className="flex h-9 w-full items-center gap-2 rounded-md px-3 text-label-large text-on-surface hover:bg-on-surface/[0.08] focus-visible:bg-on-surface/[0.10] active:bg-on-surface/[0.12]"
                      >
                        <span className="w-5 text-left">{item.mark}</span>
                        {item.label}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>

                {/* Align popover */}
                <Popover
                  open={alignMenuOpen}
                  onOpenChange={(open) => {
                    setAlignMenuOpen(open);
                    if (open) {
                      setFormatMenuOpen(false);
                      setPaletteOpen(false);
                      setListMenuOpen(false);
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={toolbarButtonClass}
                      aria-label="Paragraph alignment"
                      title="Paragraph alignment"
                    >
                      {noteAlign === "center" ? (
                        <AlignCenter className="size-3.5" />
                      ) : noteAlign === "right" ? (
                        <AlignRight className="size-3.5" />
                      ) : (
                        <AlignLeft className="size-3.5" />
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    sideOffset={6}
                    className="w-auto min-w-28 rounded-md border border-outline-variant bg-surface-container-high p-1 text-on-surface shadow-e2"
                  >
                    {[
                      { align: "left" as const, icon: <AlignLeft className="size-3.5" />, label: "Left" },
                      { align: "center" as const, icon: <AlignCenter className="size-3.5" />, label: "Center" },
                      { align: "right" as const, icon: <AlignRight className="size-3.5" />, label: "Right" },
                    ].map((item) => (
                      <button
                        key={item.align}
                        type="button"
                        onClick={() => {
                          setNoteAlign(item.align);
                          setAlignMenuOpen(false);
                        }}
                        className={`flex h-9 w-full items-center gap-2 rounded-md px-3 text-label-large transition-[background-color] duration-[var(--duration-short)] [transition-timing-function:var(--ease-standard)] ${
                          noteAlign === item.align
                            ? "bg-secondary-container text-on-secondary-container"
                            : "text-on-surface hover:bg-on-surface/[0.08] focus-visible:bg-on-surface/[0.10] active:bg-on-surface/[0.12]"
                        }`}
                      >
                        {item.icon}
                        {item.label}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>

                <Button
                  type="button"
                  onClick={handleSaveNote}
                  variant="default"
                  size="icon"
                  className="size-7 shadow-e1"
                  aria-label="Save pinned note"
                  title="Save pin"
                >
                  <Pin className="size-3.5" />
                </Button>
              </div>
            </div>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="min-h-[220px] flex-1 w-full resize-none border-0 bg-transparent py-3 leading-6 text-body-large outline-none placeholder:text-on-warning-container/60"
              style={noteTextStyle}
              placeholder="Write a quick note..."
              aria-label="Pinned note"
            />
          </div>

          <div className="flex min-h-[260px] flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface-container p-3">
            <div className="mb-2 flex items-center gap-2">
              <Pin className="size-4 text-on-surface-variant" />
              <p className="text-label-medium uppercase tracking-[0.08em] text-on-surface-variant">
                Saved notes
              </p>
            </div>
            {pinnedNotes.length === 0 ? (
              <div className="flex h-[140px] items-center rounded-md border border-dashed border-outline-variant bg-surface-container-lowest px-3 text-body-small leading-5 text-on-surface-variant">
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
                      className={`rounded-md border border-outline-variant bg-warning-container p-2.5 shadow-e0 ${
                        activeNoteId === item.id ? "ring-2 ring-primary" : ""
                      }`}
                    >
                      <div className="flex items-start gap-1.5">
                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate text-body-medium font-semibold leading-5"
                            style={savedNoteStyle}
                          >
                            {preview.title}
                          </p>
                          <p
                            className="line-clamp-2 text-body-small leading-4 text-on-warning-container/80"
                            style={{ textAlign: asNoteAlign(item.align) }}
                          >
                            {preview.description || preview.title}
                          </p>
                          <p className="mt-1.5 text-label-small text-on-warning-container/80">
                            {timestampLabel(item.createdAt)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleViewNote(item)}
                          className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-1.5 text-label-small text-primary hover:bg-on-surface/[0.08] focus-visible:bg-on-surface/[0.10] active:bg-on-surface/[0.12]"
                          aria-label="View saved note"
                        >
                          <Eye className="size-3.5" />
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(item.id)}
                          className="flex size-6 shrink-0 items-center justify-center rounded-full text-base leading-none text-on-surface-variant transition-[background-color] duration-[var(--duration-short)] [transition-timing-function:var(--ease-standard)] hover:bg-error-container/[0.30] hover:text-error focus-visible:bg-error-container/[0.30] active:bg-error-container/[0.40]"
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

        <section className="shrink-0 rounded-lg border border-outline-variant bg-surface-container p-4">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays className="size-4 text-primary" />
            <h3 className="text-title-medium text-on-surface">Reminder Board</h3>
            <span className="ml-auto rounded-full bg-surface-container-high px-2.5 py-1 text-label-medium text-on-surface-variant">
              {overdueCount} overdue
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3 shadow-e0">
              <p className="text-label-small uppercase tracking-[0.08em] text-on-surface-variant">
                Reminders
              </p>
              <p className="mt-1 text-headline-small text-primary">{allReminderRows.length}</p>
            </div>
            <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3 shadow-e0">
              <p className="text-label-small uppercase tracking-[0.08em] text-on-surface-variant">
                Overdue
              </p>
              <p className="mt-1 text-headline-small text-error">{overdueCount}</p>
            </div>
            <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3 shadow-e0">
              <p className="text-label-small uppercase tracking-[0.08em] text-on-surface-variant">
                Date
              </p>
              <p className="mt-1.5 truncate text-body-small font-semibold text-on-surface">
                {nextReminderDate ? dateLabel(nextReminderDate) : "None"}
              </p>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {reminderRows.length === 0 ? (
              <div className="rounded-md border border-dashed border-outline-variant bg-surface-container-lowest p-4 text-body-small leading-5 text-on-surface-variant">
                Mark dates in the calendar tool and your reminders will appear here.
              </div>
            ) : (
              reminderRows.map((reminder) => {
                const tone = reminderTone(reminder.dueDate);
                return (
                  <div
                    key={`${reminder.kind}-${reminder.id}`}
                    className="grid gap-3 rounded-md border border-outline-variant bg-surface-container-low p-3 sm:grid-cols-[minmax(0,1fr)_auto]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: reminder.color }}
                        />
                        <span className={`rounded-full px-2 py-0.5 text-label-small ${tone.className}`}>
                          {tone.label}
                        </span>
                        <span className="text-label-small text-on-surface-variant">
                          {dateLabel(reminder.dueDate)}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-body-medium font-semibold leading-5 text-on-surface">
                        {reminder.title}
                      </p>
                      {reminder.kind === "task" && (
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-variant">
                          <div
                            className="h-full rounded-full bg-primary transition-[width] duration-[var(--duration-medium)] [transition-timing-function:var(--ease-standard)]"
                            style={{ width: `${reminder.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 sm:flex-col sm:items-stretch">
                      <button
                        type="button"
                        onClick={() => handleFinishReminder(reminder)}
                        className="h-8 rounded-full bg-success px-3 text-label-large text-on-success shadow-e1 transition-[background-color] duration-[var(--duration-short)] [transition-timing-function:var(--ease-standard)] hover:bg-on-success/[0.08] focus-visible:bg-on-success/[0.10] active:bg-on-success/[0.12]"
                      >
                        Done
                      </button>
                      <button
                        type="button"
                        onClick={() => handleClearReminder(reminder)}
                        className="flex size-8 items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest text-on-surface-variant transition-[background-color] duration-[var(--duration-short)] [transition-timing-function:var(--ease-standard)] hover:bg-on-surface/[0.08] focus-visible:bg-on-surface/[0.10] active:bg-on-surface/[0.12]"
                        aria-label={`Clear reminder for ${reminder.title}`}
                      >
                        <RotateCcw className="size-3.5" />
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

function DashboardPage() {
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
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-6 bg-background">
        <div className="flex flex-col items-center gap-4">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary text-on-primary shadow-e1">
            <ClipboardList className="size-6" />
          </span>
          <span
            className="size-8 rounded-full border-2 border-on-surface-variant border-t-primary animate-spin"
            aria-hidden="true"
          />
        </div>
        <p className="text-body-large text-on-surface-variant">Loading Focus List…</p>
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-background">
      <Header
        search={search}
        onSearchChange={setSearch}
        sort={sort}
        onSortChange={setSort}
        onAddTask={openCreate}
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

      <main className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto bg-background lg:grid-cols-[minmax(0,6fr)_minmax(360px,4fr)] lg:overflow-hidden">
        <section className="fl-scroll flex min-h-[520px] flex-col bg-background px-4 sm:px-6 lg:min-h-0 lg:flex-1 xl:px-10">
          {activeTab === "active" ? (
            <>
              <div className="flex items-center gap-2.5 py-3">
                <ClipboardList className="size-5 text-on-surface-variant" />
                <h1 className="text-title-large text-on-surface">
                  {selectedProject ? selectedProject.name : "Active Tasks"}
                </h1>
                <Badge variant="default">{activeTasksRendered.length}</Badge>
                <span className="ml-auto hidden items-center gap-1.5 text-label-medium text-on-surface-variant sm:inline-flex">
                  <Sparkles className="size-3.5" />
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
  return <DashboardPage />;
}
