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
    // No scroll container here on purpose. Each field owns its own scrollbar,
    // so reaching the bottom of one never carries on into the next.
    <div className="border-t border-border bg-app/70 px-3 sm:px-4">
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
    // Label above the field, not beside it, so each section reads as one
    // vertical block and the text gets the full width of the panel.
    <div className="flex flex-col gap-1.5 py-3">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: spec.tone }} />
        <span className="text-xs font-semibold" style={{ color: spec.tone }}>
          {spec.label}
        </span>
        <span
          aria-live="polite"
          className="ml-auto text-[11px] tabular-nums text-muted-foreground"
        >
          {status === "saved" ? "Saved" : status === "pending" ? "…" : ""}
        </span>
      </div>

      {/* A fixed height plus overflow-y makes the textarea scroll its own
          content. That is what keeps the three fields independent: there is no
          shared scroll container for a gesture to escape into. */}
      <textarea
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={commit}
        placeholder={spec.placeholder}
        aria-label={spec.label}
        className="fl-scroll h-[84px] w-full resize-none overflow-y-auto rounded-lg border border-border bg-card px-2.5 py-2 text-sm leading-relaxed text-foreground-strong outline-none transition-colors placeholder:text-muted-foreground focus:border-[#6252e8]"
      />
    </div>
  );
}
