"use client";

import { useState, type FormEvent } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ChevronDown, Folder, Pencil, Plus, Tag as TagIcon, X } from "lucide-react";
import type { Project, Tag } from "@/lib/focuslist/types";
import { pillStyle } from "@/lib/focuslist/palette";
import { cn } from "@/lib/utils";

type WorkspaceTab = "active" | "completed";

type FilterToolbarProps = {
  projects: Project[];
  tags: Tag[];
  activeTab: WorkspaceTab;
  completedCount: number;
  selectedProjectId: string | null;
  selectedTagId: string | null;
  projectMenuOpen: boolean;
  createFrameOpen: boolean;
  onTabChange: (tab: WorkspaceTab) => void;
  onSelectProject: (id: string | null) => void;
  onSelectTag: (id: string | null) => void;
  onProjectMenuOpenChange: (open: boolean) => void;
  onCreateFrameOpenChange: (open: boolean) => void;
  onCreateProject: (name: string) => void;
  onRenameProject: (id: string, name: string) => void;
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
  projectMenuOpen,
  createFrameOpen,
  onTabChange,
  onSelectProject,
  onSelectTag,
  onProjectMenuOpenChange,
  onCreateFrameOpenChange,
  onCreateProject,
  onRenameProject,
  onClear,
  isFiltering,
  projectSort,
  onProjectSortChange,
}: FilterToolbarProps) {
  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const selectedTag = tags.find((t) => t.id === selectedTagId);
  const [newProjectName, setNewProjectName] = useState("");
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  function submitProjectCreate(event: FormEvent) {
    event.preventDefault();
    const trimmed = newProjectName.trim();
    if (!trimmed) return;
    onCreateProject(trimmed);
    setNewProjectName("");
    onCreateFrameOpenChange(false);
    onProjectMenuOpenChange(false);
  }

  function startRename(project: Project) {
    setRenamingProjectId(project.id);
    setRenameValue(project.name);
    onCreateFrameOpenChange(false);
  }

  function submitProjectRename(event: FormEvent, project: Project) {
    event.preventDefault();
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === project.name) {
      setRenamingProjectId(null);
      return;
    }
    onRenameProject(project.id, trimmed);
    setRenamingProjectId(null);
  }

  return (
    <div className="fl-scroll flex min-h-14 shrink-0 items-center gap-2 overflow-x-auto border-b border-outline-variant bg-surface px-4 py-2 sm:gap-3 sm:px-6 lg:overflow-visible xl:px-10">
      {/* Project filter — MD3 outlined button trigger */}
      <DropdownMenu open={projectMenuOpen} onOpenChange={onProjectMenuOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-10 shrink-0 gap-2 px-3 text-label-large sm:px-3.5"
          >
            <Folder className="h-4 w-4 text-on-surface-variant" />
            {selectedProject ? (
              <span
                className="rounded-full px-2 py-0.5 text-label-medium"
                style={pillStyle(selectedProject.color)}
              >
                {selectedProject.name}
              </span>
            ) : (
              <span>All Projects</span>
            )}
            <ChevronDown className="h-4 w-4 text-on-surface-variant" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel>Filter by project</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => onSelectProject(null)}>
            All Projects
            {selectedProjectId === null && (
              <Check className="ml-auto h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              onCreateFrameOpenChange(!createFrameOpen);
              setRenamingProjectId(null);
            }}
          >
            <Plus className="mr-2 h-4 w-4 text-primary" />
            Create project
          </DropdownMenuItem>
          {createFrameOpen && (
            <form
              onSubmit={submitProjectCreate}
              className="mx-2 my-2 rounded-md border border-outline-variant bg-surface-container-lowest p-2"
            >
              <label
                htmlFor="fl-new-project"
                className="mb-1 block text-label-small font-semibold uppercase tracking-wide text-on-surface-variant"
              >
                Project folder
              </label>
              <div className="flex gap-1.5">
                <Input
                  id="fl-new-project"
                  value={newProjectName}
                  onChange={(event) => setNewProjectName(event.target.value)}
                  className="h-8 min-w-0 flex-1 px-2 text-xs"
                  placeholder="Folder name"
                />
                <button
                  type="submit"
                  className="inline-flex h-8 shrink-0 items-center justify-center rounded-md bg-primary px-2.5 text-xs font-semibold text-primary-foreground transition-[background-color] duration-[var(--duration-short)] [transition-timing-function:var(--ease-standard)] hover:bg-on-primary/[0.08] focus-visible:bg-on-primary/[0.10] active:bg-on-primary/[0.12]"
                >
                  Save
                </button>
              </div>
            </form>
          )}
          <DropdownMenuSeparator />
          {projects.map((p) => (
            <div key={p.id} className="px-1 py-0.5">
              {renamingProjectId === p.id ? (
                <form
                  onSubmit={(event) => submitProjectRename(event, p)}
                  className="flex items-center gap-1.5 px-1 py-1"
                >
                  <Input
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                    className="h-8 min-w-0 flex-1 px-2 text-xs"
                    aria-label={`Rename ${p.name}`}
                  />
                  <button
                    type="submit"
                    className="inline-flex h-8 shrink-0 items-center justify-center rounded-md bg-primary px-2.5 text-xs font-semibold text-primary-foreground transition-[background-color] duration-[var(--duration-short)] [transition-timing-function:var(--ease-standard)] hover:bg-on-primary/[0.08] focus-visible:bg-on-primary/[0.10] active:bg-on-primary/[0.12]"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setRenamingProjectId(null)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-on-surface-variant transition-[background-color] duration-[var(--duration-short)] [transition-timing-function:var(--ease-standard)] hover:bg-on-surface/[0.08] hover:text-on-surface focus-visible:bg-on-surface/[0.10] active:bg-on-surface/[0.12]"
                    aria-label="Cancel rename"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onSelectProject(p.id)}
                    className="flex h-8 min-w-0 flex-1 items-center justify-between rounded-md px-1.5 text-left transition-[background-color] duration-[var(--duration-short)] [transition-timing-function:var(--ease-standard)] hover:bg-on-surface/[0.08] focus-visible:bg-on-surface/[0.10] active:bg-on-surface/[0.12]"
                  >
                    <span
                      className="truncate rounded-full px-2 py-0.5 text-label-medium"
                      style={pillStyle(p.color)}
                    >
                      {p.name}
                    </span>
                    {selectedProjectId === p.id && (
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => startRename(p)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-on-surface-variant transition-[background-color] duration-[var(--duration-short)] [transition-timing-function:var(--ease-standard)] hover:bg-on-surface/[0.08] hover:text-on-surface focus-visible:bg-on-surface/[0.10] active:bg-on-surface/[0.12]"
                    aria-label={`Rename ${p.name}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
          {projects.length === 0 && (
            <div className="px-2 py-1.5 text-xs text-on-surface-variant">
              No projects yet.
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

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

      {/* Folders sort — MD3 outlined button trigger */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-10 shrink-0 gap-2 px-3 text-label-large sm:px-3.5">
            <Folder className="h-4 w-4 text-on-surface-variant" />
            Folders: {projectSort === "name" ? "A to Z" : "Color"}
            <ChevronDown className="h-4 w-4 text-on-surface-variant" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>Sort folders</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => onProjectSortChange("name")}>Name: A to Z</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onProjectSortChange("color")}>Color code</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear filters — MD3 text button */}
      <Button
        variant="ghost"
        onClick={onClear}
        disabled={!isFiltering}
        className="h-10 shrink-0 gap-1.5 px-3 text-label-large text-on-surface-variant hover:bg-on-surface/[0.08] hover:text-on-surface focus-visible:bg-on-surface/[0.10] active:bg-on-surface/[0.12] disabled:opacity-38 disabled:hover:bg-transparent disabled:hover:text-on-surface-variant"
      >
        <X className="h-4 w-4" />
        Clear filters
      </Button>
    </div>
  );
}
