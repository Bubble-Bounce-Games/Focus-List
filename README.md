# Focus List

Focus List is a responsive personal task dashboard for projects, active work,
completed tasks, pinned notes, and calendar reminders.

The dashboard opens immediately without an account or login page. Workspace
data is saved in the current browser under the `focus-list.workspace.v1`
localStorage key.

## Features

- Active and completed task views with progress tracking
- Project folders and tags
- Search, filters, and sorting
- Pinned rich-text notes
- Calendar reminders and an overdue reminder board
- Responsive desktop, tablet, and mobile layouts

## Storage

Projects, tags, tasks, notes, and reminders persist after reloads and browser
restarts on the same browser and device. Clearing site data, using a private
window, or changing devices starts a separate guest workspace.

When `NEXT_PUBLIC_FOCUS_LIST_ACCOUNT_API_URL` is configured, users can create a
simple username/password account and save their workspace through AWS so it
loads after login on another device.

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
