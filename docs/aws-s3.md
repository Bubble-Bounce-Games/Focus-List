# AWS S3 Deployment

Focus List is deployed as a static Next.js export. The S3 bucket hosts the
website files only; dashboard data stays in each visitor's browser.

## Goal

Serve the website at:

```text
http://focus-list.abhijeet-anand.com
```

This is the simplest S3-only custom-domain setup. It does not use CloudFront,
ACM, Cognito, or Supabase.

Important: direct S3 static website hosting is **HTTP only**. For HTTPS, use
GitHub Pages or CloudFront.

## Required S3 Bucket

Create a new S3 bucket named exactly:

```text
focus-list.abhijeet-anand.com
```

The bucket name must match the domain. The old bucket with the long name can
stay, but direct S3 custom-domain routing will not use it.

Use these S3 settings:

- Region: `ap-southeast-1`
- Static website hosting: enabled
- Index document: `index.html`
- Error document: `404.html`
- Block all public access: off for this website bucket only
- Bucket policy: public read for website files

Bucket policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::focus-list.abhijeet-anand.com/*"
    }
  ]
}
```

Do not use this policy on any private data bucket.

## GitHub Environment

In the GitHub environment named `aws-s3`, keep these variables:

- `AWS_REGION`: `ap-southeast-1`
- `AWS_S3_BUCKET`: `focus-list.abhijeet-anand.com`
- `AWS_ROLE_TO_ASSUME`: `arn:aws:iam::990723918097:role/GitHubActionsFocusListS3Deploy`

Cognito and private data API variables are not required.

## IAM Role

Keep the existing GitHub OIDC trust relationship. The role needs permission to
configure and upload to the website bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket", "s3:GetBucketWebsite", "s3:PutBucketWebsite"],
      "Resource": "arn:aws:s3:::focus-list.abhijeet-anand.com"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::focus-list.abhijeet-anand.com/*"
    }
  ]
}
```

If the existing role only points to the old long bucket, update the role policy
to use the new bucket ARN above.

## Deploy

Open **GitHub > Actions > Deploy AWS S3 > Run workflow**, or run:

```bash
gh workflow run "Deploy AWS S3"
```

The workflow builds the static export, configures `index.html` and `404.html`,
then uploads `out/` to the website bucket. It no longer checks Cognito or API
Gateway settings.

For account-based cloud storage, deploy the simple account API in
[docs/aws-account-api.md](./aws-account-api.md), add its public API URL to the
`aws-s3` GitHub environment, and run this S3 deployment again.

The direct website endpoint for the custom-domain bucket is:

```text
http://focus-list.abhijeet-anand.com.s3-website-ap-southeast-1.amazonaws.com/
```

## Porkbun DNS

In Porkbun DNS for `abhijeet-anand.com`, add or update this record:

```text
Type: CNAME
Host: focus-list
Answer: focus-list.abhijeet-anand.com.s3-website-ap-southeast-1.amazonaws.com
TTL: default
```

Delete any old `focus-list` record that points to GitHub Pages or CloudFront.
After DNS propagates, open:

```text
http://focus-list.abhijeet-anand.com
```
