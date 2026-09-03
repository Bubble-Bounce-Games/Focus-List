"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
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
  archiveProject,
  deleteTask,
  duplicateTask,
  restoreProject,
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
  const [calendarReminderValue] = useBrowserCollection<unknown>(
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
  const noteTextareaRef = useRef<HTMLDivElement>(null);
  const noteSelectionRef = useRef<Range | null>(null);
  const note = asString(noteValue);
  const pinnedNotes = asPinnedNotes(pinnedNotesValue);
  const calendarReminders = asCalendarReminders(calendarReminderValue);
  const marker = isNoteColor(asString(markerValue))
    ? asString(markerValue)
    : markerColors[0];
  const noteFont = asNoteFontFamily(noteFontValue);
  const noteFontSize = asNoteFontSize(noteFontSizeValue);
  const noteBold = asBoolean(noteBoldValue);
  const noteItalic = asBoolean(noteItalicValue);
  const noteUnderline = asBoolean(noteUnderlineValue);
  const noteAlign = asNoteAlign(noteAlignValue);
  const noteTextStyle = {
    fontFamily: noteFont,
    fontSize: `${noteFontSize}px`,
  } as const;
  const customMarkerColor = /^#[\da-f]{6}$/i.test(marker) ? marker : "#202124";
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
  const reminderRows = allReminderRows;

  const handleSaveNote = useCallback(() => {
    const text = sanitizeNoteHtml(note).trim();
    if (!notePlainText(text).trim()) return;
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
      if (isNoteColor(item.color)) {
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

  const syncNoteFromEditor = useCallback(() => {
    const editor = noteTextareaRef.current;
    if (!editor) return;
    setNote(sanitizeNoteHtml(editor.innerHTML));
    setNoteBold(document.queryCommandState("bold"));
    setNoteItalic(document.queryCommandState("italic"));
    setNoteUnderline(document.queryCommandState("underline"));
  }, [setNote, setNoteBold, setNoteItalic, setNoteUnderline]);

  const rememberNoteSelection = useCallback(() => {
    const editor = noteTextareaRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;
    noteSelectionRef.current = range.cloneRange();
  }, []);

  const restoreNoteSelection = useCallback(() => {
    const editor = noteTextareaRef.current;
    const range = noteSelectionRef.current;
    const selection = window.getSelection();
    if (!editor || !range || !selection || !editor.contains(range.commonAncestorContainer)) {
      editor?.focus();
      return;
    }
    editor.focus();
    selection.removeAllRanges();
    selection.addRange(range);
  }, []);

  const runNoteCommand = useCallback(
    (command: "bold" | "italic" | "underline" | "insertOrderedList" | "insertUnorderedList") => {
      restoreNoteSelection();
      document.execCommand(command);
      syncNoteFromEditor();
    },
    [restoreNoteSelection, syncNoteFromEditor]
  );

  const runNoteColor = useCallback(
    (color: string) => {
      restoreNoteSelection();
      document.execCommand("foreColor", false, color);
      setMarker(color);
      syncNoteFromEditor();
    },
    [restoreNoteSelection, setMarker, syncNoteFromEditor]
  );

  const runNoteAlign = useCallback(
    (align: NoteAlign) => {
      const commands = {
        left: "justifyLeft",
        center: "justifyCenter",
        right: "justifyRight",
        justify: "justifyFull",
      } as const;
      restoreNoteSelection();
      document.execCommand(commands[align]);
      setNoteAlign(align);
      syncNoteFromEditor();
    },
    [restoreNoteSelection, setNoteAlign, syncNoteFromEditor]
  );

  const insertCustomList = useCallback(
    (kind: NoteListKind) => {
      const selection = window.getSelection();
      const selectedText = selection?.toString() ?? "";
      const sourceLines = selectedText.trim()
        ? selectedText.split(/\n+/).map((line) => line.trim()).filter(Boolean)
        : [""];
      const formatLine = (text: string, index: number) => {
        const bare = text
          .replace(/^(•\s+|-+\s+|✓\s+|→\s+|\d+[\).]\s+|[a-z]\.\s+|[ivx]+\.\s+|[☐☑☒]\s+)/i, "")
          .trim();
        if (kind === "dash") return `- ${bare}`;
        if (kind === "check") return `✓ ${bare}`;
        if (kind === "arrow") return `→ ${bare}`;
        if (kind === "checklist") return `☐ ${bare}`;
        if (kind === "checked") return `☑ ${bare}`;
        if (kind === "roman") return `${romanNumeral(index + 1)}. ${bare}`;
        if (kind === "letter") return `${letterMarker(index + 1)}. ${bare}`;
        if (kind === "numerical") return `${index + 1}) ${bare}`;
        return bare;
      };
      const html = sourceLines
        .map((line, index) => `<div>${escapeNoteHtml(formatLine(line, index))}</div>`)
        .join("");
      document.execCommand("insertHTML", false, html);
      syncNoteFromEditor();
    },
    [syncNoteFromEditor]
  );

  const runNoteList = useCallback(
    (kind: NoteListKind) => {
      restoreNoteSelection();
      if (kind === "bullet") {
        runNoteCommand("insertUnorderedList");
        return;
      }
      if (kind === "number" || kind === "roman" || kind === "letter") {
        runNoteCommand("insertOrderedList");
        const selection = window.getSelection();
        const list = selection?.anchorNode?.parentElement?.closest("ol");
        if (list) {
          list.style.listStyleType =
            kind === "roman" ? "lower-roman" : kind === "letter" ? "lower-alpha" : "decimal";
          syncNoteFromEditor();
        }
        return;
      }
      insertCustomList(kind);
    },
    [insertCustomList, restoreNoteSelection, runNoteCommand, syncNoteFromEditor]
  );

  useEffect(() => {
    const editor = noteTextareaRef.current;
    if (!editor) return;
    const nextHtml = noteEditorHtml(note);
    if (editor.innerHTML !== nextHtml) {
      const wasActive = document.activeElement === editor;
      editor.innerHTML = nextHtml;
      if (wasActive) placeCaretAtEnd(editor);
    }
  }, [note]);

  const handleNoteKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "Enter" || event.shiftKey) return;
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return;
      const plainNote = notePlainText(note);
      const cursorStart = plainNote.length;

      const lineStart = plainNote.lastIndexOf("\n", cursorStart - 1) + 1;
      const currentLine = plainNote.slice(lineStart);
      const marker = nextListMarker(currentLine);
      if (!marker) return;

      event.preventDefault();
      const markerOnlyLength = listMarkerOnlyLength(currentLine);
      if (markerOnlyLength !== null) {
        const nextNote = plainNote.slice(0, lineStart);
        setNote(nextNote);
        return;
      }

      const nextNote = `${plainNote}\n${marker}`;
      setNote(nextNote);
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
                    {noteFormatItems.map((item) => {
                      const active =
                        item.command === "bold"
                          ? noteBold
                          : item.command === "italic"
                            ? noteItalic
                            : noteUnderline;
                      return (
                      <button
                        key={item.label}
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          runNoteCommand(item.command);
                        }}
                        className={`flex h-9 w-full items-center gap-2 rounded-md px-3 text-label-large transition-[background-color] duration-[var(--duration-short)] [transition-timing-function:var(--ease-standard)] ${
                          active
                            ? "bg-secondary-container text-on-secondary-container"
                            : "text-on-surface hover:bg-on-surface/[0.08] focus-visible:bg-on-surface/[0.10] active:bg-on-surface/[0.12]"
                        }`}
                      >
                        {item.icon}
                        {item.label}
                      </button>
                      );
                    })}
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
                    className="flex w-auto max-w-52 flex-wrap items-center gap-1.5 rounded-md border border-outline-variant bg-surface-container-high p-2 text-on-surface shadow-e2"
                  >
                    {markerColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          runNoteColor(color);
                          setPaletteOpen(false);
                        }}
                        className={`size-7 rounded-full border-2 transition-transform duration-[var(--duration-short)] [transition-timing-function:var(--ease-standard)] hover:scale-110 focus-visible:scale-110 ${
                          marker === color ? "border-outline" : "border-transparent"
                        }`}
                        style={{ backgroundColor: color }}
                        aria-label={`Use note color ${color}`}
                      />
                    ))}
                    <label
                      className="relative flex size-7 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-outline-variant bg-surface-container-low text-on-surface-variant transition-transform duration-[var(--duration-short)] [transition-timing-function:var(--ease-standard)] hover:scale-110 focus-within:scale-110"
                      title="Custom color"
                    >
                      <Palette className="pointer-events-none size-3.5" />
                      <input
                        type="color"
                        value={customMarkerColor}
                        onChange={(event) => runNoteColor(event.target.value)}
                        className="absolute inset-0 cursor-pointer opacity-0"
                        aria-label="Choose custom note color"
                      />
                    </label>
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
                    className="fl-scroll max-h-80 w-auto min-w-36 overflow-y-auto rounded-md border border-outline-variant bg-surface-container-high p-1 text-on-surface shadow-e2"
                  >
                    {noteListItems.map((item) => (
                      <button
                        key={item.kind}
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          runNoteList(item.kind);
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
                      ) : noteAlign === "justify" ? (
                        <AlignJustify className="size-3.5" />
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
                    {noteAlignItems.map((item) => (
                      <button
                        key={item.align}
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          runNoteAlign(item.align);
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
            <div className="relative min-h-[220px] flex-1">
              {!notePlainText(note).trim() && (
                <span className="pointer-events-none absolute left-0 top-3 text-body-large leading-6 text-on-warning-container/60">
                  Write a quick note...
                </span>
              )}
              <div
              ref={noteTextareaRef}
              contentEditable
              suppressContentEditableWarning
              onInput={() => {
                rememberNoteSelection();
                syncNoteFromEditor();
              }}
              onKeyDown={handleNoteKeyDown}
              onMouseUp={() => {
                rememberNoteSelection();
                syncNoteFromEditor();
              }}
              onKeyUp={() => {
                rememberNoteSelection();
                syncNoteFromEditor();
              }}
              onFocus={rememberNoteSelection}
              className="min-h-[220px] w-full whitespace-pre-wrap break-words border-0 bg-transparent py-3 leading-6 text-body-large font-medium text-on-warning-container outline-none [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
              style={noteTextStyle}
              role="textbox"
              aria-label="Pinned note"
              />
            </div>
          </div>

          <div className="flex min-h-[260px] flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface-container p-3">
            <div className="mb-2 flex items-center gap-2">
              <Pin className="size-4 text-on-surface-variant" />
              <p className="text-label-medium uppercase tracking-[0.08em] text-on-surface-variant">
                Saved notes
              </p>
            </div>
            {pinnedNotes.length === 0 ? (
              <div className="min-h-[140px]" aria-hidden="true" />
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
          <div className="mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <CalendarDays className="size-4 text-primary" />
            <h3 className="text-title-medium text-on-surface">Reminder Board</h3>
            <span className="text-body-small leading-5 text-on-surface-variant">
              Mark dates in the calendar tool and your reminders will appear here.
            </span>
          </div>

          <div className="fl-scroll h-[132px] min-h-24 space-y-2 overflow-y-auto pr-1">
            {reminderRows.length === 0 ? (
              <div className="min-h-24" aria-hidden="true" />
            ) : (
              reminderRows.map((reminder) => {
                const tone = reminderTone(reminder.dueDate);
                return (
                  <div
                    key={`${reminder.kind}-${reminder.id}`}
                    className="rounded-md border border-outline-variant bg-surface-container-low px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="mb-1 flex items-center gap-2">
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
                      <p className="line-clamp-1 text-body-medium font-semibold leading-5 text-on-surface">
                        {reminder.title}
                      </p>
                      {reminder.kind === "task" && (
                        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-variant">
                          <div
                            className="h-full rounded-full bg-primary transition-[width] duration-[var(--duration-medium)] [transition-timing-function:var(--ease-standard)]"
                            style={{ width: `${reminder.progress}%` }}
                          />
                        </div>
                      )}
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
      if (selectedProjectId === null || selectedProjectId !== project.id) {
        setSelectedProjectId(project.id);
      }
    },
    [panelMode, editingTask, selectedProjectId, setSelectedProjectId, requireAccount]
  );

  const handleCreateProject = useCallback(async (name: string) => {
    if (!requireAccount("Sign in to save project folders.")) {
      return;
    }
    const project = await findOrCreateProject(name);
    setSelectedProjectId(project.id);
    setInitialProjectName(project.name);
    setEditingTask(null);
    toast.success("Project created", { description: project.name });
  }, [requireAccount, setSelectedProjectId]);

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
    if (selectedProjectId === id) {
      setInitialProjectName(project.name);
    }
    toast.success("Project renamed", { description: project.name });
  }, [selectedProjectId]);

  const handleArchiveProject = useCallback(async (id: string) => {
    const project = await archiveProject(id);
    if (!project) return;
    if (selectedProjectId === id) {
      setSelectedProjectId(null);
      setInitialProjectName("");
    }
    toast.success("Project archived", { description: project.name });
  }, [selectedProjectId, setSelectedProjectId]);

  const handleRestoreProject = useCallback(async (project: Project) => {
    const restored = await restoreProject(project.id);
    if (!restored) return;
    toast.success("Project restored", { description: restored.name });
  }, []);

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

  if (account.status !== "signed-in") {
    return <SignInLanding account={account} />;
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
        account={account}
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
        onArchiveProject={handleArchiveProject}
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
