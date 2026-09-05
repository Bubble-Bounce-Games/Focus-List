"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ArrowDownWideNarrow, ArrowUpWideNarrow, Check, ChevronDown, SlidersHorizontal, Tag as TagIcon } from "lucide-react";
import type { SortKey, Tag } from "@/lib/focuslist/types";
import { pillStyle } from "@/lib/focuslist/palette";
import { cn } from "@/lib/utils";

type WorkspaceTab = "active" | "completed";

const PROGRESS_FILTER_OPTIONS: ReadonlyArray<{ value: SortKey; label: string }> = [
  { value: "progress-desc", label: "High to low" },
  { value: "progress-asc", label: "Low to high" },
];

type FilterToolbarProps = {
  tags: Tag[];
  activeTab: WorkspaceTab;
  completedCount: number;
  sort: SortKey;
  selectedTagId: string | null;
  onTabChange: (tab: WorkspaceTab) => void;
  onSortChange: (sort: SortKey) => void;
  onSelectTag: (id: string | null) => void;
};

export function FilterToolbar({
  tags,
  activeTab,
  completedCount,
  sort,
  selectedTagId,
  onTabChange,
  onSortChange,
  onSelectTag,
}: FilterToolbarProps) {
  const selectedTag = tags.find((t) => t.id === selectedTagId);
  const progressSort =
    sort === "progress-asc" || sort === "progress-desc" ? sort : "progress-desc";

  return (
    <div className="fl-scroll flex min-h-14 shrink-0 items-center gap-2 overflow-x-auto border-b border-outline-variant bg-surface px-4 py-2 sm:gap-3 sm:px-6 lg:overflow-visible xl:px-10">
      {/* Active / Completed tabs — MD3 segmented control */}
      <div className="flex h-10 shrink-0 items-center gap-1 rounded-md border border-outline-variant bg-surface-container-low px-1 py-1">
        <button
          type="button"
          onClick={() => onTabChange("active")}
          className={cn(
            "inline-flex h-8 items-center rounded-sm px-3 text-label-large transition-[background-color,color] duration-[var(--duration-short)] [transition-timing-function:var(--ease-standard)]",
            activeTab === "active"
              ? "bg-primary text-primary-foreground"
              : "text-on-surface-variant hover:bg-on-surface/[0.08] hover:text-on-surface focus-visible:bg-on-surface/[0.10] active:bg-on-surface/[0.12]",
          )}
        >
          Active
        </button>
        <button
          type="button"
          onClick={() => onTabChange("completed")}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-sm px-3 text-label-large transition-[background-color,color] duration-[var(--duration-short)] [transition-timing-function:var(--ease-standard)]",
            activeTab === "completed"
              ? "bg-secondary-container text-on-secondary-container"
              : "text-on-surface-variant hover:bg-on-surface/[0.08] hover:text-on-surface focus-visible:bg-on-surface/[0.10] active:bg-on-surface/[0.12]",
          )}
        >
          Completed
          <span
            className={cn(
              "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-label-medium tabular-nums",
              activeTab === "completed"
                ? "bg-success-container text-on-success-container"
                : "bg-surface-container-highest text-on-surface-variant",
            )}
          >
            {completedCount}
          </span>
        </button>
      </div>

      {/* Tag filter — MD3 outlined button trigger */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-10 shrink-0 gap-2 px-3 text-label-large sm:px-3.5"
          >
            <TagIcon className="h-4 w-4 text-on-surface-variant" />
            {selectedTag ? (
              <span
                className="rounded-full px-2 py-0.5 text-label-medium"
                style={pillStyle(selectedTag.color)}
              >
                {selectedTag.name}
              </span>
            ) : (
              <span>All Tags</span>
            )}
            <ChevronDown className="h-4 w-4 text-on-surface-variant" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Filter by tag</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => onSelectTag(null)}>
            All Tags
            {selectedTagId === null && (
              <Check className="ml-auto h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {tags.map((t) => (
            <DropdownMenuItem
              key={t.id}
              onSelect={() => onSelectTag(t.id)}
              className="justify-between"
            >
              <span
                className="rounded-full px-2 py-0.5 text-label-medium"
                style={pillStyle(t.color)}
              >
                {t.name}
              </span>
              {selectedTagId === t.id && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
          {tags.length === 0 && (
            <div className="px-2 py-1.5 text-xs text-on-surface-variant">
              No tags yet.
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Task sort — MD3 outlined button trigger */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-10 shrink-0 gap-2 px-3 text-label-large sm:px-3.5">
            <SlidersHorizontal className="h-4 w-4 text-on-surface-variant" />
            {progressSort === "progress-asc" ? (
              <ArrowUpWideNarrow className="h-4 w-4 text-on-surface-variant" />
            ) : (
              <ArrowDownWideNarrow className="h-4 w-4 text-on-surface-variant" />
            )}
            Filter
            <ChevronDown className="h-4 w-4 text-on-surface-variant" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Filter by progress</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {PROGRESS_FILTER_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onSelect={() => onSortChange(option.value)}
              className="justify-between"
            >
              {option.label}
              {progressSort === option.value && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
