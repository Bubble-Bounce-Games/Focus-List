"use client";

import { memo, useCallback, useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, ChevronDown } from "lucide-react";
import type { DetailField, Project, Tag, Task } from "@/lib/focuslist/types";
import { hasDetails, isBlocked } from "@/lib/focuslist/types";
import { iconTileStyle, pillStyle } from "@/lib/focuslist/palette";
import { TaskIcon } from "./icons";
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
  const iconName = project?.name ?? tag?.name ?? task.title;
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
      <div className="grid grid-cols-[28px_44px_minmax(0,1fr)] items-center gap-2 px-3 py-3 sm:flex sm:gap-3 sm:px-4 sm:py-2.5">
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

        {/* 1. Task icon */}
        <div
          className="col-start-2 row-start-1 flex size-11 shrink-0 items-center justify-center rounded-full sm:col-auto sm:row-auto"
          style={iconTileStyle(accent)}
          aria-hidden
        >
          <TaskIcon name={iconName} className="h-5 w-5" strokeWidth={2} />
        </div>

        {/* 2. Task title — occupies the first 60% of the row, ellipsised.
            Basis rather than a fixed width: the card clips its overflow, so
            when the viewport is too narrow for 60% plus the controls, the
            title must be the thing that yields rather than the actions
            button being cut off. */}
        <div className="col-start-3 row-start-1 flex min-w-0 items-center gap-2 sm:flex-1">
          <p
            className="truncate text-body-large font-medium text-on-surface"
            title={task.title}
          >
            {task.title}
          </p>
          {blocked ? (
            <AlertTriangle
              className="h-3.5 w-3.5 shrink-0 text-error"
              aria-label="Has a blocker"
            />
          ) : annotated ? (
            <span
              className="size-1.5 shrink-0 rounded-full bg-on-surface-variant"
              aria-label="Has details"
            />
          ) : null}
        </div>

        {/* 3. Project pill */}
        {project && (
          <span
            className="hidden shrink-0 items-center rounded-full px-2 py-0.5 text-label-medium sm:inline-flex"
            style={pillStyle(project.color)}
          >
            {project.name}
          </span>
        )}

        {/* 4. Tag pill */}
        {tag && (
          <span
            className="hidden shrink-0 items-center rounded-full px-2 py-0.5 text-label-medium lg:inline-flex"
            style={pillStyle(tag.color)}
          >
            {tag.name}
          </span>
        )}

        {/* 5. Progress slider */}
        <div className="col-span-2 col-start-2 row-start-3 flex w-full shrink-0 items-center sm:col-auto sm:row-auto sm:flex-1">
          <ProgressSlider
            value={task.progress}
            accent={accent}
            onChange={(v) => onProgressChange(task.id, v)}
            onCommit={handleCommit}
            ariaLabel={`Progress for ${task.title}`}
          />
        </div>

        {/* 6. Percentage value */}
        <div className="col-start-3 row-start-2 flex w-full shrink-0 items-center justify-end sm:w-[64px] sm:col-auto sm:row-auto">
          <AnimatePresence mode="wait" initial={false}>
            {justCompleted ? (
              <motion.span
                key="done"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1 text-label-large font-bold text-success"
              >
                <Check className="h-4 w-4" /> 100%
              </motion.span>
            ) : (
              <motion.span
                key="pct"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-label-large font-bold tabular-nums text-on-surface-variant"
                style={{ color: accent }}
              >
                {task.progress}%
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* 7. More actions */}
        <div className="col-start-2 row-start-2 sm:col-auto sm:row-auto">
          <MoreActions
            onEdit={() => onEdit(task)}
            onDuplicate={() => onDuplicate(task.id)}
            onComplete={() => onComplete(task.id)}
            onDelete={() => onDelete(task)}
            label={`Actions for ${task.title}`}
          />
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
