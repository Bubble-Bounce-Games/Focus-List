# AWS S3 Deployment

This app can be deployed as a static Next.js export to an S3 bucket.

## Required GitHub Environment

Create a GitHub environment named `aws-s3`, then add these environment variables:

- `AWS_REGION` - for example `us-east-1`
- `AWS_S3_BUCKET` - your bucket name
- `AWS_ROLE_TO_ASSUME` - IAM role ARN trusted by GitHub Actions OIDC
- `NEXT_PUBLIC_COGNITO_USER_POOL_ID`
- `NEXT_PUBLIC_COGNITO_APP_CLIENT_ID`
- `NEXT_PUBLIC_FOCUS_LIST_DATA_API_URL`

The Cognito IDs and API URL are public browser configuration, but keep them as
GitHub variables so builds stay environment-driven. Never add a Cognito client
secret or AWS access key to the frontend.

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

GitHub sends an immutable subject for this repository. The organization and
repository IDs in this value are required; the name-only subject will be
rejected by AWS.

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
          "token.actions.githubusercontent.com:sub": "repo:Bubble-Bounce-Games@215603182/Focus-List@1324662628:environment:aws-s3"
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
        "s3:GetObject",
        "s3:PutObject"
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

## Cognito Return URLs

In **Cognito > User pools > Applications > App clients**, add the final HTTPS
login URL as an allowed callback URL:

```text
https://YOUR_DOMAIN/login
```

Cognito requires HTTPS except for localhost testing. Use CloudFront or another
HTTPS frontend before production login.

## Manual AWS Checklist

The repository and GitHub configuration cannot change these settings inside
your AWS account. Complete these steps in the AWS Console:

1. In **IAM > Identity providers**, confirm the provider URL is
   `https://token.actions.githubusercontent.com` and its audience is
   `sts.amazonaws.com`.
2. In **IAM > Roles > GitHubActionsFocusListS3Deploy > Trust relationships**,
   apply the trust policy above with the immutable GitHub subject.
3. Attach the S3 permissions policy above to that role, replacing
   `YOUR_BUCKET_NAME` with
   `focus-list.abhijeetanand.com-990723918097-ap-southeast-1-an`.
4. In the S3 bucket's **Properties**, enable static website hosting with
   `index.html` as the index document and `404.html` as the error document.
5. For the direct S3 website endpoint, turn off Block Public Access for this
   bucket and apply the public-read bucket policy above. If account-level Block
   Public Access is enabled, it will override the bucket setting; use the
   private CloudFront setup instead of weakening the account-wide protection.
6. For the recommended HTTPS setup, keep the bucket private and configure
   CloudFront instead of enabling public S3 website access.
7. After CloudFront is configured, add the final HTTPS login URL to the Cognito
   app client's callback and sign-out URLs.

Do not create or share AWS access keys. GitHub Actions uses the IAM role through
OIDC.

## Already Configured in GitHub

The `aws-s3` GitHub environment is configured with:

- AWS region: `ap-southeast-1`
- S3 bucket: `focus-list.abhijeetanand.com-990723918097-ap-southeast-1-an`
- IAM role: `arn:aws:iam::990723918097:role/GitHubActionsFocusListS3Deploy`
- Cognito public IDs and the private data API URL stored outside the repository

The deployment workflow builds the static website and uploads it without the
`--delete` option, so unrelated existing objects are not removed.
