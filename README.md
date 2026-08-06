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

Requires [Node.js](https://nodejs.org/) 20+ and [Yarn](https://classic.yarnpkg.com/) 1.x.

```bash
yarn install
yarn dev
```

Open http://localhost:3000 in your browser.

To run a production build locally:

```bash
yarn build
yarn start
```

### Just open the app

Double-click **`Focus-List.command`** in Finder, or run `./start.sh` from a
terminal. It installs dependencies and rebuilds only when something changed,
starts the server, and opens http://focus-list.local in your browser. The very
first run asks for your password once to set the domain up; after that it goes
straight to the app. Ctrl+C stops it.

If the domain is not available it falls back to http://localhost:3000 and tells
you the one command needed to fix it.

### Serving it at http://focus-list.local

```bash
sudo ./scripts/local-domain.sh install
```

That does two things: points `focus-list.local` at `127.0.0.1` via a marked
block in `/etc/hosts`, and adds a pf rule redirecting port 80 to port 3000, so
the bare URL works without running the server as root. Start the app as usual
and open http://focus-list.local.

The pf redirect is cleared by a reboot — `sudo ./scripts/local-domain.sh port`
restores it. `./scripts/local-domain.sh status` reports what is currently in
place, and `uninstall` reverses everything.

If you would rather not touch the firewall, run only the name half with
`sudo ./scripts/local-domain.sh host` and use http://focus-list.local:3000.

### Icons

The browser-tab icon is generated from `public/logo.png`:

```bash
yarn icons
```

This crops the logo down to its mark — the full lockup is unreadable at 16px —
and writes `src/app/icon.png` and `src/app/apple-icon.png`, which Next picks up
by file convention. Re-run it whenever the logo changes, and commit the output.

`yarn verify` runs the full gate — import/tracking check, lint, and build —
and is what CI runs on every push.

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
