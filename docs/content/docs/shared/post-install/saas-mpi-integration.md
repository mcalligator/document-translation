---
title: Configuration to work with SaaS Marketplace Integration Solution
weight: 1
---

{{< callout type="warning" >}}
This step is **required**.

{{< /callout >}}

The City Trax Translate solution uses the [AWS Marketplace Integration Solution]https://github.com/citytrax/document-translation-saas-admin) (Saas MPI for short) to enable new customers to register for and set up their tenancy of the product. The SaaS MPI solution is deployed to the City Trax Management account (ID `534936370474`), and hence requires cross-account role assumption for initial creating the initial administrative user, providing details of a customer's user entitlement, etc.

This is the required post-install procedure to ensure the two work together as intended:

## SaaS Deployment Account

### Cognito User Pool ID

1. Navigate to the [AWS Cognito Console](https://console.aws.amazon.com/cognito/v2/home)
1. Click `Identity pools` in the left-hand navigation area
1. Click on the Identity pool created as part of this deployment
1. Click on the `User access` part-way down the screen
1. Scroll down to the `Identity providers` section
1. Click on the Identity provider corresponding to the Cognito user pool created as part of this deployment
1. Copy the name of that user pool and paste this value into a suitable temporary document or multi-value clipboard storage
1. On the `Identity provider` screen displayed, locate the `Role settings` section and click `Edit`
1. In the `Role selection` section, choose `Choose role with preferred_role claim in tokens`
1. Click `Save changes`

### IAM Role ARNs

1. Navigate to the [AWS IAM Console](https://console.aws.amazon.com/iam/)
1. Click `Roles` in the left-hand navigation area
1. Click in the `Search` box under `Roles` on the main screen and enter `Entitlement`
1. Click on the role displayed and copy the `ARN` value, pasting it into the same place as the user pool value above
1. Click `Roles` again in the left-hand navigation area
1. Click in the `Search` box under `Roles` on the main screen and enter `TenantAccessManagement`
1. Click on the role displayed and copy the `ARN` value, pasting it into the same place as before

## SaaS Management Account

### IAM Role Configuration Updates

1. Navigate to the [AWS IAM Console](https://console.aws.amazon.com/iam/)
1. Click `Roles` in the left-hand navigation area
1. Click in the `Search` box under `Roles` on the main screen and enter `GetEntitlements`
1. Click on the role displayed and select the `Trust relationships` tab
1. Update the `Principal` value with that of the `Entitlement` ARN copied above
1. Click `Roles` again in the left-hand navigation area
1. Click in the `Search` box under `Roles` on the main screen and enter `GrantOrRevokeAccessRole`
1. Under `Permissions`, locate the first `Customer inline` policy and expand it
1. Edit this policy and update its `Resource` value with that of the `TenantAccessManagement` ARN above

### Lambda Function Environment Variables

1. Navigate to the [AWS Lambda Console](https://console.aws.amazon.com/lambda/)
1. Click `Functions` in the left-hand navigation area
1. In the `Filter` box under `Functions`, enter `GrantOrRevokeAccess`
1. Click on the function displayed and select the `Configuration` tab further down the page
1. Select `Environment variables` from the left-hand list and click `Edit`
1. Update the value of the `AccessManagementRoleName` variable with just the name portion of the `TenantAccessManagement` ARN
1. Update the value of the `CognitoUserPoolId` variable with that copied above
1. Click `Save`
