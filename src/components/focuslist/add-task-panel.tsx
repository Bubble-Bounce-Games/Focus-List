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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import type { Project, Tag, Task } from "@/lib/focuslist/types";
import { clampProgress } from "@/lib/focuslist/store";
import { Combobox } from "./combobox";
import { ProgressSlider } from "./progress-slider";

export type TaskFormData = {
  title: string;
  projectName: string;
  tagName: string;
  progress: number;
};

type AddTaskPanelProps = {
  open: boolean;
  mode: "create" | "edit";
  editingTask: Task | null;
  initialProjectName?: string;
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
  initialProjectName = "",
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
        projectName: project?.name ?? "",
        tagName: tag?.name ?? "",
        progress: editingTask.progress,
      };
    }
    return { title: "", projectName: initialProjectName, tagName: "", progress: 0 };
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
          const project = projects.find((p) => p.id === editingTask.projectId);
          const tag = tags.find((t) => t.id === editingTask.tagId);
          return (
            form.title.trim() !== editingTask.title ||
            form.projectName.trim() !== (project?.name ?? "") ||
            form.tagName.trim() !== (tag?.name ?? "") ||
            form.progress !== editingTask.progress
          );
        })()
      : form.title.trim() !== "" ||
        form.projectName.trim() !== initialProjectName ||
        form.tagName.trim() !== "" ||
        form.progress !== 0;

  const titleValid = form.title.trim().length > 0;
  const projectValid = form.projectName.trim().length > 0;
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
      projectName: form.projectName.trim(),
      tagName: form.tagName.trim(),
      progress: clampProgress(form.progress),
    });
  }

  const projectOptions = projects.map((p) => p.name);
  const tagOptions = tags.map((t) => t.name);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40 bg-on-surface/40 backdrop-blur-[1px]"
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
        className="fixed right-0 top-0 z-50 flex h-full w-[460px] max-w-[100vw] flex-col border-l border-outline-variant bg-surface-container-low shadow-e3"
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-outline-variant px-6 py-4">
          <div
            className="flex size-9 items-center justify-center rounded-full bg-primary-container text-on-primary-container"
            aria-hidden
          >
            <Plus className="size-5" strokeWidth={2.5} />
          </div>
          <h2 className="text-title-large text-on-surface">
            {mode === "edit" ? "Edit Task" : "Add Task"}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={requestClose}
            className="ml-auto size-9 rounded-full text-on-surface-variant hover:bg-on-surface/[0.08] hover:text-on-surface focus-visible:bg-on-surface/[0.10] active:bg-on-surface/[0.12]"
            aria-label="Close panel"
          >
            <X className="size-5" />
          </Button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="fl-scroll flex-1 overflow-y-auto p-6">
            <div className="flex flex-col gap-5">
              {/* Task title */}
              <div>
                <Label htmlFor="fl-title" className="mb-1.5 block">
                  Task title <span className="text-error">*</span>
                </Label>
                <Input
                  ref={titleRef}
                  id="fl-title"
                  type="text"
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="e.g. Write user documentation"
                  aria-invalid={touched && !titleValid}
                />
                {touched && !titleValid && (
                  <p className="mt-1 text-label-medium text-error">
                    Task title is required.
                  </p>
                )}
              </div>

              {/* Project + Tag */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="fl-project" className="mb-1.5 block">
                    Project name <span className="text-error">*</span>
                  </Label>
                  <Combobox
                    id="fl-project"
                    value={form.projectName}
                    onChange={(v) => setForm((f) => ({ ...f, projectName: v }))}
                    options={projectOptions}
                    placeholder="Select or create a project"
                    invalid={touched && !projectValid}
                  />
                  {touched && !projectValid && (
                    <p className="mt-1 text-label-medium text-error">
                      Project name is required.
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="fl-tag" className="mb-1.5 block">
                    Tag name <span className="text-error">*</span>
                  </Label>
                  <Combobox
                    id="fl-tag"
                    value={form.tagName}
                    onChange={(v) => setForm((f) => ({ ...f, tagName: v }))}
                    options={tagOptions}
                    placeholder="Select or create a tag"
                    invalid={touched && !tagValid}
                  />
                  {touched && !tagValid && (
                    <p className="mt-1 text-label-medium text-error">
                      Tag name is required.
                    </p>
                  )}
                </div>
              </div>

              {/* Progress */}
              <div>
                <Label htmlFor="fl-progress" className="mb-2 block">
                  Progress %
                </Label>
                <div className="flex items-center gap-4 rounded-md border border-outline-variant bg-surface-container-lowest p-4">
                  <span className="w-8 shrink-0 text-label-medium text-on-surface-variant">
                    0%
                  </span>
                  <ProgressSlider
                    id="fl-progress"
                    value={form.progress}
                    accent="var(--md-primary)"
                    onChange={(v) =>
                      setForm((f) => ({ ...f, progress: clampProgress(v) }))
                    }
                    onCommit={(v) =>
                      setForm((f) => ({ ...f, progress: clampProgress(v) }))
                    }
                    ariaLabel="New task progress"
                  />
                  <span className="w-10 shrink-0 text-right text-label-medium text-on-surface-variant">
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
                    className="h-10 w-[68px] shrink-0 rounded-md border-2 border-outline-variant bg-transparent px-2 text-center text-label-large font-bold text-on-surface outline-none transition-[border-color,box-shadow] duration-[var(--duration-short)] [transition-timing-function:var(--ease-standard)] focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-outline-variant px-6 py-4">
            <Button
              type="button"
              variant="ghost"
              onClick={requestClose}
              className="text-on-surface-variant hover:bg-on-surface/[0.08] hover:text-on-surface focus-visible:bg-on-surface/[0.10] active:bg-on-surface/[0.12]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!formValid}
              className="h-11 px-6 text-label-large"
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
