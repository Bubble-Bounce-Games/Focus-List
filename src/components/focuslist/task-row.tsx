"use client";

import { memo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import type { Project, Tag, Task } from "@/lib/focuslist/types";
import { iconTileStyle, pillStyle } from "@/lib/focuslist/palette";
import { TaskIcon } from "./icons";
import { ProgressSlider } from "./progress-slider";
import { MoreActions } from "./more-actions";

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
}: TaskRowProps) {
  const [justCompleted, setJustCompleted] = useState(false);
  const accent = project?.color ?? "#6252e8";
  const iconName = project?.name ?? tag?.name ?? task.title;

  const handleCommit = (value: number) => {
    onProgressCommit(task.id, value);
    if (value >= 100) {
      setJustCompleted(true);
      // Brief green flash before the row leaves Active Tasks.
      window.setTimeout(() => setJustCompleted(false), 600);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, transition: { duration: 0.25 } }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className="group relative flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5 shadow-[0_1px_2px_rgba(23,26,43,0.04)] transition-colors hover:border-[#d7dae6] hover:shadow-[0_4px_14px_rgba(23,26,43,0.06)] sm:px-4"
      style={
        justCompleted
          ? { borderColor: "color-mix(in srgb, #42a65a 60%, #ffffff)" }
          : undefined
      }
    >
      {/* 1. Task icon */}
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        style={iconTileStyle(accent)}
        aria-hidden
      >
        <TaskIcon name={iconName} className="h-5 w-5" strokeWidth={2} />
      </div>

      {/* 2. Task title */}
      <div className="min-w-0 w-[180px] xl:w-[220px] shrink-0">
        <p
          className="truncate text-[15px] font-semibold text-foreground-strong"
          title={task.title}
        >
          {task.title}
        </p>
      </div>

      {/* 3. Project pill */}
      {project && (
        <span
          className="hidden md:inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium"
          style={pillStyle(project.color)}
        >
          {project.name}
        </span>
      )}

      {/* 4. Tag pill */}
      {tag && (
        <span
          className="hidden lg:inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium"
          style={pillStyle(tag.color)}
        >
          {tag.name}
        </span>
      )}

      {/* 5. Progress slider */}
      <div className="flex min-w-0 flex-1 items-center">
        <ProgressSlider
          value={task.progress}
          accent={accent}
          onChange={(v) => onProgressChange(task.id, v)}
          onCommit={handleCommit}
          ariaLabel={`Progress for ${task.title}`}
        />
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
    </motion.div>
  );
}

export const TaskRow = memo(TaskRowBase);
