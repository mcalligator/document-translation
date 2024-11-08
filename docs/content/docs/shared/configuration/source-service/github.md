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

- As GitHub is now the only option for hosting this solution's code, this step is **required**.
  {{< /callout >}}

## Prerequisites

- GitHub Account (Free tier compatible)
- A copy of the solution's source code in a suitably-named repository in that account (`citytrax/document-translation-saas` in CTX' case)

## Authorise Access to GitHub

The CI/CD pipeline used is AWS CodePipeline, which needs to be able to access the GitHub repository - both to deploy the solution initially, and to update it in response to new code committed. It supports two ways of doing this: a CodeStar Connection, and a GitHub Access Token. The first is the preferred approach.

### CodeConnections Connection

This is the preferred way of linking CodePipeline with GitHub.

1. Navigate to CodePipeline in the AWS console.
2. Click on "Settings", and then "Connections".
3. Click "Create connection" and choose "GitHub".
4. Give your new connection a name.
5. Click "Connect to GitHub", then "Connect".
6. You will be redirected to your GitHub account and asked to authorise access from your AWS account. Follow the prompts from there to complete the connection. For more details, see [GitHub connections](https://docs.aws.amazon.com/codepipeline/latest/userguide/connections-github.html) in the CodePipeline documentation.

### GitHub Access Token

#### Create the Token

This is the alternate, less preferred approach (since it is associated with an individual user's GitHub token).

1. Navigate to [Generate a GitHub token](https://github.com/settings/tokens) in the GitHub settings
2. Select "Generate new token"
3. Select "Generate new token (classic)"
4. Enter a memorable name (E.g. `aws-123456789012-codepipeline`)
5. Select an appropriate "Expiration" period
6. Select the following scopes in the "Select scopes" section
   - `repo`
   - `admin:repo_hook`

#### Store the GitHub Token in AWS Secrets Manager

1. Navigate to [AWS Secrets Manager](https://console.aws.amazon.com/secretsmanager/landing)
2. Select "Store a new secret"
   1. Select "Other type of secret" in the "Secret type" section
   2. Select "Plaintext" in the "Key/value pairs" section (Note: The secret is stored encrypted. "Plaintext" here represents what the type of value you're entering it, not the storage mechanism)
   3. Replace all the contents of the input box with your GitHub token
3. Select "Next"
   1. Enter the name `github-token` for the "Secret name"
4. Select "Next", "Next", "Store"
