<!--
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0
-->

## Documentation

- [Documentation](https://citytrax.github.io/document-translation-saas/)
  - [Architecture](https://citytrax.github.io/document-translation-saas/docs/architecture/)
  - [Installation](https://citytrax.github.io/document-translation-saas/docs/installation/)
  - [Quick Start](https://citytrax.github.io/document-translation-saas/docs/quick-start.html)
  - [FAQ](https://citytrax.github.io/document-translation-saas/docs/faq.html)

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.

## Tags, Releases, & Branches

This project is forked from AWS' upstream [Document Translation solution](https://github.com/aws-samples/document-translation), and incorporates the latest v2.x stream changes in that project.

### Tags, Releases

Tags and Releases are used to mark commits considered as versions with the format of vX.Y.Z. Any other tag is simply a tag. These versioned releases are for deploying this project. Tags and Releases are applied to commits in the `mt-prod` branch. The latest upstream release in the 2.x stream is the `v2.3.5` tag.

### Branches

The branch `mt-dev` is used for development of this fork of the upstream project. It **may** at times be non functional and require knowledge of the project to install, update, or fix. It is not intended for general use. Instead, deploy from the `mt-prod` branch.

The `mt-test` branch is used for testing and deployment to the test environment. Other branches are used for exploration, feature development, and bug-fixing. When appropriate these branches will be merged with the `mt-dev`, `mt-test`, and `mt-prod` branches in that order.
