# Focus List

A calm, local-only personal task manager. Track each task's progress with a
slider — when a task reaches 100% it automatically moves into the Done
section, grouped by its original project and tag.

All data lives entirely in your browser via IndexedDB. There is no backend,
no cloud sync, no accounts, and no telemetry.

## Features

- **One unified Active Tasks list** — no Kanban columns or workflow stages.
- **Progress slider is the source of truth** — a task is complete only at 100%.
- **Automatic completion** — reaching 100% moves a task to Done; lowering it
  below 100% restores it to Active.
- **Project & tag pills** with consistent pastel colors throughout the app.
- **Search, project filter, tag filter** that work together.
- **Sorting** by progress (low/high), newest, oldest, project, or task name.
- **Done section** grouped by project, collapsible, with completion dates.
- **Add/Edit slide-over panel** with unsaved-changes guard.
- **Persistence** — IndexedDB for all tasks/projects/tags; localStorage for
  small UI preferences (filters, sort).
- **Desktop-optimized, fixed viewport** — no full-page scrolling.

## Tech stack

- [Next.js 16](https://nextjs.org/) (App Router) + TypeScript
- [Tailwind CSS 4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [Dexie](https://dexie.org/) (IndexedDB wrapper) for local persistence
- [Framer Motion](https://www.framer.com/motion/) for restrained animations
- [Lucide](https://lucide.dev/) icons

## Getting started

Requires [Node.js](https://nodejs.org/) 18+ and [Bun](https://bun.sh/).

```bash
bun install
bun run dev
```

Open http://localhost:3000 in your browser.

On first launch the app seeds a few realistic sample tasks so you can see how
it works. Delete them and they will not come back — seeding only happens when
the local database is empty.

## Local data

- **IndexedDB** (`focuslist` database) stores all tasks, projects, and tags.
- **localStorage** stores only UI preferences (search text, selected filters,
  sort order) under the `fl.*` keys.
- Clearing your browser's site data resets the app to a fresh state.

## Project conventions

See [`AGENTS.md`](./AGENTS.md) for path, commit, versioning, and secret
handling conventions.
