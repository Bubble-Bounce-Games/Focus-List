# Focus List

Focus List is a responsive personal task dashboard for projects, active work,
completed tasks, pinned notes, and calendar reminders.

The website opens on a simple sign-in page. A new username is saved
automatically on first sign-in; after login, the dashboard loads that user's
saved workspace.

## Features

- Active and completed task views with progress tracking
- Project folders and tags
- Search, filters, and sorting
- Pinned rich-text notes
- Calendar reminders and an overdue reminder board
- Responsive desktop, tablet, and mobile layouts

## Storage

Projects, tags, tasks, notes, and reminders persist after reloads and sign-out.

When `NEXT_PUBLIC_FOCUS_LIST_ACCOUNT_API_URL` is configured, users sign in with
a simple username/password account and save their workspace through AWS so it
loads after login on another device. There is no separate sign-up screen.

## Development

Requires Node.js 22+ and Yarn 1.x.

```bash
yarn install
yarn dev
```

Open `http://localhost:3000`. Run the complete verification gate with:

```bash
yarn verify
```

## Deployment

The app exports as a static Next.js site. The current S3 custom-domain target is
`http://focus-list.abhijeet-anand.com`, described in
[docs/aws-s3.md](./docs/aws-s3.md).

For HTTPS, use GitHub Pages or the CloudFront path in
[docs/aws-cloudfront.md](./docs/aws-cloudfront.md).

For simple account storage, deploy the API in
[docs/aws-account-api.md](./docs/aws-account-api.md).

See [AGENTS.md](./AGENTS.md) for repository conventions.
