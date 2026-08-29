"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Copy,
  MoreHorizontal,
  Pencil,
  Check,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type MoreActionsProps = {
  onEdit: () => void;
  onDuplicate: () => void;
  onComplete: () => void;
  onDelete: () => void;
  isComplete?: boolean;
  label?: string;
};

export function MoreActions({
  onEdit,
  onDuplicate,
  onComplete,
  onDelete,
  isComplete,
  label = "Task actions",
}: MoreActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-full text-on-surface-variant hover:bg-on-surface/[0.08] hover:text-on-surface focus-visible:bg-on-surface/[0.10] active:bg-on-surface/[0.12] shrink-0"
          aria-label={label}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit task
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onDuplicate}>
          <Copy className="mr-2 h-4 w-4" />
          Duplicate task
        </DropdownMenuItem>
        {!isComplete && (
          <DropdownMenuItem onSelect={onComplete}>
            <Check className="mr-2 h-4 w-4" />
            Mark as complete
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={onDelete}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete task
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
