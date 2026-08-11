"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { MAX_PROGRESS, MIN_PROGRESS, type Project, type Tag, type Task } from "@/lib/focuslist/types";
import { Combobox } from "./combobox";
import { ProgressSlider } from "./progress-slider";

function clampProgress(value: number) {
  if (!Number.isFinite(value)) return MIN_PROGRESS;
  return Math.min(MAX_PROGRESS, Math.max(MIN_PROGRESS, Math.round(value)));
}

export type TaskFormData = {
  title: string;
  projectId: string;
  tagName: string;
  progress: number;
};

type AddTaskPanelProps = {
  open: boolean;
  mode: "create" | "edit";
  editingTask: Task | null;
  projects: Project[];
  tags: Tag[];
  onClose: () => void;
  onSubmit: (data: TaskFormData) => void;
};

export function AddTaskPanel(props: AddTaskPanelProps) {
  return (
    <AnimatePresence>
      {props.open && <PanelBody key={props.editingTask?.id ?? "create"} {...props} />}
    </AnimatePresence>
  );
}

type PanelBodyProps = AddTaskPanelProps;

function PanelBody({
  mode,
  editingTask,
  projects,
  tags,
  onClose,
  onSubmit,
}: PanelBodyProps) {
  const [form, setForm] = useState<TaskFormData>(() => {
    if (mode === "edit" && editingTask) {
      const project = projects.find((p) => p.id === editingTask.projectId);
      const tag = tags.find((t) => t.id === editingTask.tagId);
      return {
        title: editingTask.title,
        projectId: project?.id ?? "",
        tagName: tag?.name ?? "",
        progress: editingTask.progress,
      };
    }
    return {
      title: "",
      projectId: "",
      tagName: "",
      progress: 0,
    };
  });
  const [touched, setTouched] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  // Focus title shortly after the slide-in begins.
  useEffect(() => {
    const t = window.setTimeout(() => titleRef.current?.focus(), 180);
    return () => window.clearTimeout(t);
  }, []);

  const dirty =
    mode === "edit" && editingTask
      ? (() => {
          const tag = tags.find((t) => t.id === editingTask.tagId);
          return (
            form.title.trim() !== editingTask.title ||
            form.projectId !== editingTask.projectId ||
            form.tagName.trim() !== (tag?.name ?? "") ||
            form.progress !== editingTask.progress
          );
        })()
      : form.title.trim() !== "" ||
        form.projectId !== "" ||
        form.tagName.trim() !== "" ||
        form.progress !== 0;

  const titleValid = form.title.trim().length > 0;
  const projectValid = projects.some((project) => project.id === form.projectId);
  const tagValid = form.tagName.trim().length > 0;
  const formValid = titleValid && projectValid && tagValid;

  const requestClose = useCallback(() => {
    if (dirty) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  }, [dirty, onClose]);

  // Escape to close (with dirty guard).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        requestClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [requestClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!formValid) return;
    onSubmit({
      title: form.title.trim(),
      projectId: form.projectId,
      tagName: form.tagName.trim(),
      progress: clampProgress(form.progress),
    });
  }

  const tagOptions = tags.map((t) => t.name);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40 bg-[#171a2b]/35 backdrop-blur-[1px]"
        onClick={requestClose}
        aria-hidden
      />

      {/* Panel */}
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label={mode === "edit" ? "Edit task" : "Add task"}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 360, damping: 38 }}
        className="fixed right-0 top-0 z-50 flex h-full w-[460px] max-w-[100vw] flex-col border-l border-border bg-card shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-6 py-5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: "#6252e8" }}
            aria-hidden
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <h2 className="text-lg font-bold text-foreground-strong">
            {mode === "edit" ? "Edit Task" : "Add Task"}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={requestClose}
            className="ml-auto h-9 w-9 text-muted-foreground hover:bg-secondary hover:text-foreground-strong"
            aria-label="Close panel"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="fl-scroll flex-1 overflow-y-auto px-6 py-5">
            <div className="flex flex-col gap-5">
              {/* Task title */}
              <div>
                <label
                  htmlFor="fl-title"
                  className="mb-1.5 block text-sm font-medium text-foreground-strong"
                >
                  Task title
                </label>
                <input
                  ref={titleRef}
                  id="fl-title"
                  type="text"
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="e.g. Write user documentation"
                  aria-invalid={touched && !titleValid}
                  className={`h-11 w-full rounded-xl border bg-card px-3.5 text-sm text-foreground-strong outline-none transition-colors placeholder:text-muted-foreground focus:border-[#6252e8] ${
                    touched && !titleValid ? "border-destructive" : "border-border"
                  }`}
                />
                {touched && !titleValid && (
                  <p className="mt-1 text-xs text-destructive">
                    Task title is required.
                  </p>
                )}
              </div>

              {/* Project + Tag */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label
                    htmlFor="fl-project"
                    className="mb-1.5 block text-sm font-medium text-foreground-strong"
                  >
                    Project
                  </label>
                  <select
                    id="fl-project"
                    value={form.projectId}
                    onChange={(event) => setForm((form) => ({ ...form, projectId: event.target.value }))}
                    aria-invalid={touched && !projectValid}
                    className={`h-11 w-full rounded-xl border bg-card px-3.5 text-sm text-foreground-strong outline-none transition-colors focus:border-[#6252e8] ${
                      touched && !projectValid ? "border-destructive" : "border-border"
                    }`}
                  >
                    <option value="">Select a project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                  {touched && !projectValid && (
                    <p className="mt-1 text-xs text-destructive">
                      Select a project. Create one before adding a task.
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="fl-tag"
                    className="mb-1.5 block text-sm font-medium text-foreground-strong"
                  >
                    Tag name
                  </label>
                  <Combobox
                    id="fl-tag"
                    value={form.tagName}
                    onChange={(v) => setForm((f) => ({ ...f, tagName: v }))}
                    options={tagOptions}
                    placeholder="Select or create a tag"
                    invalid={touched && !tagValid}
                  />
                  {touched && !tagValid && (
                    <p className="mt-1 text-xs text-destructive">
                      Tag name is required.
                    </p>
                  )}
                </div>
              </div>

              {/* Progress */}
              <div>
                <label
                  htmlFor="fl-progress"
                  className="mb-2 block text-sm font-medium text-foreground-strong"
                >
                  Progress %
                </label>
                <div className="flex items-center gap-4 rounded-xl border border-border bg-app p-4">
                  <span className="w-8 shrink-0 text-xs font-medium text-muted-foreground">
                    0%
                  </span>
                  <ProgressSlider
                    id="fl-progress"
                    value={form.progress}
                    accent="#6252e8"
                    onChange={(v) =>
                      setForm((f) => ({ ...f, progress: clampProgress(v) }))
                    }
                    onCommit={(v) =>
                      setForm((f) => ({ ...f, progress: clampProgress(v) }))
                    }
                    ariaLabel="New task progress"
                  />
                  <span className="w-10 shrink-0 text-right text-xs font-medium text-muted-foreground">
                    100%
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.progress}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      setForm((f) => ({
                        ...f,
                        progress: clampProgress(Number.isNaN(n) ? 0 : n),
                      }));
                    }}
                    aria-label="Progress percentage"
                    className="h-10 w-[68px] shrink-0 rounded-lg border border-border bg-card px-2 text-center text-sm font-bold text-foreground-strong outline-none focus:border-[#6252e8]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-border px-6 py-4">
            <Button
              type="submit"
              disabled={!formValid}
              className="h-11 w-full rounded-xl bg-[#6252e8] text-[15px] font-semibold text-white shadow-sm hover:bg-[#5444d6] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mode === "edit" ? "Save Changes" : "Add Task"}
            </Button>
          </div>
        </form>
      </motion.aside>

      {/* Unsaved changes confirm */}
      <AlertDialog
        open={showConfirmClose}
        onOpenChange={(o) => {
          if (!o) setShowConfirmClose(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Closing the panel will discard them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowConfirmClose(false);
                onClose();
              }}
            >
              Discard &amp; close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
