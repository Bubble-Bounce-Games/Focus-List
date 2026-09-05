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
  CalendarDays,
  FolderArchive,
  LogOut,
  Plus,
  Search,
  UserCircle,
} from "lucide-react";
import { signOutAccount, type AccountSnapshot } from "@/lib/focuslist/browser-state";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const logoPath = `${basePath}/brand/focus-list-mark.png`;

type HeaderProps = {
  search: string;
  onSearchChange: (value: string) => void;
  onAddTask: () => void;
  onOpenTool?: (view: "calendar" | "archive" | "trash") => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  account: AccountSnapshot;
};

export function Header({
  search,
  onSearchChange,
  onAddTask,
  onOpenTool,
  searchInputRef,
  account,
}: HeaderProps) {
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`text-on-surface-variant hover:bg-on-surface/[0.08] hover:text-on-surface focus-visible:bg-on-surface/[0.10] active:bg-on-surface/[0.12] ${
                account.status === "signed-in" ? "text-primary" : ""
              }`}
              aria-label={account.status === "signed-in" ? "Account signed in" : "Account menu"}
              title={account.status === "signed-in" ? account.username ?? "Account" : "Account"}
            >
              <UserCircle className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              {account.status === "signed-in" ? account.username : "Account"}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                onOpenTool?.("archive");
              }}
            >
              <FolderArchive className="mr-2 h-4 w-4" />
              Archived
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={signOutAccount}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </header>
  );
}
