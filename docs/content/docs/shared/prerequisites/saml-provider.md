---
title: SAML Provider
weight: 6
---

<!--
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0
-->

{{< callout type="warning" >}}
This step is **conditional**.

- If you intend to use a SAML Provider for user authentication this step is **required**.
- If not this step can be **skipped**.
- **Note**: this has not been implemented for the multi-tenanted version of City Trax Translate. Future versions may support the integration of one or more SAML providers.
  {{< /callout >}}

The upstream solution can be integrated with existing user accounts via SAML 2.0. This is supported by most user management systems, such as Microsoft Entra ID. A metadata URL is provided by the SAML provider and used by this solution. Configuration of any specific SAML Provider is out of scope for this installation guide. This URL looks like this:

```
https://login.microsoftonline.com/yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy/federationmetadata/2007-06/federationmetadata.xml?appid=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

This installation guide assumes that the user directory used for the SAML provider is Microsoft Entra ID. Configuration of Entra ID is out of scope for this installation guide.

Where an Enterprise Application needs to be created, dummy information can be used for the following, updated as a post-install step.

- `Identifier (Entity ID)`
- `Reply URL (Assertion Consumer Service URL)`

The `App Federation Metadata Url` is a dependency for this guide.

# Post-Install

The use of a SAML Provider has a [post-install step]({{< ref "docs/shared/post-install/saml-provider" >}}).
