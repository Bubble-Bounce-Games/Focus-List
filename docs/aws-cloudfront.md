# CloudFront HTTPS and Custom Domain

## Goal

Serve Focus List at:

```text
https://focus-list.abhijeetanand.com
```

CloudFront terminates HTTPS, serves the static export globally, and uses Origin
Access Control to read the website bucket without public S3 access.

## Part 1: Request the Certificate

CloudFront requires its ACM certificate in **US East (N. Virginia)**.

1. In AWS, change the region to **US East (N. Virginia)**, `us-east-1`.
2. Open **Certificate Manager**.
3. Select **Request a certificate**.
4. Select **Request a public certificate**.
5. Enter `focus-list.abhijeetanand.com` as the fully qualified domain name.
6. Select **DNS validation**.
7. Select **RSA 2048** and then **Request**.
8. Open the pending certificate and copy its validation CNAME name and value.

## Part 2: Validate Through Porkbun

1. Open **Porkbun > Domain Management**.
2. Open the details for `abhijeetanand.com`.
3. Open **DNS Records** and select **Add Record**.
4. Select `CNAME`.
5. In **Host**, enter the ACM validation name without the final
   `.abhijeetanand.com` portion.
6. In **Answer**, paste the complete ACM validation value.
7. Keep the default TTL and add the record.
8. Return to ACM and wait for the certificate status to become `Issued`.
9. Copy the certificate ARN. It must begin with:

```text
arn:aws:acm:us-east-1:
```

## Part 3: Create the CloudFront Stack

Stay in `us-east-1` for this stack.

1. Open **CloudFormation > Create stack > With new resources**.
2. Select **Upload a template file**.
3. Upload `infrastructure/aws/cloudfront-https.yml`.
4. Use stack name `focus-list-cloudfront-https`.
5. Confirm these parameters:

```text
WebsiteBucketName
  focus-list.abhijeetanand.com-990723918097-ap-southeast-1-an

WebsiteBucketRegion
  ap-southeast-1

DomainName
  focus-list.abhijeetanand.com

CertificateArn
  The issued us-east-1 ACM certificate ARN
```

6. Submit the stack and wait for `CREATE_COMPLETE`.
7. Open **Outputs** and copy `DistributionDomainName`.

The stack replaces the website bucket's public-read policy with a policy that
allows only this CloudFront distribution to read objects.

## Part 4: Point Porkbun to CloudFront

In Porkbun, add this DNS record:

```text
Type
  CNAME

Host
  focus-list

Answer
  The DistributionDomainName output, for example d123example.cloudfront.net
```

Remove an existing `focus-list` A, ALIAS, CNAME, or URL-forwarding record if it
conflicts. Do not remove the separate ACM validation CNAME; ACM uses it for
automatic certificate renewal.

## Part 5: Allow the HTTPS Site to Use the Data API

1. Change the AWS region back to **Asia Pacific (Singapore)**,
   `ap-southeast-1`.
2. Open the `focus-list-private-s3-data` CloudFormation stack.
3. Select **Update > Replace current template**.
4. Upload the current `infrastructure/aws/private-s3-data.yml`.
5. Keep the existing parameters and confirm:

```text
AllowedHttpsOrigin
  https://focus-list.abhijeetanand.com
```

6. Make a direct update and wait for `UPDATE_COMPLETE`.

## Part 6: Final Checks

1. Open `https://focus-list.abhijeetanand.com`.
2. Confirm HTTP redirects to HTTPS.
3. Confirm `/login/` loads directly.
4. Create a Cognito account and confirm the dashboard opens immediately.
5. Create a project, task, note, and reminder.
6. Sign out and back in, then confirm the data returns.
7. In the website S3 bucket, enable **Block all public access** after CloudFront
   works. The CloudFront OAC policy is not public and continues to work.

Do not disable the private data bucket's public-access block at any point.
