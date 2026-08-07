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

Requires [Node.js](https://nodejs.org/) 20+ and npm. The quickest way in is the
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

`npm run verify` runs the full gate — import/tracking check, typecheck, lint,
tests, and build — and is what CI runs on every push.

### Just open the app

```bash
bash start.sh          # start it and open the browser
bash start.sh stop     # stop it
bash start.sh status   # is it running, and where
bash start.sh setup    # one-time, asks for your password
```

`bash start.sh` installs and rebuilds only when something actually changed,
starts the server on port 9000, and opens the browser. The server is detached,
so the command returns to your prompt instead of sitting there — stop it later
with `bash start.sh stop`. You can also double-click **`Focus-List.command`** in
Finder.

The default path never asks for a password. Run `bash start.sh setup` once to
make the short URL http://focus-list.local work; until then the launcher opens
http://localhost:9000 and tells you so.

### Serving it at http://focus-list.local

```bash
bash start.sh setup     # or: sudo ./scripts/local-domain.sh install
```

That does two things: points `focus-list.local` at `127.0.0.1` via a marked
block in `/etc/hosts`, and adds a pf rule redirecting port 80 to port 9000, so
the bare URL works without running the server as root. Start the app as usual
and open http://focus-list.local.

The pf redirect is cleared by a reboot — `sudo ./scripts/local-domain.sh port`
restores it. `./scripts/local-domain.sh status` reports what is currently in
place, and `uninstall` reverses everything.

If you would rather not touch the firewall, run only the name half with
`sudo ./scripts/local-domain.sh host` and use http://focus-list.local:9000.

### Icons

The browser-tab icon is generated from `public/logo.png`:

```bash
npm run icons
```

This crops the logo down to its mark — the full lockup is unreadable at 16px —
and writes `src/app/icon.png` and `src/app/apple-icon.png`, which Next picks up
by file convention. Re-run it whenever the logo changes, and commit the output.

On first launch the app seeds a few realistic sample tasks so you can see how
it works. Delete them and they stay deleted: seeding is recorded once in the
database, so an empty list is treated as a deliberate choice rather than a
reason to re-seed.

Deleting the last task in a project (or tag) also removes that project, so the
filter menus do not fill up with labels that no longer apply.

## Local data

- **IndexedDB** (`focuslist` database) stores all tasks, projects, and tags.
  Everything you create, edit or delete is written straight to it and survives
  restarts. The persistence layer is covered by tests that run against a real
  IndexedDB implementation (`npm test`).
- **localStorage** stores only UI preferences (search text, selected filters,
  sort order) under the `fl.*` keys.
- Clearing your browser's site data resets the app to a fresh state.

## Project conventions

See [`AGENTS.md`](./AGENTS.md) for path, commit, versioning, and secret
handling conventions.
