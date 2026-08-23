"use client";

import { CheckCircle2, ClipboardCheck } from "lucide-react";
import type { Project, Tag, Task } from "@/lib/focuslist/types";
import type { DoneGroup } from "@/lib/focuslist/selectors";
import { DoneProjectGroup } from "./done-project-group";
import { EmptyState } from "./empty-state";

type DoneSectionProps = {
  groups: DoneGroup[];
  totalCount: number;
  tags: Record<string, Tag>;
  isFiltered: boolean;
  onEdit: (task: Task) => void;
  onDuplicate: (id: string) => void;
  onDelete: (task: Task) => void;
};

export function DoneSection({
  groups,
  totalCount,
  tags,
  isFiltered,
  onEdit,
  onDuplicate,
  onDelete,
}: DoneSectionProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      {/* Heading */}
      <div className="flex items-center gap-2.5 px-6 pb-2.5 pt-3 xl:px-10">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: "#42a65a" }}
          aria-hidden
        >
          <CheckCircle2 className="h-4 w-4" />
        </span>
        <h2 className="text-base font-bold text-foreground-strong">Completed Tasks</h2>
        <p className="hidden text-sm text-muted-foreground sm:inline">
          Completed tasks are grouped by project and tag.
        </p>
        <span className="ml-auto rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground">
          {totalCount} completed
        </span>
      </div>

      {/* Body */}
      <div className="fl-scroll min-h-0 flex-1 overflow-y-auto px-6 pb-4 xl:px-10">
        {groups.length === 0 ? (
          <EmptyState
            compact
            icon={<ClipboardCheck className="h-5 w-5" />}
            title={
              isFiltered
                ? "No completed tasks match the current filters."
                : "Completed tasks will appear here."
            }
          />
        ) : (
          <div className="flex flex-col gap-2">
            {groups.map((group) => (
              <DoneProjectGroup
                key={group.project.id}
                project={group.project}
                tasks={group.tasks}
                tags={tags}
                onEdit={onEdit}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
