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
import { Check, ChevronDown, Folder, Plus, Tag as TagIcon, X } from "lucide-react";
import type { Project, Tag } from "@/lib/focuslist/types";
import { pillStyle } from "@/lib/focuslist/palette";

type WorkspaceTab = "active" | "completed";

type FilterToolbarProps = {
  projects: Project[];
  tags: Tag[];
  activeTab: WorkspaceTab;
  completedCount: number;
  selectedProjectId: string | null;
  selectedTagId: string | null;
  onTabChange: (tab: WorkspaceTab) => void;
  onSelectProject: (id: string | null) => void;
  onSelectTag: (id: string | null) => void;
  onCreateProject: () => void;
  onClear: () => void;
  isFiltering: boolean;
  projectSort: "name" | "color";
  onProjectSortChange: (sort: "name" | "color") => void;
};

export function FilterToolbar({
  projects,
  tags,
  activeTab,
  completedCount,
  selectedProjectId,
  selectedTagId,
  onTabChange,
  onSelectProject,
  onSelectTag,
  onCreateProject,
  onClear,
  isFiltering,
  projectSort,
  onProjectSortChange,
}: FilterToolbarProps) {
  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const selectedTag = tags.find((t) => t.id === selectedTagId);

  return (
    <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-app px-6 xl:px-10">
      {/* Project filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-10 gap-2 rounded-none border-border bg-card px-3.5 text-sm font-medium text-foreground-strong hover:bg-secondary"
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
          <DropdownMenuItem onSelect={onCreateProject}>
            <Plus className="mr-2 h-4 w-4 text-primary" />
            Create project
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

      <div className="flex h-10 overflow-hidden border border-border bg-card">
        <button
          type="button"
          onClick={() => onTabChange("active")}
          className={`px-3 text-sm font-medium transition-colors ${
            activeTab === "active"
              ? "bg-primary text-white"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground-strong"
          }`}
        >
          Active
        </button>
        <button
          type="button"
          onClick={() => onTabChange("completed")}
          className={`border-l border-border px-3 text-sm font-medium transition-colors ${
            activeTab === "completed"
              ? "bg-[#198038] text-white"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground-strong"
          }`}
        >
          Completed Tasks <span className="ml-1 tabular-nums">{completedCount}</span>
        </button>
      </div>

      {/* Tag filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-10 gap-2 rounded-none border-border bg-card px-3.5 text-sm font-medium text-foreground-strong hover:bg-secondary"
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-10 gap-2 rounded-none border-border bg-card px-3.5 text-sm font-medium text-foreground-strong hover:bg-secondary">
            <Folder className="h-4 w-4 text-muted-foreground" />
            Folders: {projectSort === "name" ? "A to Z" : "Color"}
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>Sort folders</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => onProjectSortChange("name")}>Name: A to Z</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onProjectSortChange("color")}>Color code</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear filters */}
      <Button
        variant="ghost"
        onClick={onClear}
        disabled={!isFiltering}
        className="h-10 gap-1.5 rounded-none px-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground-strong disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
      >
        <X className="h-4 w-4" />
        Clear filters
      </Button>
    </div>
  );
}
