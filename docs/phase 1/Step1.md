# Step 1: Browser-Only Dashboard Storage

Focus List now opens directly on the dashboard. There is no account, login,
email confirmation, Cognito user pool, private-data API, Lambda function, or
private S3 data bucket required by the application.

## How Saving Works

The browser automatically saves projects, tags, active and completed tasks,
pinned notes, and calendar reminders. The workspace key is:

```text
focus-list.workspace.v1
```

This data remains available after a reload, closing the tab, or restarting the
same browser. It is specific to that browser and device. Clearing website data,
using private browsing, or opening the site on another device creates a new
empty workspace.

## What AWS S3 Does

The public website S3 bucket stores only compiled HTML, JavaScript, CSS, and
images. It does not store visitor projects or tasks. The failed private-data
CloudFormation stack is no longer part of the website deployment.

Do not delete this public website bucket:

```text
focus-list.abhijeetanand.com-990723918097-ap-southeast-1-an
```

## Verification

1. Open the public website.
2. Create a project and task.
3. Add a pinned note and calendar reminder.
4. Reload the page and confirm all four items remain.
5. Close and reopen the browser and confirm they still remain.

The deployment instructions are in [docs/aws-s3.md](../aws-s3.md).
