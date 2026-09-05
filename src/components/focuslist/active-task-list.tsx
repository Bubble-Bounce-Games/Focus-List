"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ClipboardList, SearchX } from "lucide-react";
import type { DetailField, Project, Tag, Task } from "@/lib/focuslist/types";
import { TaskRow } from "./task-row";
import { EmptyState } from "./empty-state";
import { Button } from "@/components/ui/button";

type ActiveTaskListProps = {
  tasks: Task[];
  projects: Record<string, Project>;
  tags: Record<string, Tag>;
  isFiltered: boolean;
  hasProjects: boolean;
  onProgressChange: (id: string, value: number) => void;
  onProgressCommit: (id: string, value: number) => void;
  onEdit: (task: Task) => void;
  onDuplicate: (id: string) => void;
  onComplete: (id: string) => void;
  onDelete: (task: Task) => void;
  onDetailSave: (id: string, field: DetailField, value: string) => void;
  onAddTask: () => void;
};

export function ActiveTaskList({
  tasks,
  projects,
  tags,
  isFiltered,
  hasProjects,
  onProgressChange,
  onProgressCommit,
  onEdit,
  onDuplicate,
  onComplete,
  onDelete,
  onDetailSave,
  onAddTask,
}: ActiveTaskListProps) {
  if (tasks.length === 0) {
    if (isFiltered) {
      return (
        <EmptyState
          icon={<SearchX className="h-5 w-5" />}
          title="No tasks match the current filters."
          description="Try adjusting your search or tag filter."
        />
      );
    }
    return (
      <EmptyState
        icon={<ClipboardList className="h-5 w-5" />}
        title={hasProjects ? "Add your task." : "Add your first task."}
        description={
          hasProjects
            ? "New tasks will appear here."
            : "Choose or create a project while adding it."
        }
        action={
          <Button size="sm" onClick={onAddTask}>
            Add Task
          </Button>
        }
      />
    );
  }

  return (
    <div className="fl-scroll h-full overflow-y-auto pr-1">
      <div className="flex flex-col gap-1 pb-1">
        <AnimatePresence initial={false}>
          {tasks.map((task) => (
            <motion.div key={task.id} layout>
              <TaskRow
                task={task}
                project={projects[task.projectId]}
                tag={tags[task.tagId]}
                onProgressChange={onProgressChange}
                onProgressCommit={onProgressCommit}
                onEdit={onEdit}
                onDuplicate={onDuplicate}
                onComplete={onComplete}
                onDelete={onDelete}
                onDetailSave={onDetailSave}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
