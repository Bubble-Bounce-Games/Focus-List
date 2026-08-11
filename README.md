# Focus List

A calm task manager with a persistent local SQL backend. Track each task's progress with a
slider — when a task reaches 100% it automatically moves into the Done
section, grouped by its original project and tag.

Tasks, projects, tags, and sign-in sessions are stored by the local server in
SQLite. Open the same running server from another browser or device and you
will see the same saved list.

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
- **Persistence** — SQLite for all tasks, projects, and tags; localStorage
  only for small UI preferences (filters, sort).
- **Explicit projects** — create a project first, then assign tasks to it.
- **Desktop-optimized, fixed viewport** — no full-page scrolling.

## Tech stack

- [Next.js 16](https://nextjs.org/) (App Router) + TypeScript
- [Tailwind CSS 4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- SQLite through Node.js for persistent local storage
- [Framer Motion](https://www.framer.com/motion/) for restrained animations
- [Lucide](https://lucide.dev/) icons

## Getting started

Requires [Node.js](https://nodejs.org/) 22.5+ and npm. The quickest way in is the
launcher below; the raw commands are:

```bash
npm install
npm run dev
```

Open http://localhost:9000 in your browser.

To run a production build locally:

```bash
npm run build
npm start
```

`npm start` keeps the SQLite database and credential CSV in this project's
`data/` folder, outside the standalone build output. If you run
`.next/standalone/server.js` directly, set `FOCUS_LIST_DATA_DIR` to the
directory that contains your persistent `data` folder first.

`npm run verify` runs the full gate — import/tracking check, typecheck, lint,
tests, and build — and is what CI runs on every push.

### Just open the app

```bash
bash start.sh          # start it and open the browser
bash start.sh stop     # stop it
bash start.sh status   # is it running, and where
```

`bash start.sh` installs and rebuilds only when something actually changed,
starts the server on port 9000, and opens http://localhost:9000. The server is
detached, so the command returns to your prompt instead of sitting there — stop
it later with `bash start.sh stop`. It never needs sudo. You can also
double-click **`Focus-List.command`** in Finder.

### Icons

The browser-tab icon is generated from `public/logo.png`:

```bash
npm run icons
```

This crops the logo down to its mark — the full lockup is unreadable at 16px —
and writes `src/app/icon.png` and `src/app/apple-icon.png`, which Next picks up
by file convention. Re-run it whenever the logo changes, and commit the output.

The database begins empty. Use **New Project** first; every task must be
assigned to one of those existing projects.

## Local data

- **SQLite** (`data/focus-list.sqlite`) stores all tasks, projects, tags, and
  sessions. Everything you create, edit, or delete is written to this database
  and survives restarts. It is ignored by Git so it is never committed.
- **localStorage** stores only UI preferences (search text, selected filters,
  sort order) under the `fl.*` keys.
- **Credentials** live only in `data/no-credentials/credential.csv`, which is
  ignored by Git. Copy `credential.csv.example` to that name, then set the
  `username,password` row. The server reads this file for sign-in; passwords
  are intentionally plain text at your request, so keep the server private.
- To use the list from another device, run one copy of the server on a machine
  with persistent storage and open that machine's address from the other device.
  A separately started copy has its own local database.

## Project conventions

See [`AGENTS.md`](./AGENTS.md) for path, commit, versioning, and secret
handling conventions.
