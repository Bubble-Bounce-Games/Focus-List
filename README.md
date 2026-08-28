# Focus List

A calm, cloud-synced personal task manager. Track each task's progress with a
slider — when a task reaches 100% it automatically moves into the Done
section, grouped by its original project and tag.

Tasks, projects, and tags are stored in Supabase per signed-in account, so the
same workspace is available when you log in from another device or location.

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
- **Cloud persistence** — Supabase stores tasks/projects/tags per account;
  localStorage stores small UI preferences (filters, sort).
- **Desktop-optimized, fixed viewport** — no full-page scrolling.

## Tech stack

- [Next.js 16](https://nextjs.org/) (App Router) + TypeScript
- [Tailwind CSS 4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [Supabase](https://supabase.com/) for authentication and per-user cloud data
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

`yarn verify` runs the full gate — import/tracking check, lint, and build —
and is what CI runs on every push.

For AWS S3 static hosting, use `yarn build:aws` and the manual GitHub Actions
workflow in [docs/aws-s3.md](./docs/aws-s3.md). The S3 build does not use the
GitHub Pages `/Focus-List` base path.

## Supabase accounts

The account sign-in screen is enabled when `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are set. Create a Supabase project, copy those
values from **Project Settings > API**, and run [`supabase/schema.sql`](./supabase/schema.sql)
in the SQL Editor. The schema creates user-owned projects, tags, and tasks with
Row Level Security policies.
The same schema creates a private profile record automatically for each new
account and backfills accounts that already exist.

In **Authentication > Providers**, enable Email. For local development add
`http://localhost:3000/**` to **Authentication > URL Configuration > Redirect URLs**.
For GitHub Pages, set the Site URL to
`https://bubble-bounce-games.github.io/Focus-List` and add
`https://bubble-bounce-games.github.io/Focus-List/**` to Redirect URLs. Never
expose a Supabase service-role key in this app; the browser uses only the
publishable/anon key and RLS.

After running the schema, each new account starts with an empty workspace. The
app reads and writes tasks, projects, and tags in Supabase, scoped by the
signed-in user's `auth.uid()`. Supabase keeps the browser session across tab
closes; signing out clears the session, and signing in again restores the same
cloud data. Realtime is enabled by the final statements in the schema so open
devices refresh when data changes.

## Local data

- **Supabase** stores tasks, projects, and tags per authenticated user.
- **localStorage** stores only UI preferences (search text, selected filters,
  sort order) under the `fl.*` keys.
- Clearing your browser's site data signs out and resets UI preferences, but
  tasks, projects, and tags return after signing in again.

## Project conventions

See [`AGENTS.md`](./AGENTS.md) for path, commit, versioning, and secret
handling conventions.
