"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { ClipboardList } from "lucide-react";
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
  archiveProject,
  deleteTask,
  duplicateTask,
  restoreProject,
  reorderProject,
  setProgress,
  setTaskDetail,
  updateTask,
  useAllTasks,
  useArchivedProjects,
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
  type Project,
  type SortKey,
  type Task,
} from "@/lib/focuslist/types";
import { usePersistentState } from "@/lib/focuslist/use-persistent-state";
import {
  signInAccount,
  type AccountSnapshot,
  useAccountSnapshot,
  useBrowserCollection,
} from "@/lib/focuslist/browser-state";
import {
  asCalendarReminders,
  isUpcomingReminderDate,
  toDateKey,
  type CalendarReminder,
} from "@/lib/focuslist/calendar-reminders";
import { DashboardTools } from "@/components/focuslist/dashboard-tools";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  CalendarDays,
  Eye,
  EyeOff,
  Italic,
  List,
  Palette,
  Pin,
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

type NoteAlign = "left" | "center" | "right" | "justify";
type NoteListKind =
  | "bullet"
  | "number"
  | "numerical"
  | "roman"
  | "letter"
  | "dash"
  | "check"
  | "arrow"
  | "checklist"
  | "checked";

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
  "#1b1b21",
  "#7c5800",
  "#7a4f3d",
  "#1f6b34",
  "#0061a4",
  "#4f46e5",
];
const noteFontFamilies = [
  { label: "Sans", value: "Inter, Arial, sans-serif" },
  { label: "Serif", value: "Georgia, serif" },
  { label: "Mono", value: "ui-monospace, SFMono-Regular, Menlo, monospace" },
  { label: "Hand", value: '"Comic Sans MS", "Bradley Hand", cursive' },
];
const noteFontSizes = [13, 15, 17, 19, 22];
const noteFormatItems = [
  { command: "bold" as const, icon: <Bold className="size-3.5" />, label: "Bold" },
  { command: "italic" as const, icon: <Italic className="size-3.5" />, label: "Italic" },
  { command: "underline" as const, icon: <Underline className="size-3.5" />, label: "Underline" },
];
const noteListItems = [
  { kind: "bullet" as const, label: "Bullet point", mark: "•" },
  { kind: "number" as const, label: "Number", mark: "1." },
  { kind: "numerical" as const, label: "Numerical", mark: "1)" },
  { kind: "roman" as const, label: "Roman", mark: "i." },
  { kind: "letter" as const, label: "Letter", mark: "a." },
  { kind: "dash" as const, label: "Dash", mark: "-" },
  { kind: "check" as const, label: "Check", mark: "✓" },
  { kind: "arrow" as const, label: "Arrow point", mark: "→" },
  { kind: "checklist" as const, label: "Checklist", mark: "☐" },
  { kind: "checked" as const, label: "Checked", mark: "☑" },
];
const noteAlignItems = [
  { align: "left" as const, icon: <AlignLeft className="size-3.5" />, label: "Left" },
  { align: "center" as const, icon: <AlignCenter className="size-3.5" />, label: "Center" },
  { align: "right" as const, icon: <AlignRight className="size-3.5" />, label: "Right" },
  { align: "justify" as const, icon: <AlignJustify className="size-3.5" />, label: "Justify" },
];

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
  return value === "center" || value === "right" || value === "justify"
    ? value
    : "left";
}

function isNoteColor(value: string): boolean {
  return markerColors.includes(value) || /^#[\da-f]{6}$/i.test(value);
}

function romanNumeral(value: number): string {
  const numerals: Array<[number, string]> = [
    [10, "x"],
    [9, "ix"],
    [5, "v"],
    [4, "iv"],
    [1, "i"],
  ];
  let remaining = value;
  let result = "";
  for (const [amount, symbol] of numerals) {
    while (remaining >= amount) {
      result += symbol;
      remaining -= amount;
    }
  }
  return result;
}

