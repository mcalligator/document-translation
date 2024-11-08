---
title: Custom Domain
weight: 5
---

<!--
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0
-->

{{< callout type="warning" >}}
This step is **conditional**.

- If you intend to use a custom domain/URL this step is **required**.
- If not this step can be **skipped**.
  {{< /callout >}}

A custom domain allows you to specify an appropriate URL for the deployment. The default URL provided by AWS Cloudfront has a structure of `abcdefg1234567.cloudfront.net`. A custom domain allows you to specify a more user-friendly URL such as `ctx-translate.cloud`.

A TLS certificate is required for the custom domain. The required certificate for the `ctx-translate.cloud` domain has been added to the Production CTX AWS Account (`471112910241`) in the `us-east-1` region. Any other deployments using different domains will require a corresponding certificate in that deployment's AWS account.

- [AWS Certificate Manager (ACM)](https://us-east-1.console.aws.amazon.com/acm/home?region=us-east-1#/certificates/request)

Once the certificate is available, it can be used by this solution.

{{< callout type="info" >}}
The following should be performed at installation. These values are not persistent across CloudShell sessions.
{{< /callout >}}

```shell
# E.g.
# export webUiCustomDomain="ctx-translate.cloud"
# export webUiCustomDomain="test.ctx-translate.cloud"
export webUiCustomDomain=""
#
# E.g.
# export webUiCustomDomainCertificate="<YOUR-CERTIFICATE-ARN>"
# export webUiCustomDomainCertificate="arn:aws:acm:us-east-1:471112910241:certificate/abcdefgh-1234-5678-9012-ijklmnopqrst"
export webUiCustomDomainCertificate=""
```

# Post-Install

The use of a custom domain has a [post-install step]({{< ref "docs/shared/post-install/domain" >}}).
