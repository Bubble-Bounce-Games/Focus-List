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

  const accent = project?.color ?? "#6252e8";
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
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(23,26,43,0.04)] transition-colors hover:border-[#d7dae6] hover:shadow-[0_4px_14px_rgba(23,26,43,0.06)]"
      style={
        justCompleted
          ? { borderColor: "color-mix(in srgb, #42a65a 60%, #ffffff)" }
          : undefined
      }
    >
      <div className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
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
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground-strong"
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
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={iconTileStyle(accent)}
          aria-hidden
        >
          <TaskIcon name={iconName} className="h-5 w-5" strokeWidth={2} />
        </div>

        {/* 2. Everything between the icon and the readout. Splitting 60/40
            inside this region — rather than letting the slider be whatever is
            left over in the row — is what keeps the slider the same width on
            every row. The chevron, icon, percentage and actions are all fixed
            widths, so this region is identical for every task, and a pill
            appearing or disappearing can no longer move the track. */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {/* 2a. Title, indicators and project on top; tag underneath. */}
          <div className="flex min-w-0 shrink-0 basis-[60%] flex-col gap-1">
            <div className="flex items-center gap-2">
              <p
                className="truncate text-[15px] font-semibold text-foreground-strong"
                title={task.title}
              >
                {task.title}
              </p>
              {blocked ? (
                <AlertTriangle
                  className="h-3.5 w-3.5 shrink-0"
                  style={{ color: "#e5484d" }}
                  aria-label="Has a blocker"
                />
              ) : annotated ? (
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50"
                  aria-label="Has details"
                />
              ) : null}
              {project && (
                <span
                  className="hidden shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium md:inline-flex"
                  style={pillStyle(project.color)}
                >
                  {project.name}
                </span>
              )}
            </div>

            {/* Tag sits below the title. The row is always rendered, tag or
                not, so cards keep a uniform height down the list. */}
            <div className="flex h-[22px] min-w-0 items-center">
              {tag && (
                <span
                  className="inline-flex max-w-full shrink-0 items-center truncate rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={pillStyle(tag.color)}
                >
                  {tag.name}
                </span>
              )}
            </div>
          </div>

          {/* 2b. Progress slider — the remaining 40% of the region. */}
          <div className="flex min-w-0 flex-1 items-center">
            <ProgressSlider
              value={task.progress}
              accent={accent}
              onChange={(v) => onProgressChange(task.id, v)}
              onCommit={handleCommit}
              ariaLabel={`Progress for ${task.title}`}
            />
          </div>
        </div>

        {/* 6. Percentage value */}
        <div className="flex w-[64px] shrink-0 items-center justify-end">
          <AnimatePresence mode="wait" initial={false}>
            {justCompleted ? (
              <motion.span
                key="done"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1 text-sm font-bold"
                style={{ color: "#42a65a" }}
              >
                <Check className="h-4 w-4" /> 100%
              </motion.span>
            ) : (
              <motion.span
                key="pct"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm font-bold tabular-nums"
                style={{ color: accent }}
              >
                {task.progress}%
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* 7. More actions */}
        <MoreActions
          onEdit={() => onEdit(task)}
          onDuplicate={() => onDuplicate(task.id)}
          onComplete={() => onComplete(task.id)}
          onDelete={() => onDelete(task)}
          label={`Actions for ${task.title}`}
        />
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
            transition={{ duration: 0.22, ease: "easeInOut" }}
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
