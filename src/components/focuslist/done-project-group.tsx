"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, FolderOpen } from "lucide-react";
import type { Project, Tag, Task } from "@/lib/focuslist/types";
import { pillStyle } from "@/lib/focuslist/palette";
import { MoreActions } from "./more-actions";

type DoneProjectGroupProps = {
  project: Project;
  tasks: Task[];
  tags: Record<string, Tag>;
  defaultOpen?: boolean;
  onEdit: (task: Task) => void;
  onDuplicate: (id: string) => void;
  onDelete: (task: Task) => void;
};

function formatCompleted(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function DoneProjectGroup({
  project,
  tasks,
  tags,
  defaultOpen = true,
  onEdit,
  onDuplicate,
  onDelete,
}: DoneProjectGroupProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-border bg-card/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-secondary/60"
      >
        <motion.span
          animate={{ rotate: open ? 0 : -90 }}
          transition={{ duration: 0.18 }}
          className="text-muted-foreground"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.span>
        <FolderOpen className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground-strong">
          {project.name}
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-xs font-semibold"
          style={{
            backgroundColor: "color-mix(in srgb, #42a65a 14%, #ffffff)",
            color: "#2f7a45",
          }}
        >
          {tasks.length}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-1 px-2.5 pb-2.5">
              {tasks.map((task) => {
                const tag = tags[task.tagId];
                return (
                  <div
                    key={task.id}
                    className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-secondary/60"
                  >
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white"
                      style={{ backgroundColor: "#42a65a" }}
                      aria-hidden
                    >
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <p
                      className="min-w-0 flex-1 truncate text-sm text-muted-foreground line-through decoration-muted-foreground/40"
                      title={task.title}
                    >
                      {task.title}
                    </p>
                    {tag && (
                      <span
                        className="hidden shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium md:inline-flex"
                        style={pillStyle(tag.color)}
                      >
                        {tag.name}
                      </span>
                    )}
                    <span className="shrink-0 text-xs font-bold tabular-nums text-[#42a65a]">
                      100%
                    </span>
                    {task.completedAt && (
                      <span className="hidden w-12 shrink-0 text-right text-xs text-muted-foreground lg:inline">
                        {formatCompleted(task.completedAt)}
                      </span>
                    )}
                    <MoreActions
                      isComplete
                      onEdit={() => onEdit(task)}
                      onDuplicate={() => onDuplicate(task.id)}
                      onComplete={() => onEdit(task)}
                      onDelete={() => onDelete(task)}
                      label={`Actions for ${task.title}`}
                    />
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
