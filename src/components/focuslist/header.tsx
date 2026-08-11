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
import {
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  Bell,
  Check,
  ChevronDown,
  Plus,
  Search,
} from "lucide-react";
import { SORT_OPTIONS, type SortKey } from "@/lib/focuslist/types";

type HeaderProps = {
  search: string;
  onSearchChange: (value: string) => void;
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
  onAddTask: () => void;
  onAddProject: () => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
};

export function Header({
  search,
  onSearchChange,
  sort,
  onSortChange,
  onAddTask,
  onAddProject,
  searchInputRef,
}: HeaderProps) {
  const currentLabel =
    SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "Sort by Progress %";
  const isAsc = sort === "progress-asc";

  return (
    <header className="flex h-[86px] shrink-0 items-center gap-4 border-b border-border bg-card px-6 xl:px-10">
      {/* Logo + title */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full text-white shadow-sm"
          style={{ backgroundColor: "#6252e8" }}
          aria-hidden
        >
          <Check className="h-5 w-5" strokeWidth={3} />
        </div>
        <span className="text-[21px] font-bold tracking-tight text-foreground-strong">
          Focus List
        </span>
      </div>

      {/* Search */}
      <div className="relative ml-2">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={searchInputRef}
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search tasks..."
          aria-label="Search tasks"
          className="h-11 w-[320px] rounded-xl border border-border bg-[#f4f5fa] pl-10 pr-16 text-sm text-foreground-strong outline-none transition-colors placeholder:text-muted-foreground focus:border-[#c7c9d8] focus:bg-card"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-border bg-card px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
          ⌘ K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        {/* Sort dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="h-11 gap-2 rounded-xl border-border bg-card px-3.5 text-sm font-medium text-foreground-strong hover:bg-secondary"
            >
              {isAsc ? (
                <ArrowUpWideNarrow className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ArrowDownWideNarrow className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="hidden xl:inline">Sort by Progress %</span>
              <span className="inline xl:hidden">{currentLabel.split(":")[0]}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Sort tasks</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {SORT_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onSelect={() => onSortChange(option.value)}
                className="justify-between"
              >
                {option.label}
                {sort === option.value && (
                  <Check className="h-4 w-4" style={{ color: "#6252e8" }} />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Add Task */}
        <Button
          variant="outline"
          onClick={onAddProject}
          className="h-11 gap-2 rounded-xl border-border bg-card px-3.5 text-sm font-medium text-foreground-strong hover:bg-secondary"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden xl:inline">New Project</span>
        </Button>

        <Button
          onClick={onAddTask}
          className="h-11 w-[150px] gap-2 rounded-xl bg-[#6252e8] text-[15px] font-semibold text-white shadow-sm hover:bg-[#5444d6] hover:shadow"
        >
          <Plus className="h-4 w-4" />
          Add Task
        </Button>

        {/* Notification bell (decorative, local-only) */}
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 rounded-xl border-border bg-card text-muted-foreground hover:bg-secondary"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </Button>

        {/* Local profile badge */}
        <div
          className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold"
          style={{
            backgroundColor: "color-mix(in srgb, #6252e8 14%, #ffffff)",
            color: "#6252e8",
          }}
          aria-label="Local profile"
          title="Local profile"
        >
          AK
        </div>
      </div>
    </header>
  );
}
