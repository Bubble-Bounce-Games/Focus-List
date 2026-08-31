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
window, or changing devices starts a separate workspace. S3 hosts the static
website files; it does not receive visitors' dashboard data.

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

The simplest live deployment is GitHub Pages at
`https://focus-list.abhijeetanand.com`. The **Deploy GitHub Pages** workflow
builds the static site for the domain root and publishes the `public/CNAME`
custom-domain marker.

The AWS S3 workflow remains available as an alternate static host, described in
[docs/aws-s3.md](./docs/aws-s3.md).

See [AGENTS.md](./AGENTS.md) for repository conventions.
