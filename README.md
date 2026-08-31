# Focus List

A calm, cloud-synced personal task manager. Track each task's progress with a
slider — when a task reaches 100% it automatically moves into the Done
section, grouped by its original project and tag.

Tasks, projects, notes, and reminders are stored in private S3 per signed-in
Cognito account, so the same workspace is available when you log in from
another device or location.

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
- **Cloud persistence** — private S3 stores workspace data per account;
  localStorage stores small UI preferences (filters, sort).
- **Desktop-optimized, fixed viewport** — no full-page scrolling.

## Tech stack

- [Next.js 16](https://nextjs.org/) (App Router) + TypeScript
- [Tailwind CSS 4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [Amazon Cognito](https://aws.amazon.com/cognito/) for account authentication
- Private Amazon S3, API Gateway, and Lambda for per-user cloud data
- [Framer Motion](https://www.framer.com/motion/) for restrained animations
- [Lucide](https://lucide.dev/) icons

## Getting started

Requires [Node.js](https://nodejs.org/) 22+ and [Yarn](https://classic.yarnpkg.com/) 1.x.

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

For production HTTPS and the custom domain, follow
[docs/aws-cloudfront.md](./docs/aws-cloudfront.md).

## AWS accounts and storage

The account screen is enabled when `NEXT_PUBLIC_COGNITO_USER_POOL_ID` and
`NEXT_PUBLIC_COGNITO_APP_CLIENT_ID` are set. Cognito handles login sessions and
password verification. The private-data API creates active accounts through a
restricted Cognito administrator action, so signup does not require an email
confirmation step. The SPA app client must not have a client secret.

`NEXT_PUBLIC_FOCUS_LIST_DATA_API_URL` connects the browser to API Gateway.
API Gateway validates the Cognito token before Lambda reads or writes the
signed-in user's versioned JSON document in private S3. See
[`docs/phase 1/Step1.md`](./docs/phase%201/Step1.md) for the AWS setup.

## Local data

- **Private S3** stores projects, tags, tasks, pinned notes, and reminders per authenticated user.
- **localStorage** stores only UI preferences (search text, selected filters,
  sort order) under the `fl.*` keys.
- Clearing your browser's site data signs out and resets UI preferences, but
  cloud workspace data returns after signing in again.

## Project conventions

See [`AGENTS.md`](./AGENTS.md) for path, commit, versioning, and secret
handling conventions.
