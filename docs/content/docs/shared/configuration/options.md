---
title: Options
weight: 4
---

<!--
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0
-->

{{< callout type="error" >}}
This step is **required**. Many options below are required whilst others are optional.
{{< /callout >}}

{{< callout type="info" >}}
It is important that the below options are defined in the same shell session as the deploy step.
{{< /callout >}}

This solution is configurable to meet your specific needs. In this step you will specify which features you want enabled or disabled. To configure an option use the terminal (e.g. [CloudShell]({{< ref "docs/shared/prerequisites/cloudshell" >}}) or a suitable Amazon EC2 instance) to enter the relevant commands.

## Source Code Service

The git source type information is a **required** configuration. Now that AWS CodeCommit is effectively being discontinued, GitHub is the only hosting service for CTX code.

**If using GitHub**

```sh
export sourceGitService="github"
export sourceGitRepo="citytrax/document-translation-saas"
export sourceConnectionArn="<arn of connection manually created in CodePipeline>"
```

## Source Code Branch

The git source repository information is a **required** configuration.

```sh
export sourceGitBranch="mt-prod"
```

## User Authentication

This upstream, single-tenanted solution supports two sources of user authentication, which can be enabled individually or together. However, the CTX multi-tenanted variant supports only Cognito Local Users.

1. AWS Cognito Local Users

- Either for testing, or for multi-tenanted use
- Users are managed within the AWS Account
- Users are not linked to existing user directories
- Configurable MFA settings

1. AWS Cognito SAML Users

- For single-tenanted use
- Users are managed by a SAML provider
- Users are linked to existing user directories
- Configuration of SAML provider is out of scope for this installation guide

### Enable Cognito Local Users

```sh
export cognitoLocalUsers="true"
export cognitoLocalUsersMfa="required"
export cognitoLocalUsersMfaOtp="true"
export cognitoLocalUsersMfaSms="true"
```

### Enable Cognito SAML Provider Users

The single-tenanted solution is integrated with existing user accounts via SAML 2.0. his is supported by most user management systems, such as Microsoft Entra ID. A metadata URL is provided by the SAML provider and used by this solution. This URL looks like this `https://login.microsoftonline.com/yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy/federationmetadata/2007-06/federationmetadata.xml?appid=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`.

This guide assumes that the user directory used for the SAML provider is Microsoft Entra ID. Configuration of Entra ID is out of scope. An Enterprise Application will need to be created. Dummy information can be used for the "Identifier (Entity ID)" and "Reply URL (Assertion Consumer Service URL)" to be updated later in this guide. The "App Federation Metadata Url" is a dependency.

```sh
export cognitoSamlUsers="true"
export cognitoSamlMetadataUrl="https://domain.tld/path/to/metadata.xml"
```

## Enable Web UI

This solution ships with a Web UI which is can be simply customised to fit your branding. Where integration with existing systems or much larger customisation is desired, the solution can be deployed without the web UI, providing just an API to integrate with.

```sh
export webUi="true"
```

## All Options

| Option                    | Example value                     | Default  | Required?                         | Description                                     |
| ------------------------- | --------------------------------- | -------- | --------------------------------- | ----------------------------------------------- |
| **Removal Policies**      |                                   |          |                                   |                                                 |
| `appRemovalPolicy`        | `destroy`, `snapshot`, `retain`   | `retain` | Not required                      | Removal policy for deployed app components      |
| `pipelineRemovalPolicy`   | `destroy`, `snapshot`, `retain`   | `retain` | Not required                      | Removal policy for deployed pipeline components |
| **Users - Cognito Local** |                                   |          |                                   |                                                 |
| `cognitoLocalUsers`       | `true`, `false`                   | `false`  | Yes, **if not** using SAML users  | Enable locally managed users                    |
| `cognitoLocalUsersMfa`    | `required`, `optional`, `off`     | `off`    | Not required                      | Enable MFA for locally managed users            |
| `cognitoLocalUsersMfaOtp` | `true`, `false`                   | `false`  | Not required                      | Enable OTP MFA for locally managed users        |
| `cognitoLocalUsersMfaSms` | `true`, `false`                   | `false`  | Not required                      | Enable SMS MFA for locally managed users        |
| **Users - SAML Provider** |                                   |          |                                   |                                                 |
| `cognitoSamlUsers`        | `true`, `false`                   | `false`  | Yes, **if not** using local users | Enable SAML managed users                       |
| `cognitoSamlMetadataUrl`  | "https://domain.tld/metadata.xml" | None     | Yes, **if** using SAML users      | Metadata XML from the SAML provider             |
| **Git Source**            |                                   |          |                                   |                                                 |
| `sourceGitService`        | "github"                          | "github" | Required                          | Your repository for source code                 |
| `sourceGitRepo`           | "\<owner>/\<repo>"                | None     | Yes, **always** required          | Your repository for source code                 |
| `sourceGitBranch`         | "main", "test", "app"             | `main`   | Not required                      | Your repository branch for source code          |
| **Web UI**                |                                   |          |                                   |                                                 |
| `webUi`                   | `true`, `false`                   | `false`  | Not required                      | Enable web UI for using this solution           |
