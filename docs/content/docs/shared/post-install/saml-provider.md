---
title: SAML Provider
weight: 2
---

<!--
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0
-->

{{< callout type="warning" >}}
This step is **conditional**.

- If you have chosen to use a SAML Provider for user accounts, this step is **required**.
- If not this step can be **skipped**.
- **Note**: this has not been implemented for the multi-tenanted version of City Trax Translate. Future versions may support the integration of one or more SAML providers.
  {{< /callout >}}

This installation guide assumes that the user directory used for the SAML provider is Microsoft Entra ID. If using a different provider, adapt the following instructions to meet that provider's requirements.

Once installation is complete, AWS CloudFormation will output the required values to update the SAML provider.

- Navigate to the [CloudFormation Console](https://console.aws.amazon.com/cloudformation/home)
- Select the app stack (E.g. `DocTran-main-app`)
- Select the "Outputs" tab

Update the SAML provider with the outputs provided.

- Update the "Identifier (Entity ID)" with the output variable `samlIdentifier`
- Update the "Reply URL (Assertion Consumer Service URL)" with the output variable `samlReplyUrl`
