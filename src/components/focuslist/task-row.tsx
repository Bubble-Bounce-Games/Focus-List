"use client";

import { memo, useCallback, useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ChevronDown } from "lucide-react";
import type { DetailField, Project, Tag, Task } from "@/lib/focuslist/types";
import { hasDetails, isBlocked } from "@/lib/focuslist/types";
import { pillStyle } from "@/lib/focuslist/palette";
import { ProgressSlider } from "./progress-slider";
import { MoreActions } from "./more-actions";
import { TaskDetailsPanel } from "./task-details-panel";

type TaskRowProps = {
  task: Task;
  project?: Project;
  tag?: Tag;
  onProgressChange: (id: string, value: number) => void;
  onProgressCommit: (id: string, value: number) => void;
  onEdit: (task: Task) => void;
  onDuplicate: (id: string) => void;
  onComplete: (id: string) => void;
  onDelete: (task: Task) => void;
  onDetailSave: (id: string, field: DetailField, value: string) => void;
};

function TaskRowBase({
  task,
  project,
  tag,
  onProgressChange,
  onProgressCommit,
  onEdit,
  onDuplicate,
  onComplete,
  onDelete,
  onDetailSave,
}: TaskRowProps) {
  const [justCompleted, setJustCompleted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();

  const accent = project?.color ?? "var(--md-primary)";
  const blocked = isBlocked(task);
  const annotated = hasDetails(task);

  const handleCommit = (value: number) => {
    onProgressCommit(task.id, value);
    if (value >= 100) {
      setJustCompleted(true);
      // Brief green flash before the row leaves Active Tasks.
      window.setTimeout(() => setJustCompleted(false), 600);
    }
  };

  const handleDetailSave = useCallback(
    (field: DetailField, value: string) => onDetailSave(task.id, field, value),
    [onDetailSave, task.id]
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, transition: { duration: 0.25 } }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className={`group relative flex flex-col overflow-hidden rounded-lg border bg-card transition-[background-color,border-color] duration-[var(--duration-short)] [transition-timing-function:var(--ease-standard)] hover:border-outline-variant hover:bg-on-surface/[0.04] ${justCompleted ? "border-success bg-success-container/[0.14]" : "border-outline-variant"}`}
    >
      <div className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2 px-3 py-2.5 sm:grid-cols-[28px_minmax(0,1fr)_minmax(132px,180px)_32px] sm:gap-x-3 sm:px-4">
        {/* 0. Expand toggle — points right when closed, down when open */}
        <button
          type="button"
          onClick={() => setExpanded((o) => !o)}
          aria-expanded={expanded}
          aria-controls={panelId}
          aria-label={
            expanded
              ? `Hide details for ${task.title}`
              : `Show details for ${task.title}`
          }
          className="col-start-1 row-start-1 flex size-7 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors duration-[var(--duration-short)] [transition-timing-function:var(--ease-standard)] hover:bg-on-surface/[0.08] hover:text-on-surface focus-visible:bg-on-surface/[0.10] active:bg-on-surface/[0.12] focus-visible:outline-none sm:col-auto sm:row-auto"
        >
          <motion.span
            animate={{ rotate: expanded ? 0 : -90 }}
            transition={{ duration: 0.18 }}
            className="flex"
          >
            <ChevronDown className="h-4 w-4" />
          </motion.span>
        </button>

        {/* 1. Task title and labels */}
        <div className="col-start-2 row-start-1 min-w-0">
          <div className="flex min-w-0 items-start gap-2">
            <p
              className="line-clamp-2 text-body-large font-medium leading-6 text-on-surface"
              title={task.title}
            >
              {task.title}
            </p>
            {blocked ? (
              <AlertTriangle
                className="mt-1 h-3.5 w-3.5 shrink-0 text-error"
                aria-label="Has a blocker"
              />
            ) : annotated ? (
              <span
                className="mt-2 size-1.5 shrink-0 rounded-full bg-on-surface-variant"
                aria-label="Has details"
              />
            ) : null}
          </div>
          {(project || tag) && (
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
              {project && (
                <span
                  className="inline-flex max-w-full items-center truncate rounded-full px-2 py-0.5 text-label-small"
                  style={pillStyle(project.color)}
                >
                  {project.name}
                </span>
              )}
              {tag && (
                <span
                  className="inline-flex max-w-full items-center truncate rounded-full px-2 py-0.5 text-label-small"
                  style={pillStyle(tag.color)}
                >
                  {tag.name}
                </span>
              )}
            </div>
          )}
        </div>

        {/* 2. Progress slider */}
        <div className="col-span-2 col-start-2 row-start-2 flex min-w-0 flex-col gap-1 sm:col-span-1 sm:col-start-3 sm:row-start-1">
          <ProgressSlider
            value={task.progress}
            accent={accent}
            onChange={(v) => onProgressChange(task.id, v)}
            onCommit={handleCommit}
            ariaLabel={`Progress for ${task.title}`}
          />
          <div className="flex h-4 items-center justify-end">
            <AnimatePresence mode="wait" initial={false}>
              {justCompleted ? (
                <motion.span
                  key="done"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-label-small font-bold text-success"
                >
                  100%
                </motion.span>
              ) : (
                <motion.span
                  key="pct"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-label-small font-bold tabular-nums text-on-surface-variant"
                  style={{ color: accent }}
                >
                  {task.progress}%
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* 3. More actions */}
        <div className="col-start-3 row-start-1 flex justify-end sm:col-start-4">
          <MoreActions
            onEdit={() => onEdit(task)}
            onDuplicate={() => onDuplicate(task.id)}
            onComplete={() => onComplete(task.id)}
            onDelete={() => onDelete(task)}
            label={`Actions for ${task.title}`}
          />
        </div>

        {/* 4. Screen-reader detail state */}
        <div className="sr-only">
          <p
            aria-live="polite"
          >
            {blocked ? "This task has a blocker." : annotated ? "This task has details." : ""}
          </p>
        </div>
      </div>

      {/* 8. Detail panel: progress log, blocker, notes */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id={panelId}
            key="details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
            className="overflow-hidden"
          >
            <TaskDetailsPanel task={task} onSave={handleDetailSave} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export const TaskRow = memo(TaskRowBase);
