# AWS Simple Account API

Focus List runs from S3 while saving each user's workspace to a small AWS API.
This replaces email confirmation and Cognito with a simple username and
password login.

## What This Adds

- `POST /signin`: sign in without email confirmation
- `GET /state`: load that user's projects, tasks, notes, and reminders
- `PUT /state`: save that user's projects, tasks, notes, and reminders

Passwords are hashed before storage. Sessions expire after 30 days. The website
opens on the sign-in screen first, then loads the dashboard after login.

## Deploy Account API

The workflow is:

```text
GitHub Actions > Deploy Account API > Run workflow
```

It packages `infrastructure/aws/account-api/index.mjs`, uploads the zip to the
S3 website bucket, and deploys `infrastructure/aws/simple-account-api.yml`.

## Required IAM Permission

The existing GitHub role must be allowed to deploy the account API stack. Add
these permissions to the role `GitHubActionsFocusListS3Deploy`.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:CreateStack",
        "cloudformation:UpdateStack",
        "cloudformation:DescribeStacks",
        "cloudformation:DescribeStackEvents",
        "cloudformation:GetTemplate",
        "cloudformation:GetTemplateSummary",
        "cloudformation:CreateChangeSet",
        "cloudformation:DescribeChangeSet",
        "cloudformation:ExecuteChangeSet",
        "cloudformation:DeleteChangeSet"
      ],
      "Resource": "arn:aws:cloudformation:ap-southeast-1:990723918097:stack/focus-list-simple-account-api/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "lambda:CreateFunction",
        "lambda:UpdateFunctionCode",
        "lambda:UpdateFunctionConfiguration",
        "lambda:GetFunction",
        "lambda:AddPermission",
        "lambda:RemovePermission"
      ],
      "Resource": "arn:aws:lambda:ap-southeast-1:990723918097:function:focus-list-simple-account-api-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:CreateTable",
        "dynamodb:DescribeTable",
        "dynamodb:DeleteTable",
        "dynamodb:UpdateTimeToLive",
        "dynamodb:DescribeTimeToLive"
      ],
      "Resource": "arn:aws:dynamodb:ap-southeast-1:990723918097:table/focus-list-simple-account-api-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "apigateway:GET",
        "apigateway:POST",
        "apigateway:PUT",
        "apigateway:PATCH",
        "apigateway:DELETE",
        "apigateway:TagResource",
        "apigateway:UntagResource"
      ],
      "Resource": "arn:aws:apigateway:ap-southeast-1::/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "iam:CreateRole",
        "iam:GetRole",
        "iam:PutRolePolicy",
        "iam:DeleteRolePolicy",
        "iam:DeleteRole",
        "iam:PassRole"
      ],
      "Resource": "arn:aws:iam::990723918097:role/focus-list-simple-account-api-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::focus-list.abhijeet-anand.com/account-api/*"
    }
  ]
}
```

## Connect Website Build

After the workflow succeeds, copy the `AccountApiUrl` output from the final
workflow step.

Add this GitHub environment variable in the `aws-s3` environment:

```text
NEXT_PUBLIC_FOCUS_LIST_ACCOUNT_API_URL=<AccountApiUrl output>
```

Then rerun:

```text
GitHub Actions > Deploy AWS S3 > Run workflow
```

The S3 website will then include the account API URL in the browser build.
