# Step 1: Create Private S3 Storage

## Goal

Move Focus List application data from Supabase PostgreSQL to a private Amazon
S3 bucket while keeping Supabase Auth for account registration and login.

The public website bucket and private data bucket must remain separate:

```text
Public website bucket
  focus-list.abhijeetanand.com-990723918097-ap-southeast-1-an

Private data bucket
  focus-list-private-data-990723918097-ap-southeast-1
```

Never enable public access or static website hosting on the private data bucket.

## How It Works

The browser does not connect directly to private S3 and does not receive AWS
credentials.

```text
Signed-in browser
  -> sends Supabase access token to the Focus List data API
  -> API Gateway invokes Lambda
  -> Lambda validates the token with Supabase Auth
  -> Lambda reads or writes that user's private S3 object
```

Each user receives one versioned JSON object:

```text
users/<verified-supabase-user-id>/state.json
```

The object contains:

```text
projects
tags
tasks
notes
reminders
updatedAt
```

S3 object versioning protects earlier copies. The API also returns an ETag so
the frontend can detect when another device saved a newer version.

## Files Added to the Repository

- `infrastructure/aws/private-s3-data.yml` creates the private bucket, Lambda,
  API Gateway HTTP API, IAM role, and CORS settings.
- `src/lib/focuslist/private-s3-state.ts` provides authenticated browser load
  and save functions.
- `.env.example` documents `NEXT_PUBLIC_FOCUS_LIST_DATA_API_URL`.

The current task store is not switched yet. That happens only after this stack
is deployed and its API passes the health and authenticated data tests.

## Values Needed Before Deployment

Open `.env.local` locally and find these existing values:

```env
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Do not paste these values into documentation, Git, chat, or the public bucket.
Enter them only as CloudFormation parameters in your AWS account.

## Manual AWS Console Setup

1. Sign in to AWS and select region **Asia Pacific (Singapore)**,
   `ap-southeast-1`.
2. Open **CloudFormation**.
3. Select **Create stack > With new resources (standard)**.
4. Choose **Upload a template file**.
5. Upload `infrastructure/aws/private-s3-data.yml` from this repository.
6. Select **Next**.
7. Use stack name `focus-list-private-s3-data`.
8. Review the parameters:

```text
DataBucketName
  focus-list-private-data-990723918097-ap-southeast-1

AllowedOrigin
  http://focus-list.abhijeetanand.com-990723918097-ap-southeast-1-an.s3-website-ap-southeast-1.amazonaws.com

SupabaseUrl
  Value of NEXT_PUBLIC_SUPABASE_URL from .env.local

SupabasePublishableKey
  Value of NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY from .env.local

MaxStateBytes
  1048576
```

9. Select **Next** through the stack options.
10. Under **Capabilities**, acknowledge that CloudFormation may create IAM
    resources.
11. Select **Submit**.
12. Wait for stack status `CREATE_COMPLETE`.

The stack intentionally retains the private bucket if the stack is deleted, so
an accidental CloudFormation deletion does not remove user data.

## What You Need to Do Next

### Part A: Find and Test the API URL

1. Open **AWS CloudFormation**.
2. Select **Stacks** from the left menu.
3. Select the stack named `focus-list-private-s3-data`.
4. Open the **Outputs** tab.
5. Find the row named `HealthCheckUrl`.
6. Open that URL in a browser.

The browser should display:

```json
{"status":"ok"}
```

7. Return to the **Outputs** tab.
8. Find the row named `DataApiUrl`.
9. Send only that URL in this chat. It normally looks like:

```text
https://example-id.execute-api.ap-southeast-1.amazonaws.com
```

The API URL is not a password. Do not send the Supabase key, AWS credentials,
or any value from `.env.local`.

### Part B: Check the Private Bucket

1. Open **AWS S3**.
2. Select `focus-list-private-data-990723918097-ap-southeast-1`.
3. Open **Permissions**.
4. Confirm **Block all public access** says `On`.
5. Open **Properties**.
6. Confirm **Bucket Versioning** says `Enabled`.
7. Find **Default encryption** and confirm it says `Enabled`.

Do not turn on static website hosting for this bucket. Do not add a public
bucket policy. This bucket stores private user data and must stay private.

### Part C: Stop and Send the API URL

After Parts A and B, do not move or delete data manually. Send the `DataApiUrl`
to me. I will then:

1. Add `NEXT_PUBLIC_FOCUS_LIST_DATA_API_URL` to the GitHub environment.
2. Add the API URL to the local development configuration without committing
   it.
3. Test authenticated `GET /state` and `PUT /state` requests.
4. Add the migration code that reads projects, tags, and tasks from Supabase.
5. Include pinned notes and reminders currently stored in the browser.
6. Upload one signed-in user's state to private S3.
7. Read it back and compare record counts and IDs.
8. Switch live storage only after the comparison succeeds.

Supabase records will remain unchanged during testing. Do not delete Supabase
data after the first successful upload; it is the rollback copy until S3 works
correctly on multiple devices.

## Current API

The stack exposes these routes:

```text
GET /health
GET /state
PUT /state
```

`GET /state` and `PUT /state` require the signed-in user's Supabase bearer
token. Lambda derives the S3 object key from the verified user ID. A caller
cannot select another user's object key.

## Limitations

S3 stores the user's state as one JSON document. This is acceptable for the
current small Focus List data set, but it is not a relational database:

- Updates rewrite the state object.
- Queries happen in the browser after loading the state.
- Realtime updates require polling or a later event system.
- Very large accounts should move to DynamoDB or PostgreSQL.

The configured API rejects state documents larger than 1 MiB by default.

## Step 1 Completion Checklist

- CloudFormation stack status is `CREATE_COMPLETE`.
- Private bucket has all public access blocked.
- Private bucket versioning and encryption are enabled.
- Health check returns `{"status":"ok"}`.
- `DataApiUrl` is available for GitHub configuration.
- No AWS credentials appear in the frontend or repository.
- Existing Supabase data remains unchanged.

After these checks pass, the next code step is the authenticated migration and
store cutover. Supabase Auth remains active throughout this phase.
