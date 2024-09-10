---
title: Customisation
weight: 2
---

<!--
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0
-->

{{< callout type="info" >}}
This step is **optional**.
{{< /callout >}}

You can customise various elements of this application to fit your unique requirements. This includes the aspects listed below. For all of the customisation options you must commit the appropriate file to your git repository.

## Logo

Add a logo image called `logo.png` to the `src` directory. A transparent background is recommended. To accommodate different logo dimensions and sizes there is no restriction. The source image size will be rendered as is so scaling down the image is recommended.

## Help information

Help information is loaded with the following precedence. Once one of the sources provides data the loading stops.

1. Local `helpData.json` file
1. Cloud `Help` database
1. Local `sampleHelpData.json` file

To add your own help information choose the appropriate data source.

- Use a local `helpData.json` file if the information will not change and you don't want to create a DB request when the Help tab is loaded.
- Use the Cloud `Help` database if the information should be updatable on-the-fly and by non-technical users.

### Using a local `helpData.json` file

Copy the `sampleHelpData.json` to `helpData.json` and modify. If the `helpData.json` file exists the `sampleHelpData.json` and Cloud `Help` database data won't be loaded.

Only the `order` key is required and can be set to 0 for them all if no order is preferred. For other keys you can use any combination that you see fit.

```json
[
	{
		"order": "1",
		"title": "What is Amazon Translate?",
		"description": "Amazon Translate is a neural machine translation service that delivers fast, high-quality, affordable, and customizable language translation. Neural machine translation is a form of language translation automation that uses deep learning models to deliver more accurate and more natural sounding translation than traditional statistical and rule-based translation algorithms. With Amazon Translate, you can localize content such as websites and applications for your diverse users, easily translate large volumes of text for analysis, and efficiently enable cross-lingual communication between users. Intento recently ranked Amazon Translate as the top machine translation provider in 2020 across 14 language pairs, 16 industry sectors and 8 content types.",
		"link": "https://aws.amazon.com/translate/"
	}
]
```

### Using the Cloud `Help` database

Only the `order` key is required and can be set to 0 for them all if no order is preferred. For other keys you can use any combination that you see fit.

The DynamoDB Help table view provides a tabular view of the backend data for an application. You can use this feature to test your models and to provide team members with the ability to create and update an application's data in real-time instead of building admin views.

- Load the AWS Console
- Navigate to Dynamo DB
- Select "Tables" > "Explore items" from the menu
- Select the `helpTable` table.

If the Cloud `Help` database data is loaded the `sampleHelpData.json` won't be loaded.

## Footer links

Footer links are loaded with the following precedence. Once one of the sources provides data the loading stops.

<!-- 1. Local `footerLinks.json` file
1. Cloud `footerlinks` database
1. Local `sampleFooterLinks.json` file -->

1. Local `footerLinks.json` file
1. Local `sampleFooterLinks.json` file

To add your own footer links copy the `sampleFooterLinks.json` to `footerLinks.json` and modify. If the `footerLinks.json` file exists the `sampleFooterLinks.json` won't be loaded.

None of the keys are required so you can use any combination that you see fit. The sample file shows various possible combinations.

```json
[
	{
		"prefix": "Prefix",
		"url": "/",
		"text": "link-text",
		"suffix": "suffix"
	}
]
```

Note: `footerLinks.json` is excluded from this project via the `.gitignore`. This prevents the file from being committed into git repositories.
