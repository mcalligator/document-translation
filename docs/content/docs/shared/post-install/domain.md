---
title: Custom Domain
weight: 5
---

<!--
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0
-->

Once the solution is deployed (or de-deployed), the DNS record will need to be created (or updated) to point the custom domain to the CloudFront distribution.

- In the SaaS Management account console, navigate to Amazon Route 53
- Create an `A` record for the custom domain
- Toggle the `Alias` option
- Select `CloudFront Distribution`
- Select the distribution created

The distribution URL can be verified from the CloudFormation stack `DocTran-<BranchName>-App` outputs. The AWS Cloudfront URL has a structure of `abcdefg1234567.cloudfront.net`.
