---
title: GitHub
weight: 2
---

<!--
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0
-->

{{< callout type="error" >}}
This step is **required**.

- If you intend to use GitHub as your source service this step is **required**.
- If not, the [CodeCommit]({{< ref "docs/shared/configuration/source-service/codecommit" >}}) configuration is **required**.
  {{< /callout >}}

{{< callout type="info" >}}
If you are not familiar with GitHub and do not use it for other projects consider using the [AWS CodeCommit method]({{< ref "docs/shared/configuration/source-service/codecommit" >}}) instead. The AWS CodeCommit method has no requirements for GitHub accounts and repositories. You are expected to understand how to convert the use of CodeCommit to GitHub in other sections of the installation guide.
{{< /callout >}}

## Prerequisites

- GitHub Account (Free tier compatible)
- Project code in your forked repository

## Authorise Access to GitHub

The CI/CD pipeline used is AWS CodePipeline, which needs to be able to access the GitHub repository - both to deploy the solution initially, and to update it in response to new code committed. It supports two ways of doing this: a GitHub Personal Access Token, and a CodeStar Connection - this is the preferred approach.

### CodeStar Connection

1. Navigate to CodePipeline in the AWS console.
2. Click on "Settings", and then "Connections".
3. Click "Create connection" and choose "GitHub".
4. Give your new connection a name.
5. Click "Connect to GitHub", then "Connect".
6. You will be redirected to your GitHub account and asked to authorise access by CodeStar. Follow the prompts from there to complete the connection. For more details, see [GitHub connections](https://docs.aws.amazon.com/codepipeline/latest/userguide/connections-github.html) in the CodePipeline documentation.

### Create a GitHub Access Token

This is the alternate, less preferred approach.

1. Navigate to [Generate a GitHub token](https://github.com/settings/tokens) in the GitHub settings
2. Select "Generate new token"
3. Select "Generate new token (classic)"
4. Enter a memorable name (E.g. `aws-123456789012-codepipeline`)
5. Select an appropriate "Expiration" period
6. Select the following scopes in the "Select scopes" section
   - `repo`
   - `admin:repo_hook`

### Store the GitHub Token in AWS Secrets Manager

1. Navigate to [AWS Secrets Manager](https://console.aws.amazon.com/secretsmanager/landing)
2. Select "Store a new secret"
   1. Select "Other type of secret" in the "Secret type" section
   2. Select "Plaintext" in the "Key/value pairs" section (Note: The secret is stored encrypted. "Plaintext" here represents what the type of value you're entering it, not the storage mechanism)
   3. Replace all the contents of the input box with your GitHub token
3. Select "Next"
   1. Enter the name `github-token` for the "Secret name"
4. Select "Next", "Next", "Store"