function letterMarker(value: number): string {
  const alphabetIndex = (value - 1) % 26;
  return String.fromCharCode(97 + alphabetIndex);
}

function nextRomanNumeral(value: string): string {
  const known = [
    "i",
    "ii",
    "iii",
    "iv",
    "v",
    "vi",
    "vii",
    "viii",
    "ix",
    "x",
  ];
  const index = known.indexOf(value.toLowerCase());
  return index >= 0 ? romanNumeral(index + 2) : "i";
}

function nextLetter(value: string): string {
  const code = value.toLowerCase().charCodeAt(0);
  if (code < 97 || code > 122) return "a";
  return String.fromCharCode(code === 122 ? 97 : code + 1);
}

function nextListMarker(line: string): string | null {
  const symbol = line.match(/^(\s*)([•\-✓→☐☑☒])\s+/);
  if (symbol) return `${symbol[1]}${symbol[2]} `;

  const number = line.match(/^(\s*)(\d+)([.)])\s+/);
  if (number) return `${number[1]}${Number(number[2]) + 1}${number[3]} `;

  const roman = line.match(/^(\s*)([ivx]+)\.\s+/i);
  if (roman) return `${roman[1]}${nextRomanNumeral(roman[2])}. `;

  const letter = line.match(/^(\s*)([a-z])\.\s+/i);
  if (letter) return `${letter[1]}${nextLetter(letter[2])}. `;

  return null;
}

function listMarkerOnlyLength(line: string): number | null {
  const symbol = line.match(/^(\s*[•\-✓→☐☑☒]\s*)$/);
  if (symbol) return symbol[1].length;

  const number = line.match(/^(\s*\d+[.)]\s*)$/);
  if (number) return number[1].length;

  const roman = line.match(/^(\s*[ivx]+\.\s*)$/i);
  if (roman) return roman[1].length;

  const letter = line.match(/^(\s*[a-z]\.\s*)$/i);
  if (letter) return letter[1].length;

  return null;
}

function escapeNoteHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function plainTextToNoteHtml(value: string): string {
  return escapeNoteHtml(value).replace(/\n/g, "<br>");
}

function sanitizeNoteHtml(value: string): string {
  if (typeof document === "undefined") return plainTextToNoteHtml(value);
  const template = document.createElement("template");
  template.innerHTML = value;
  const allowedTags = new Set([
    "B",
    "STRONG",
    "I",
    "EM",
    "U",
    "BR",
    "DIV",
    "P",
    "SPAN",
    "FONT",
    "UL",
    "OL",
    "LI",
  ]);

  const cleanNode = (node: Node): Node => {
    if (node.nodeType === Node.TEXT_NODE) {
      return document.createTextNode(node.textContent ?? "");
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return document.createDocumentFragment();
    }

    const element = node as HTMLElement;
    if (!allowedTags.has(element.tagName)) {
      const fragment = document.createDocumentFragment();
      element.childNodes.forEach((child) => fragment.appendChild(cleanNode(child)));
      return fragment;
    }

    if (element.tagName === "BR") return document.createElement("br");

    const tagName =
      element.tagName === "STRONG"
        ? "b"
        : element.tagName === "EM"
          ? "i"
          : element.tagName === "FONT"
            ? "span"
            : element.tagName.toLowerCase();
    const cleanElement = document.createElement(tagName);
    const color = element.getAttribute("color") ?? element.style.color;
    if ((tagName === "span" || tagName === "li") && color && CSS.supports("color", color)) {
      cleanElement.style.color = color;
    }
    const textAlign = element.style.textAlign;
    if (
      (tagName === "div" || tagName === "p" || tagName === "li") &&
      ["left", "center", "right", "justify"].includes(textAlign)
    ) {
      cleanElement.style.textAlign = textAlign;
    }
    const listStyleType = element.style.listStyleType;
    if ((tagName === "ol" || tagName === "ul") && listStyleType) {
      cleanElement.style.listStyleType = listStyleType;
    }
    element.childNodes.forEach((child) => cleanElement.appendChild(cleanNode(child)));
    return cleanElement;
  };

  const fragment = document.createDocumentFragment();
  template.content.childNodes.forEach((child) => fragment.appendChild(cleanNode(child)));
  const output = document.createElement("div");
  output.appendChild(fragment);
  return output.innerHTML;
}

