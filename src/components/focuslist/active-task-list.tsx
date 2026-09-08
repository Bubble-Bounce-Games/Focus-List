"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ClipboardList, FolderOpen, SearchX } from "lucide-react";
import type { DetailField, Project, Tag, Task } from "@/lib/focuslist/types";
import { TaskRow } from "./task-row";
import { EmptyState } from "./empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { pillStyle } from "@/lib/focuslist/palette";

type ActiveTaskListProps = {
  tasks: Task[];
  projectFolders: Project[];
  projects: Record<string, Project>;
  tags: Record<string, Tag>;
  isFiltered: boolean;
  hasProjects: boolean;
  selectedProjectName: string | null;
  onSelectProject: (id: string) => void;
  onProgressChange: (id: string, value: number) => void;
  onProgressCommit: (id: string, value: number) => void;
  onEdit: (task: Task) => void;
  onDuplicate: (id: string) => void;
  onComplete: (id: string) => void;
  onDelete: (task: Task) => void;
  onDetailSave: (id: string, field: DetailField, value: string) => void;
  onAddTask: () => void;
  onCreateProject: () => void;
};

export function ActiveTaskList({
  tasks,
  projectFolders,
  projects,
  tags,
  isFiltered,
  hasProjects,
  selectedProjectName,
  onSelectProject,
  onProgressChange,
  onProgressCommit,
  onEdit,
  onDuplicate,
  onComplete,
  onDelete,
  onDetailSave,
  onAddTask,
  onCreateProject,
}: ActiveTaskListProps) {
  const showProjectFolders = selectedProjectName === null && !isFiltered;

  if (showProjectFolders) {
    if (projectFolders.length === 0) {
      return (
        <EmptyState
          icon={<ClipboardList className="h-5 w-5" />}
          title="Create a project and add your task."
          description="Create a folder project first, then add tasks inside it."
          action={
            <Button size="sm" onClick={onCreateProject}>
              Create Project
            </Button>
          }
        />
      );
    }

    const taskCounts = tasks.reduce<Record<string, number>>((counts, task) => {
      counts[task.projectId] = (counts[task.projectId] ?? 0) + 1;
      return counts;
    }, {});

    return (
      <div className="fl-scroll h-full overflow-y-auto pr-1">
        <div className="grid grid-cols-1 gap-2 pb-3 sm:grid-cols-2 xl:grid-cols-3">
          {projectFolders.map((project) => {
            const taskCount = taskCounts[project.id] ?? 0;
            return (
              <button
                key={project.id}
                type="button"
                onClick={() => onSelectProject(project.id)}
                className="flex min-h-24 min-w-0 flex-col justify-between rounded-md border border-outline-variant bg-surface-container-lowest p-3 text-left shadow-e0 transition-[background-color,border-color,box-shadow] duration-[var(--duration-short)] [transition-timing-function:var(--ease-standard)] hover:border-primary hover:bg-primary-container/25 hover:shadow-e1 focus-visible:border-primary focus-visible:bg-primary-container/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 active:bg-primary-container/40"
              >
                <span className="flex min-w-0 items-start gap-2">
                  <FolderOpen className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span
                    className="min-w-0 truncate rounded-full px-2 py-0.5 text-label-medium"
                    style={pillStyle(project.color)}
                  >
                    {project.name}
                  </span>
                </span>
                <span className="mt-4 flex items-center justify-between gap-2">
                  <span className="text-body-small text-on-surface-variant">
                    Active tasks
                  </span>
                  <Badge variant={taskCount > 0 ? "default" : "secondary"}>
                    {taskCount}
                  </Badge>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

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
        title={hasProjects ? "Add your task." : "Create a project and add your task."}
        description={
          selectedProjectName
            ? `Tasks for ${selectedProjectName} will appear here.`
            : "Create a folder project first, then add tasks inside it."
        }
        action={
          <Button size="sm" onClick={hasProjects ? onAddTask : onCreateProject}>
            {hasProjects ? "Add Task" : "Create Project"}
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
