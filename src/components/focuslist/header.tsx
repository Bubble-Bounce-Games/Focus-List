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
  CalendarDays,
  Check,
  ChevronDown,
  Plus,
  Search,
} from "lucide-react";
import { SORT_OPTIONS, type SortKey } from "@/lib/focuslist/types";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const faviconPath = `${basePath}/Favicon.png`;

type HeaderProps = {
  search: string;
  onSearchChange: (value: string) => void;
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
  onAddTask: () => void;
  userEmail?: string;
  onSignOut?: () => void;
  onOpenTool?: (view: "calendar" | "notifications" | "archive" | "trash") => void;
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
    <header className="flex min-h-16 shrink-0 flex-wrap items-center gap-3 border-b border-border bg-card px-4 py-3 sm:h-16 sm:flex-nowrap sm:gap-6 sm:px-6 xl:px-10 sm:py-0">
      {/* Logo + title */}
      <div className="flex items-center gap-3">
        <img
          src={faviconPath}
          alt=""
          className="h-9 w-9 object-contain"
          aria-hidden
        />
        <span className="text-lg font-semibold text-foreground-strong">
          Focus List
        </span>
      </div>

      {/* Search */}
      <div className="relative order-3 min-w-0 basis-full sm:order-none sm:flex-1 sm:basis-auto sm:max-w-[520px]">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={searchInputRef}
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search tasks..."
          aria-label="Search tasks"
          className="h-10 w-full border-0 border-b-2 border-[#8d8d8d] bg-[#f4f4f4] pl-10 pr-16 text-sm text-foreground-strong outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-card"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 border border-border bg-card px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
          ⌘ K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        {/* Sort dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              aria-label="Sort tasks"
              className="hidden h-10 gap-2 rounded-none border-border bg-card px-3.5 text-sm font-medium text-foreground-strong hover:bg-secondary sm:inline-flex"
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
          onClick={onAddTask}
          className="h-10 w-10 gap-2 rounded-none bg-primary text-sm font-semibold text-white shadow-none hover:bg-[#0353e9] sm:w-[132px]"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Task</span>
        </Button>

        {/* Notification bell (decorative, local-only) */}
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-none border-border bg-card text-muted-foreground hover:bg-secondary"
          aria-label="Task calendar"
          onClick={() => onOpenTool?.("calendar")}
        >
          <CalendarDays className="h-5 w-5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-none border-border bg-card text-muted-foreground hover:bg-secondary"
          aria-label="Notifications"
          onClick={() => onOpenTool?.("notifications")}
        >
          <Bell className="h-5 w-5" />
        </Button>

        {/* Local profile badge */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex h-10 w-10 items-center justify-center bg-[#d0e2ff] text-sm font-semibold text-[#0043ce]"
              aria-label="Account settings"
            >
              {(userEmail?.[0] ?? "A").toUpperCase()}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="font-normal">
              <span className="block text-xs text-muted-foreground">Signed in as</span>
              <span className="block truncate text-sm text-foreground-strong">{userEmail}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="px-2 py-2 text-xs leading-5 text-muted-foreground">
              <span className="block font-medium text-foreground-strong">Personal workspace</span>
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
