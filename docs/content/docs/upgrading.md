---
title: Upgrading
weight: 004
---

<!--
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0
-->

Deployment links the [CityTrax Translate GitHub repository](https://github.com/citytrax/document-translation-saas) with a delivery pipeline. To upgrade the deployment, the codebase in that repo must be updated with the desired version of the project.

Please take care of version numbering. This project follows the [Semantic Versioning](https://semver.org/) approach. In general the versioning follows `x.y.z`. Changes to non-major version (the `y.z` part) "should" be compatible. Changes to major versions (the `x` part) will require a manual upgrade conversion/action/step. Please review the release information within GitHub for any particular notes.

# Simple Upgrade

The instructions below make certain assumptions. Please review the commands and update as you see fit.

```shell
# Remove any old copies of the repo
# Be sure there are no uncommited changes that are required but have not been backed up
rm -rf ./document-translation-saas/
```

```shell
# Clone your copy of the project from City Trax' private repo
git clone https://github.com/citytrax/document-translation-saas.git
cd document-translation-saas
# Add the upstream GitHub project to git with the name upstream
git remote add upstream https://github.com/aws-samples/document-translation.git
# Fetch the latest changes from upstream
git fetch upstream
# Show the available tags ordered numerically
git tag
# Checkout the desired version
# Check the output of the available version tags
git checkout tags/v2.x.y -b v2.x.y
git checkout mt-dev
# Merge the latest changes from upstream into the current branch
git merge v2.x.y
# Push the merged changes to the City Trax private repo
git push origin
```

# CloudShell Reset

If using CloudShell to perform the above (rather than an EC2 instance), and strange issues or storage space limits occur, this could be due to stale files or state within it. Resetting CloudShell will remove any files saved there, so download or back up any needed data before doing so.

1. Navigate to CloudShell within the AWS account where the project is deployed.
2. Click `Actions` > `Delete AWS CloudShell home directory`.
