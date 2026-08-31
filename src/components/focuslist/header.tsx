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
  CalendarDays,
  Check,
  ChevronDown,
  Plus,
  Search,
} from "lucide-react";
import { SORT_OPTIONS, type SortKey } from "@/lib/focuslist/types";
import { cn } from "@/lib/utils";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const logoPath = `${basePath}/brand/focus-list-mark.png`;

type HeaderProps = {
  search: string;
  onSearchChange: (value: string) => void;
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
  onAddTask: () => void;
  userEmail?: string;
  onSignOut?: () => void;
  onOpenTool?: (view: "calendar" | "archive" | "trash") => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
};

export function Header({
  search,
  onSearchChange,
  sort,
  onSortChange,
  onAddTask,
  userEmail,
  onSignOut,
  onOpenTool,
  searchInputRef,
}: HeaderProps) {
  const currentLabel =
    SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "Sort by Progress %";
  const isAsc = sort === "progress-asc";

  return (
    <header className="flex min-h-16 shrink-0 flex-wrap items-center gap-2 border-b border-outline-variant bg-background px-4 py-2 sm:h-16 sm:flex-nowrap sm:gap-4 sm:px-6 xl:px-10 sm:py-0">
      {/* Logo + title */}
      <div className="flex items-center gap-2">
        <img
          src={logoPath}
          alt=""
          className="h-9 w-9 object-contain"
          aria-hidden
        />
        <span className="text-title-large font-semibold text-on-surface">
          Focus List
        </span>
      </div>

      {/* Search — MD3 outlined text field look (matches the shadcn Input style) */}
      <div className="relative order-3 min-w-0 basis-full sm:order-none sm:flex-1 sm:basis-auto sm:max-w-[520px]">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
        <input
          ref={searchInputRef}
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search tasks..."
          aria-label="Search tasks"
          className="h-10 w-full rounded-md border-2 border-outline-variant bg-surface-variant px-3.5 pl-10 pr-16 text-sm text-on-surface outline-none transition-[color,box-shadow,border-color] duration-[var(--duration-short)] [transition-timing-function:var(--ease-standard)] placeholder:text-on-surface-variant focus-visible:border-primary focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary/40"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-sm border border-outline-variant bg-surface-container-high px-1.5 py-0.5 text-[11px] font-medium text-on-surface-variant">
          ⌘ K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        {/* Sort dropdown — MD3 outlined button (hidden on mobile) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              aria-label="Sort tasks"
              className="hidden h-10 gap-2 px-3.5 text-sm font-medium sm:inline-flex"
            >
              {isAsc ? (
                <ArrowUpWideNarrow className="h-4 w-4 text-on-surface-variant" />
              ) : (
                <ArrowDownWideNarrow className="h-4 w-4 text-on-surface-variant" />
              )}
              <span className="hidden xl:inline">Sort by Progress %</span>
              <span className="inline xl:hidden">{currentLabel.split(":")[0]}</span>
              <ChevronDown className="h-4 w-4 text-on-surface-variant" />
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
                  <Check className="h-4 w-4 text-primary" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Add Task — MD3 filled primary button (icon-only on mobile, label on sm+) */}
        <Button
          onClick={onAddTask}
          aria-label="Add task"
          className="h-10 w-10 gap-2 p-0 sm:w-[132px] sm:px-5"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Task</span>
        </Button>

        {/* Calendar — MD3 icon button */}
        <Button
          variant="ghost"
          size="icon"
          className="text-on-surface-variant hover:bg-on-surface/[0.08] hover:text-on-surface focus-visible:bg-on-surface/[0.10] active:bg-on-surface/[0.12]"
          aria-label="Task calendar"
          onClick={() => onOpenTool?.("calendar")}
        >
          <CalendarDays className="h-5 w-5" />
        </Button>

        {/* Account avatar — MD3 avatar with primary-container tonal */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex size-10 items-center justify-center rounded-full bg-primary-container text-label-large font-semibold text-on-primary-container",
                "transition-[background-color] duration-[var(--duration-short)] [transition-timing-function:var(--ease-standard)]",
                "hover:bg-on-primary-container/[0.08] focus-visible:bg-on-primary-container/[0.10] active:bg-on-primary-container/[0.12]",
                "outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              )}
              aria-label="Account settings"
            >
              {(userEmail?.[0] ?? "A").toUpperCase()}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="font-normal">
              <span className="block text-xs text-on-surface-variant">Signed in as</span>
              <span className="block truncate text-sm text-on-surface">{userEmail}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="px-3 py-2 text-xs leading-5 text-on-surface-variant">
              <span className="block font-medium text-on-surface">Personal workspace</span>
              <span className="block">Cloud sync is active across your devices.</span>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onOpenTool?.("archive")}>Archive</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onOpenTool?.("trash")}>Deleted items</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onSignOut}>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