function noteEditorHtml(value: string): string {
  return /<\/?[a-z][\s\S]*>/i.test(value) ? sanitizeNoteHtml(value) : plainTextToNoteHtml(value);
}

function notePlainText(value: string): string {
  if (!/<\/?[a-z][\s\S]*>/i.test(value)) return value;
  if (typeof document === "undefined") {
    return value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(div|p)>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, "\"")
      .replace(/&#39;/g, "'");
  }
  const template = document.createElement("template");
  template.innerHTML = sanitizeNoteHtml(value);
  const readNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const element = node as HTMLElement;
    if (element.tagName === "BR") return "\n";
    const text = Array.from(element.childNodes, readNode).join("");
    return element.tagName === "DIV" || element.tagName === "P" ? `${text}\n` : text;
  };
  return Array.from(template.content.childNodes, readNode).join("").replace(/\u00a0/g, " ");
}

function placeCaretAtEnd(element: HTMLElement): void {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
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
  const lines = notePlainText(text)
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

function contributionTone(count: number): string {
  if (count <= 0) return "#e7ebf0";
  if (count <= 1) return "#c5e8d0";
  if (count <= 2) return "#8ad2a0";
  if (count <= 4) return "#53bb74";
  return "#1f8d4d";
}

function buildContributionGrid(tasks: Task[]): { cells: Array<{ date: string; count: number; weekIndex: number; dayIndex: number }>; total: number } {
  const counts = new Map<string, number>();
  for (const task of tasks) {
    const createdDate = task.createdAt ? toDateKey(new Date(task.createdAt)) : null;
    const completedDate = task.completedAt ? toDateKey(new Date(task.completedAt)) : null;
    if (createdDate) {
      counts.set(createdDate, (counts.get(createdDate) ?? 0) + 1);
    }
    if (completedDate) {
      counts.set(completedDate, (counts.get(completedDate) ?? 0) + 1);
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weeksToShow = 53;
  const totalDays = weeksToShow * 7;
  const start = new Date(today);
  const mondayOffset = (today.getDay() + 6) % 7;
  start.setDate(today.getDate() - mondayOffset - (totalDays - 1));

  const cells: Array<{ date: string; count: number; weekIndex: number; dayIndex: number }> = [];
  let total = 0;

  for (let index = 0; index < totalDays; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = toDateKey(date);
    const count = counts.get(key) ?? 0;
    total += count;
    cells.push({
      date: key,
      count,
      weekIndex: Math.floor(index / 7),
      dayIndex: index % 7,
    });
  }

  return { cells, total };
}

function ContributionHeatmap({ tasks }: { tasks: Task[] }) {
  const { cells, total } = buildContributionGrid(tasks);
  const weeks = Array.from({ length: 53 }, (_, index) => index);
  const year = new Date().getFullYear();
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="bg-transparent p-0">
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-outline-variant pb-3">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full bg-surface-variant text-primary">
            <CalendarDays className="size-4" />
          </div>
          <div>
            <h3 className="text-title-large text-on-surface">Year in Review</h3>
            <p className="text-body-small text-on-surface-variant">
              Darker squares mean higher task completion or stronger daily focus.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-lg border border-outline-variant bg-surface text-title-medium text-on-surface-variant hover:bg-surface-container-low"
            aria-label="Previous year"
          >
            ‹
          </button>
          <span className="inline-flex min-w-[4.5rem] items-center justify-center rounded-lg border border-outline-variant bg-surface-container-low px-3 py-1.5 text-label-large text-on-surface">
            {year}
          </span>
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-lg border border-outline-variant bg-surface text-title-medium text-on-surface-variant hover:bg-surface-container-low"
            aria-label="Next year"
          >
            ›
          </button>
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="min-w-[520px]">
          <div className="grid grid-cols-[18px_minmax(0,1fr)] gap-2">
            <div className="flex flex-col justify-between pt-6 text-[10px] uppercase tracking-[0.08em] text-on-surface-variant">
              {dayLabels.filter((_, index) => index % 2 === 1).map((label) => (
                <span key={label} className="h-2.5 leading-2.5">
                  {label}
                </span>
              ))}
            </div>

            <div>
              <div
                className="mb-2 grid gap-1"
                style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(10px, 1fr))` }}
              >
                {weeks.map((weekIndex) => {
                  const date = new Date(cells[weekIndex * 7]?.date ?? new Date().toISOString());
                  const month = date.toLocaleDateString("en-US", { month: "short" });
                  const previousMonth =
                    weekIndex === 0
                      ? null
                      : new Date(cells[(weekIndex - 1) * 7]?.date ?? new Date().toISOString())
                          .toLocaleDateString("en-US", { month: "short" });
                  const showLabel = previousMonth !== month;

                  return (
                    <span
                      key={`month-${weekIndex}`}
                      className={`text-center text-[10px] ${showLabel ? "text-on-surface-variant" : "opacity-0"}`}
                    >
                      {showLabel ? month : ""}
                    </span>
                  );
                })}
              </div>

              <div
                className="grid gap-1"
                style={{
                  gridTemplateColumns: `repeat(${weeks.length}, minmax(10px, 1fr))`,
                  gridTemplateRows: "repeat(7, 10px)",
                }}
              >
                {cells.map((cell) => (
                  <span
                    key={`${cell.date}-${cell.weekIndex}-${cell.dayIndex}`}
                    className="block h-2.5 w-2.5 rounded-[3px] border border-on-surface/[0.04]"
                    style={{
                      backgroundColor: contributionTone(cell.count),
                      gridColumn: cell.weekIndex + 1,
                      gridRow: cell.dayIndex + 1,
                    }}
                    title={`${cell.date}: ${cell.count} contribution${cell.count === 1 ? "" : "s"}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 text-[11px] text-on-surface-variant">
            <div className="flex items-center gap-2">
              <span>No activity</span>
              <div className="flex items-center gap-1">
                {[0, 1, 2, 3, 4].map((level) => (
                  <span
                    key={level}
                    className="h-2.5 w-2.5 rounded-[3px] border border-on-surface/[0.04]"
                    style={{ backgroundColor: contributionTone(level) }}
                  />
                ))}
              </div>
              <span>Low</span>
              <div className="flex items-center gap-1">
                {[0, 1, 2, 3, 4].map((level) => (
                  <span
                    key={`high-${level}`}
                    className="h-2.5 w-2.5 rounded-[3px] border border-on-surface/[0.04]"
                    style={{ backgroundColor: contributionTone(level + 1) }}
                  />
                ))}
              </div>
              <span>High</span>
            </div>
            <span className="text-label-small text-on-surface-variant">{total} focused days this year</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FocusSidePanel({ onAddTask }: { onAddTask: () => void }) {
  const tasks = useAllTasks();
  const projects = useProjects();
  const tags = useTags();
  const projectsById = projectMap(projects);
  const tagsById = tagMap(tags);

  const activeTasks = tasks.filter(
    (task) => !task.archivedAt && !task.deletedAt && !isComplete(task)
  );
  const archivedTasks = tasks.filter((task) => task.archivedAt && !task.deletedAt);

  const dailyRows = activeTasks.slice(0, 5).map((task) => {
    const project = projectsById[task.projectId];
    const tag = tagsById[task.tagId];
    const color = project?.color ?? "#4f46e5";
    const progress = Math.min(100, Math.max(0, task.progress));
    const filledCells = Math.max(1, Math.round((progress / 100) * 7));
    const label = tag?.name ?? project?.name ?? "General";
    const detailText = task.dueDate
      ? new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
        }).format(new Date(`${task.dueDate}T00:00:00`))
      : "No time set";

    return {
      id: task.id,
      title: task.title,
      tagLabel: label,
      detailText,
      color,
      progress,
      filledCells,
    };
  });

  return (
    <aside className="flex min-h-0 flex-col border-t border-outline-variant bg-surface-container-low lg:border-l lg:border-t-0">
      <div className="space-y-4 p-4">
        <section className="bg-transparent p-0">
          <div className="mb-3 flex items-center justify-between gap-3 border-b border-outline-variant pb-3">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-surface-variant text-primary">
                <CalendarDays className="size-4" />
              </div>
              <div>
                <h3 className="text-title-large text-on-surface">Daily Tasks</h3>
                <p className="text-body-small text-on-surface-variant">
                  Build better habits, one day at a time.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button type="button" className="rounded-full border border-outline-variant bg-surface-container-low px-2.5 py-1 text-label-medium text-on-surface-variant">
                Active <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-label-small text-primary">{activeTasks.length}</span>
              </button>
              <button type="button" className="rounded-full border border-outline-variant bg-surface-container-low px-2.5 py-1 text-label-medium text-on-surface-variant">
                Archived <span className="ml-1 rounded-full bg-on-surface/[0.06] px-1.5 py-0.5 text-label-small text-on-surface-variant">{archivedTasks.length}</span>
              </button>
              <button type="button" onClick={onAddTask} className="rounded-full bg-primary px-3 py-1.5 text-label-large text-on-primary shadow-e1 hover:bg-primary/90">
                Add daily task
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-none border-0 bg-transparent">
            <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(72px,0.8fr)_repeat(7,minmax(0,0.5fr))_24px] items-center gap-2 border-b border-outline-variant px-3 py-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-on-surface-variant">
              <span>Task</span>
              <span>Intensity</span>
              {Array.from({ length: 7 }, (_, index) => (
                <span key={`day-header-${index}`} className="text-center">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}
                </span>
              ))}
              <span className="text-center"> </span>
            </div>

            <div className="divide-y divide-outline-variant">
              {dailyRows.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-[minmax(0,1.5fr)_minmax(72px,0.8fr)_repeat(7,minmax(0,0.5fr))_24px] items-center gap-2 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="flex size-4 items-center justify-center rounded-sm border border-primary/30 bg-primary/5 text-[10px] text-primary">
                        ✓
                      </span>
                      <span className="truncate text-body-medium font-medium text-on-surface">
                        {row.title}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="rounded-full bg-primary/8 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        {row.tagLabel}
                      </span>
                      <span className="text-[10px] text-on-surface-variant">{row.detailText}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center">
                    <div className="h-1.5 w-14 overflow-hidden rounded-full bg-surface-variant">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${row.progress}%`, backgroundColor: row.color }}
                      />
                    </div>
                  </div>

                  {Array.from({ length: 7 }, (_, index) => {
                    const filled = index < row.filledCells;
                    return (
                      <span
                        key={`${row.id}-day-${index}`}
                        className={`mx-auto block h-3.5 w-3.5 rounded-[4px] border ${filled ? "border-transparent" : "border-on-surface/[0.12]"}`}
                        style={{
                          backgroundColor: filled ? row.color : "#e7ebf0",
                          opacity: filled ? 1 : 0.8,
                        }}
                      />
                    );
                  })}

                  <button
                    type="button"
                    className="flex size-6 items-center justify-center rounded-full text-lg text-on-surface-variant hover:bg-on-surface/[0.06]"
                    aria-label={`More options for ${row.title}`}
                  >
                    ⋮
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <ContributionHeatmap tasks={tasks} />
      </div>
    </aside>
  );
}

function DashboardPage() {
  const projects = useProjects();
  const archivedProjects = useArchivedProjects();
  const tags = useTags();
  const allTasks = useAllTasks();
  const account = useAccountSnapshot();

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
  const effectiveSelectedProjectId =
    selectedProjectId && pMap[selectedProjectId] ? selectedProjectId : null;
  const effectiveSelectedTagId = selectedTagId && tMap[selectedTagId] ? selectedTagId : null;
  const selectedProject = effectiveSelectedProjectId ? pMap[effectiveSelectedProjectId] : null;

  const isFiltering =
    search.trim() !== "" || effectiveSelectedProjectId !== null || effectiveSelectedTagId !== null;
  const activeListHasSearchFilters = search.trim() !== "" || effectiveSelectedTagId !== null;

  // Derived active list (compiler auto-memoizes).
  const visibleTasks = allTasks.filter((task) => !task.archivedAt && !task.deletedAt);
  const activeTasks = visibleTasks
    .filter((t) => !isComplete(t))
    .filter((t) =>
      matchTask(
        t,
        { search, projectId: effectiveSelectedProjectId, tagId: effectiveSelectedTagId },
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
        { search, projectId: effectiveSelectedProjectId, tagId: effectiveSelectedTagId },
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

  const requireAccount = useCallback((reason: string): boolean => {
    if (account.status === "signed-in") return true;
    toast.error("Sign in required", { description: reason });
    return false;
  }, [account.status]);

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
    if (!requireAccount("Sign in to save tasks across devices.")) {
      return;
    }
    setEditingTask(null);
    setInitialProjectName(selectedProject?.name ?? "");
    setPanelMode("create");
    setPanelOpen(true);
  }, [requireAccount, selectedProject?.name]);

  const openEdit = useCallback((task: Task) => {
    setEditingTask(task);
    setInitialProjectName("");
    setPanelMode("edit");
    setPanelOpen(true);
  }, []);

  const closePanel = useCallback(() => setPanelOpen(false), []);

  const handleSubmit = useCallback(
    async (data: TaskFormData) => {
      if (!requireAccount("Sign in before saving a task.")) {
        return;
      }
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
      if (effectiveSelectedProjectId !== null && effectiveSelectedProjectId !== project.id) {
        setSelectedProjectId(project.id);
      }
    },
    [panelMode, editingTask, effectiveSelectedProjectId, setSelectedProjectId, requireAccount]
  );

  const handleCreateProject = useCallback(async (name: string) => {
    if (!requireAccount("Sign in to save project folders.")) {
      return;
    }
    const project = await findOrCreateProject(name);
    if (effectiveSelectedProjectId === project.id) {
      setInitialProjectName(project.name);
    }
    setEditingTask(null);
    toast.success("Project created", { description: project.name });
  }, [requireAccount, effectiveSelectedProjectId]);

  const openProjectCreateFrame = useCallback(() => {
    if (!requireAccount("Sign in to save project folders.")) {
      return;
    }
    setProjectMenuOpen(true);
    setProjectCreateFrameOpen(true);
  }, [requireAccount]);

  const handleRenameProject = useCallback(async (id: string, name: string) => {
    const project = await renameProject(id, name);
    if (!project) return;
    if (effectiveSelectedProjectId === id) {
      setInitialProjectName(project.name);
    }
    toast.success("Project renamed", { description: project.name });
  }, [effectiveSelectedProjectId]);

  const handleArchiveProject = useCallback(async (id: string) => {
    const project = await archiveProject(id);
    if (!project) return;
    if (effectiveSelectedProjectId === id) {
      setSelectedProjectId(null);
      setInitialProjectName("");
    }
    toast.success("Project archived", { description: project.name });
  }, [effectiveSelectedProjectId, setSelectedProjectId]);

  const handleRestoreProject = useCallback(async (project: Project) => {
    const restored = await restoreProject(project.id);
    if (!restored) return;
    toast.success("Project restored", { description: restored.name });
  }, []);

  const handleReorderProject = useCallback(
    async (sourceId: string, targetId: string, placement: "before" | "after") => {
      await reorderProject(sourceId, targetId, placement);
    },
    []
  );

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

  if (account.status !== "signed-in") {
    return <SignInLanding account={account} />;
  }

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-background">
      <Header
        search={search}
        onSearchChange={setSearch}
        onAddTask={openCreate}
        onOpenTool={setToolView}
        searchInputRef={searchRef}
        account={account}
      />

      <FilterToolbar
        projects={projects}
        tags={tags}
        activeTab={activeTab}
        completedCount={doneTasks.length}
        sort={sort}
        selectedProjectId={effectiveSelectedProjectId}
        selectedTagId={effectiveSelectedTagId}
        projectMenuOpen={projectMenuOpen}
        createFrameOpen={projectCreateFrameOpen}
        onTabChange={setActiveTab}
        onSortChange={setSort}
        onSelectProject={setSelectedProjectId}
        onSelectTag={setSelectedTagId}
        onProjectMenuOpenChange={setProjectMenuOpen}
        onCreateFrameOpenChange={setProjectCreateFrameOpen}
        onCreateProject={handleCreateProject}
        onRenameProject={handleRenameProject}
        onReorderProject={handleReorderProject}
        onArchiveProject={handleArchiveProject}
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

        <FocusSidePanel onAddTask={openCreate} />
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
          projects={archivedProjects}
          onClose={() => setToolView(null)}
          onRestoreProject={handleRestoreProject}
          onSetReminder={handleSetReminder}
        />
      )}
    </div>
  );
}

function SignInLanding({ account }: { account: AccountSnapshot }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const cleanUsername = username.trim();
    if (!cleanUsername || password.length < 4) {
      setError("Use your username and at least 4 password characters.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signInAccount(cleanUsername, password);
      setPassword("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  const loading = account.status === "loading";

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-sm rounded-lg border border-outline-variant bg-surface-container-lowest p-6 shadow-e2">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-full bg-primary text-on-primary">
            <ClipboardList className="size-5" />
          </span>
          <div>
            <h1 className="text-title-large font-semibold text-on-surface">
              Focus List
            </h1>
            <p className="text-body-small text-on-surface-variant">
              Sign in to open your dashboard.
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signin-username">Username</Label>
            <Input
              id="signin-username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              placeholder="your-name"
              disabled={busy || loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signin-password">Password</Label>
            <div className="relative">
              <Input
                id="signin-password"
                type={passwordVisible ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="Password"
                disabled={busy || loading}
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setPasswordVisible((visible) => !visible)}
                className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-on-surface-variant transition-[background-color,color] hover:bg-on-surface/[0.08] hover:text-on-surface focus-visible:bg-on-surface/[0.10] focus-visible:outline-none active:bg-on-surface/[0.12]"
                aria-label={passwordVisible ? "Hide password" : "Show password"}
                disabled={busy || loading}
              >
                {passwordVisible ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

          {!account.apiConfigured && (
            <p className="rounded-md border border-error/30 bg-error-container px-3 py-2 text-body-small text-on-error-container">
              Account storage is not connected yet.
            </p>
          )}
          {(error || account.message) && (
            <p className="rounded-md border border-error/30 bg-error-container px-3 py-2 text-body-small text-on-error-container">
              {error ?? account.message}
            </p>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={busy || loading || !account.apiConfigured}
          >
            {busy || loading ? "Please wait..." : "Sign in"}
          </Button>
        </form>
      </section>
    </main>
  );
}

export default function Page() {
  return <DashboardPage />;
}
