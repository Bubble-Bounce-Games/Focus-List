# AWS S3 Deployment

Focus List is deployed as a static Next.js export. The S3 bucket hosts the
website files only; dashboard data stays in each visitor's browser.

## GitHub Environment

In the GitHub environment named `aws-s3`, keep these variables:

- `AWS_REGION`: `ap-southeast-1`
- `AWS_S3_BUCKET`: `focus-list.abhijeetanand.com-990723918097-ap-southeast-1-an`
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
      "Resource": "arn:aws:s3:::focus-list.abhijeetanand.com-990723918097-ap-southeast-1-an"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::focus-list.abhijeetanand.com-990723918097-ap-southeast-1-an/*"
    }
  ]
}
```

## Deploy

Open **GitHub > Actions > Deploy AWS S3 > Run workflow**, or run:

```bash
gh workflow run "Deploy AWS S3"
```

The workflow builds the static export, configures `index.html` and `404.html`,
then uploads `out/` to the website bucket. It no longer checks Cognito or API
Gateway settings.

The direct website endpoint is:

```text
http://focus-list.abhijeetanand.com-990723918097-ap-southeast-1-an.s3-website-ap-southeast-1.amazonaws.com/
```

For HTTPS and `focus-list.abhijeetanand.com`, complete the CloudFront steps in
[docs/aws-cloudfront.md](./aws-cloudfront.md).
