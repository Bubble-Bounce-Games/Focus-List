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
import { Check, ChevronDown, Folder, Tag as TagIcon, X } from "lucide-react";
import type { Project, Tag } from "@/lib/focuslist/types";
import { pillStyle } from "@/lib/focuslist/palette";

type FilterToolbarProps = {
  projects: Project[];
  tags: Tag[];
  selectedProjectId: string | null;
  selectedTagId: string | null;
  onSelectProject: (id: string | null) => void;
  onSelectTag: (id: string | null) => void;
  onClear: () => void;
  isFiltering: boolean;
};

export function FilterToolbar({
  projects,
  tags,
  selectedProjectId,
  selectedTagId,
  onSelectProject,
  onSelectTag,
  onClear,
  isFiltering,
}: FilterToolbarProps) {
  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const selectedTag = tags.find((t) => t.id === selectedTagId);

  return (
    <div className="flex h-[68px] shrink-0 items-center gap-3 border-b border-border bg-app px-6 xl:px-10">
      {/* Project filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-10 gap-2 rounded-xl border-border bg-card px-3.5 text-sm font-medium text-foreground-strong hover:bg-secondary"
          >
            <Folder className="h-4 w-4 text-muted-foreground" />
            {selectedProject ? (
              <span
                className="rounded-full px-2 py-0.5 text-xs font-medium"
                style={pillStyle(selectedProject.color)}
              >
                {selectedProject.name}
              </span>
            ) : (
              <span>All Projects</span>
            )}
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Filter by project</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => onSelectProject(null)}>
            All Projects
            {selectedProjectId === null && (
              <Check className="ml-auto h-4 w-4" style={{ color: "#6252e8" }} />
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {projects.map((p) => (
            <DropdownMenuItem
              key={p.id}
              onSelect={() => onSelectProject(p.id)}
              className="justify-between"
            >
              <span
                className="rounded-full px-2 py-0.5 text-xs font-medium"
                style={pillStyle(p.color)}
              >
                {p.name}
              </span>
              {selectedProjectId === p.id && (
                <Check className="h-4 w-4" style={{ color: "#6252e8" }} />
              )}
            </DropdownMenuItem>
          ))}
          {projects.length === 0 && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              No projects yet.
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Tag filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-10 gap-2 rounded-xl border-border bg-card px-3.5 text-sm font-medium text-foreground-strong hover:bg-secondary"
          >
            <TagIcon className="h-4 w-4 text-muted-foreground" />
            {selectedTag ? (
              <span
                className="rounded-full px-2 py-0.5 text-xs font-medium"
                style={pillStyle(selectedTag.color)}
              >
                {selectedTag.name}
              </span>
            ) : (
              <span>All Tags</span>
            )}
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Filter by tag</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => onSelectTag(null)}>
            All Tags
            {selectedTagId === null && (
              <Check className="ml-auto h-4 w-4" style={{ color: "#6252e8" }} />
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
                className="rounded-full px-2 py-0.5 text-xs font-medium"
                style={pillStyle(t.color)}
              >
                {t.name}
              </span>
              {selectedTagId === t.id && (
                <Check className="h-4 w-4" style={{ color: "#6252e8" }} />
              )}
            </DropdownMenuItem>
          ))}
          {tags.length === 0 && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              No tags yet.
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear filters */}
      <Button
        variant="ghost"
        onClick={onClear}
        disabled={!isFiltering}
        className="h-10 gap-1.5 rounded-xl px-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground-strong disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
      >
        <X className="h-4 w-4" />
        Clear filters
      </Button>
    </div>
  );
}
