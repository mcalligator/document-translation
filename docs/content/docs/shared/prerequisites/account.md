---
title: Workload Account
weight: 2
---

<!--
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0
-->

{{< callout >}}
This step is **recommended**.
{{< /callout >}}

This solution is deployed into the dedicated AWS account `471112910241`(`saas-translate`), which is separate from existing applications and infrastructure. AWS Organizations allows for the management and centralised billing of multiple AWS Accounts within CIty Trax' organizational structure. This recommendation follows the AWS Well-Architected Framework.

- [Organizing Your AWS Environment Using Multiple Accounts](https://docs.aws.amazon.com/whitepapers/latest/organizing-your-aws-environment/organizing-your-aws-environment.html)
- [SEC01-BP01 Separate workloads using accounts](https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/sec_securely_operate_multi_accounts.html)

A separate dedicated AWS Account is recommended for the test environment of this solution within City Trax' AWS Organization.

- [Provision and manage accounts with Account Factory](https://docs.aws.amazon.com/controltower/latest/userguide/account-factory.html)
