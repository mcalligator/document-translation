---
title: Cognito First User
weight: 1
---

<!--
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0
-->

{{< callout type="warning" >}}
This step is **conditional**.

- If you have chosen to use Cognito Local Users this step is **required**.
- If not this step can be **skipped**.
  {{< /callout >}}

[Amazon Cognito](https://aws.amazon.com/cognito/) provides an identity store that scales to millions of users and offers advanced security features to protect your consumers and business.

The solution's use of the AWS SaaS Marketplace Integration results in an administrative user being created automatically for a new customer shortly after they register for the first time. When notified of a new customer signing up, check that the associated user account has been created in the solution's Cognito user pool:

- Navigate to the [AWS Cognito Console](https://console.aws.amazon.com/cognito/v2/home)
- Select the appropriate "User pool name"
- Check that a user has been created in the "Users" section on the "Users" tab (refreshing the display if necessary)
