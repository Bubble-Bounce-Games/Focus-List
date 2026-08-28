# AWS S3 Deployment

This app can be deployed as a static Next.js export to an S3 bucket.

## Required GitHub Environment

Create a GitHub environment named `aws-s3`, then add these environment variables:

- `AWS_REGION` - for example `us-east-1`
- `AWS_S3_BUCKET` - your bucket name
- `AWS_ROLE_TO_ASSUME` - IAM role ARN trusted by GitHub Actions OIDC
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

The Supabase values are public browser keys, but keep them as GitHub variables
or secrets so builds stay environment-driven.

## S3 Website Settings

The deployment workflow configures:

- Index document: `index.html`
- Error document: `404.html`

If you use the S3 website endpoint directly, the bucket must allow public read
access to uploaded objects. Replace `YOUR_BUCKET_NAME` before applying:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
    }
  ]
}
```

For HTTPS and a private bucket, put CloudFront in front of S3 instead of using
the public S3 website endpoint directly.

## GitHub Actions OIDC

Create an IAM OIDC provider for:

- Provider URL: `https://token.actions.githubusercontent.com`
- Audience: `sts.amazonaws.com`

The IAM role trust policy should limit access to this repo and the `aws-s3`
environment:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:Bubble-Bounce-Games/Focus-List:environment:aws-s3"
        }
      }
    }
  ]
}
```

Attach an IAM permissions policy that can update the target bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetBucketWebsite",
        "s3:PutBucketWebsite"
      ],
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:DeleteObject",
        "s3:GetObject",
        "s3:PutObject",
        "s3:PutObjectAcl"
      ],
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
    }
  ]
}
```

## Deploy

Run the manual workflow:

```bash
gh workflow run "Deploy AWS S3"
```

Or in GitHub, open **Actions > Deploy AWS S3 > Run workflow**.

After deployment, open the bucket website endpoint from the S3 bucket
**Properties > Static website hosting** section.

## Supabase Redirect URLs

In Supabase **Authentication > URL Configuration**, add the S3 website endpoint
or CloudFront/custom-domain URL:

```text
http://YOUR_BUCKET_NAME.s3-website-YOUR_REGION.amazonaws.com/**
```

If you use CloudFront or a custom domain, add that HTTPS URL too.
