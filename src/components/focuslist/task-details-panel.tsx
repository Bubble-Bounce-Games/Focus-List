"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ListChecks,
  StickyNote,
  type LucideIcon,
} from "lucide-react";

import type { DetailField, Task } from "@/lib/focuslist/types";
import { Textarea } from "@/components/ui/textarea";

// Typing writes straight to Supabase after a short pause. There is no save
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
    tone: "var(--md-primary)",
  },
  {
    field: "blocker",
    label: "Blocker",
    placeholder: "What is standing in the way?",
    icon: AlertTriangle,
    tone: "var(--md-error)",
  },
  {
    field: "notes",
    label: "Notes",
    placeholder: "Anything else worth remembering.",
    icon: StickyNote,
    tone: "var(--md-on-surface-variant)",
  },
];

type TaskDetailsPanelProps = {
  task: Task;
  onSave: (field: DetailField, value: string) => void;
};

export function TaskDetailsPanel({ task, onSave }: TaskDetailsPanelProps) {
  return (
    <div className="fl-scroll max-h-[248px] overflow-y-auto border-t border-outline-variant bg-surface-container-low px-3 sm:px-4">
      <div className="divide-y divide-outline-variant/70">
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
          className="text-label-medium font-medium"
          style={{ color: spec.tone }}
        >
          {spec.label}
        </span>
      </div>

      <Textarea
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={commit}
        rows={2}
        placeholder={spec.placeholder}
        aria-label={spec.label}
        className="min-h-0 flex-1 resize-none border-2 border-transparent bg-transparent px-2 py-1.5 text-body-medium leading-relaxed text-on-surface shadow-none outline-none transition-colors duration-[var(--duration-short)] [transition-timing-function:var(--ease-standard)] placeholder:text-on-surface-variant hover:border-outline-variant focus-visible:border-primary focus-visible:bg-surface-container-lowest focus-visible:ring-2 focus-visible:ring-primary/40"
      />

      <span
        aria-live="polite"
        className="w-11 shrink-0 pt-2 text-right text-label-small tabular-nums text-on-surface-variant"
      >
        {status === "saved" ? "Saved" : status === "pending" ? "…" : ""}
      </span>
    </div>
  );
}
