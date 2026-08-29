"use client";

import { CheckCircle2, ClipboardCheck } from "lucide-react";
import type { Project, Tag, Task } from "@/lib/focuslist/types";
import type { DoneGroup } from "@/lib/focuslist/selectors";
import { DoneProjectGroup } from "./done-project-group";
import { EmptyState } from "./empty-state";
import { Badge } from "@/components/ui/badge";

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
      <div className="flex items-center gap-2.5 py-3">
        <CheckCircle2 className="h-5 w-5 text-success" />
        <h2 className="text-title-medium text-on-surface">Completed Tasks</h2>
        <Badge variant="success" className="tabular-nums">
          {totalCount}
        </Badge>
      </div>

      {/* Body */}
      <div className="fl-scroll min-h-0 flex-1 overflow-y-auto pb-4">
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
