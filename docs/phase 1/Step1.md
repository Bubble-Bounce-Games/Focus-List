# Step 1: Connect Cognito Authentication to Private S3

## Goal

Focus List uses AWS services for both authentication and application data:

```text
Amazon Cognito
  Stores accounts, verifies passwords, and issues login tokens

API Gateway and Lambda
  Create active accounts and authorize access to one user's data

Private Amazon S3 bucket
  Stores projects, tags, tasks, pinned notes, and reminders
```

S3 does not process passwords. Cognito stores password credentials, while the
API creates an active account without requiring an email confirmation code.

## Existing AWS Resources

```text
Public website bucket
  focus-list.abhijeetanand.com-990723918097-ap-southeast-1-an

Private data bucket
  focus-list-private-data-990723918097-ap-southeast-1

CloudFormation stack
  focus-list-private-s3-data
```

Never enable public access or static website hosting on the private data bucket.

## How Data Access Works

```text
Signed-in browser
  -> sends a Cognito ID token to the Focus List data API
  -> API Gateway validates the token with a JWT authorizer
  -> Lambda reads the verified Cognito user ID from the token
  -> Lambda reads or writes users/<cognito-user-id>/state.json
```

The browser never receives AWS credentials and cannot choose another user's S3
object key.

## Repository Configuration

The static frontend build requires these public configuration variables:

```env
NEXT_PUBLIC_COGNITO_USER_POOL_ID=
NEXT_PUBLIC_COGNITO_APP_CLIENT_ID=
NEXT_PUBLIC_FOCUS_LIST_DATA_API_URL=
```

These identifiers are not passwords. Do not create an app client secret for a
browser SPA and never place AWS access keys in frontend variables.

## Update the Existing CloudFormation Stack

Use the repository template whenever the private data infrastructure needs an
update:

1. Sign in to AWS and select **Asia Pacific (Singapore)**, `ap-southeast-1`.
2. Open **CloudFormation > Stacks**.
3. Select `focus-list-private-s3-data`.
4. Select **Update**.
5. Select **Replace current template**.
6. Select **Upload a template file**.
7. Upload `infrastructure/aws/private-s3-data.yml`.
8. Select **Next**.
9. Enter the new Cognito parameters:

```text
CognitoUserPoolId
  The User pool ID from Cognito

CognitoAppClientId
  The Client ID under Cognito > Applications > App clients
```

10. Keep the existing values for `DataBucketName`, `AllowedOrigin`,
    `AllowedHttpsOrigin`, `AllowedGithubPagesOrigin`, and `MaxStateBytes`.
11. Select **Next** through the stack options.
12. Acknowledge that CloudFormation may update IAM resources.
13. Select **Submit** to make a direct update.
14. Wait for `UPDATE_COMPLETE`.

The template provides protected `GET /state` and `PUT /state` routes with a
Cognito JWT authorizer. `POST /signup` creates an active Cognito account and is
throttled separately; it cannot read or write user S3 objects. `GET /health`
remains public for availability checks.

## Configure GitHub

Open **GitHub repository > Settings > Environments > aws-s3** and add these
environment variables:

```text
NEXT_PUBLIC_COGNITO_USER_POOL_ID
NEXT_PUBLIC_COGNITO_APP_CLIENT_ID
NEXT_PUBLIC_FOCUS_LIST_DATA_API_URL
```

The existing AWS deployment variables must remain:

```text
AWS_REGION
AWS_S3_BUCKET
AWS_ROLE_TO_ASSUME
```

## Deploy and Test

1. Run **Actions > Deploy AWS S3 > Run workflow**.
2. Open the website and confirm the dashboard appears without signing in.
3. Select **Add Task** or **Create Project** and confirm the login page opens.
4. Create an account with an email address and password.
5. Confirm the app signs in immediately and returns to the dashboard.
6. Create one project, task, pinned note, and reminder.
7. Sign out and sign in again. Confirm all four items are still present.
8. Sign in on another device and confirm the same data loads.
9. Open the private S3 bucket and confirm an object exists at:

```text
users/<cognito-user-id>/state.json
```

Do not make this object public.

## Account Activation

`POST /signup` uses `AdminCreateUser` with email delivery suppressed, sets the
submitted password as permanent, and then the browser signs in through the
public Cognito app client. The Lambda role is scoped to this user pool. Private
S3 state routes still require a valid Cognito token.

## Important HTTPS Requirement

The current S3 website endpoint uses HTTP. Before production use, place
CloudFront in front of the public website bucket and connect the custom domain
over HTTPS. Then add the final HTTPS login URL to the Cognito app client's
allowed callback and sign-out URLs.
