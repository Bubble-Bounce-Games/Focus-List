# AWS S3 Deployment

Focus List is deployed as a static Next.js export. The S3 bucket hosts the
website files, and CloudFront serves the custom HTTPS domain.

## Goal

Upload the static website files to the S3 bucket used by:

```text
https://focus-list.abhijeet-anand.com
```

The deployed app uses the simple account API for optional username/password
workspace sync. It does not use Cognito or Supabase.

## Required S3 Bucket

Create a new S3 bucket named exactly:

```text
focus-list.abhijeet-anand.com
```

The bucket name must match the domain. The old bucket with the long name can
stay, but direct S3 custom-domain routing will not use it.

Use these S3 settings when serving directly from the S3 website endpoint:

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

When CloudFront is active, the bucket can be private and the CloudFront stack
manages the bucket policy.

## GitHub Environment

In the GitHub environment named `aws-s3`, keep these variables:

- `AWS_REGION`: `ap-southeast-1`
- `AWS_S3_BUCKET`: `focus-list.abhijeet-anand.com`
- `AWS_ROLE_TO_ASSUME`: `arn:aws:iam::990723918097:role/GitHubActionsFocusListS3Deploy`
- `NEXT_PUBLIC_FOCUS_LIST_ACCOUNT_API_URL`: public account API URL

Cognito and Supabase variables are not required.

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
then uploads `out/` to the website bucket. It no longer checks Cognito or
Supabase settings.

For account-based cloud storage, keep the simple account API URL in the
`aws-s3` GitHub environment and run this S3 deployment again after frontend
changes.

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

Use this direct S3 CNAME only when CloudFront is not used. For the current HTTPS
site, keep Porkbun pointed at the CloudFront distribution as described in
[docs/aws-cloudfront.md](./aws-cloudfront.md).
After DNS propagates, open:

```text
https://focus-list.abhijeet-anand.com
```
