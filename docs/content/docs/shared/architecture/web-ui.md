---
title: Web UI
---

<!--
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0
-->

## Overview

The client is created with [React JS](https://reactjs.org/), utilising [AWS Amplify](https://aws.amazon.com/amplify/) libraries for interaction with AWS services, and [AWS Cloudscape Design](https://cloudscape.design/) UI components.

{{< figure src="/document-translation-saas/diagrams/web_client.png" title="Web UI" >}}

## Hosting

The site is hosted in an Amazon Simple Storage Service bucket and served from an Amazon CloudFront distribution. The bucket does not allow public access and is only accessible via the CloudFront distribution. The bucket only contains non-sensitive Web UI files.

## Authentication

Authentication is provided by [Cognito](https://aws.amazon.com/cognito/) and is required to use the application. Unauthenticated users are redirected to a Cognito login page. Multiple authentication options are supported in the single-tenanted solution (but only Cognito Local Users in the multi-tenanted variant):

1. Cognito SAML 2.0 Provider Users (e.g. Microsoft Entra ID)
2. Cognito Local Users
3. Both

![Client login](/img/client_login_both.png)
