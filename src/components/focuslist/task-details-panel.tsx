"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ListChecks,
  StickyNote,
  type LucideIcon,
} from "lucide-react";

import type { DetailField, Task } from "@/lib/focuslist/types";

// Typing writes straight to IndexedDB after a short pause. There is no save
// button, so each row reports its own state instead.
const SAVE_DELAY_MS = 400;
const SAVED_FLASH_MS = 1600;

type FieldSpec = {
  field: DetailField;
  label: string;
  placeholder: string;
  icon: LucideIcon;
  tone: string;
};

const FIELDS: readonly FieldSpec[] = [
  {
    field: "progressNote",
    label: "Progress",
    placeholder: "What has moved since last time?",
    icon: ListChecks,
    tone: "#6252e8",
  },
  {
    field: "blocker",
    label: "Blocker",
    placeholder: "What is standing in the way?",
    icon: AlertTriangle,
    tone: "#e5484d",
  },
  {
    field: "notes",
    label: "Notes",
    placeholder: "Anything else worth remembering.",
    icon: StickyNote,
    tone: "#7a8194",
  },
];

type TaskDetailsPanelProps = {
  task: Task;
  onSave: (field: DetailField, value: string) => void;
};

export function TaskDetailsPanel({ task, onSave }: TaskDetailsPanelProps) {
  return (
    <div className="fl-scroll max-h-[248px] overflow-y-auto border-t border-border bg-app/70 px-3 sm:px-4">
      <div className="divide-y divide-border/70">
        {FIELDS.map((spec) => (
          <DetailRow
            key={spec.field}
            spec={spec}
            initialValue={task[spec.field] ?? ""}
            onSave={onSave}
          />
        ))}
      </div>
    </div>
  );
}

type DetailRowProps = {
  spec: FieldSpec;
  initialValue: string;
  onSave: (field: DetailField, value: string) => void;
};

function DetailRow({ spec, initialValue, onSave }: DetailRowProps) {
  const [draft, setDraft] = useState(initialValue);
  const [status, setStatus] = useState<"idle" | "pending" | "saved">("idle");

  const saveTimer = useRef<number | null>(null);
  const flashTimer = useRef<number | null>(null);
  const unsaved = useRef<string | null>(null);
  const alive = useRef(true);

  // Latest callback without making `commit` change identity on every render.
  const saveRef = useRef(onSave);
  useEffect(() => {
    saveRef.current = onSave;
  });

  const commit = useCallback(() => {
    if (saveTimer.current !== null) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    if (unsaved.current === null) return;

    saveRef.current(spec.field, unsaved.current);
    unsaved.current = null;

    if (!alive.current) return;
    setStatus("saved");
    if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => {
      if (alive.current) setStatus("idle");
    }, SAVED_FLASH_MS);
  }, [spec.field]);

  // Collapsing the panel unmounts this row mid-debounce; flush so the last
  // keystrokes are never lost.
  useEffect(() => {
    return () => {
      alive.current = false;
      if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
      commit();
    };
  }, [commit]);

  function handleChange(next: string) {
    setDraft(next);
    unsaved.current = next;
    setStatus("pending");
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(commit, SAVE_DELAY_MS);
  }

  const Icon = spec.icon;

  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="flex w-[92px] shrink-0 items-center gap-1.5 pt-1.5">
        <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: spec.tone }} />
        <span
          className="text-xs font-semibold"
          style={{ color: spec.tone }}
        >
          {spec.label}
        </span>
      </div>

      <textarea
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={commit}
        rows={2}
        placeholder={spec.placeholder}
        aria-label={spec.label}
        className="min-w-0 flex-1 resize-none rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm leading-relaxed text-foreground-strong outline-none transition-colors placeholder:text-muted-foreground hover:border-border focus:border-[#6252e8] focus:bg-card"
      />

      <span
        aria-live="polite"
        className="w-11 shrink-0 pt-2 text-right text-[11px] tabular-nums text-muted-foreground"
      >
        {status === "saved" ? "Saved" : status === "pending" ? "…" : ""}
      </span>
    </div>
  );
}
