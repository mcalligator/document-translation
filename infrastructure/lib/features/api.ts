// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
// This file contains several hard-coded values relating to the associated SaaS Marketplace Integration solution.
// If it proves necessary to parameterise these, the most appropriate place (for v2.x of this solution) for them is the Shared Configuration.

import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import { NagSuppressions } from "cdk-nag";

import {
  aws_iam as iam,
  aws_cognito as cognito,
  aws_wafv2 as waf,
  aws_appsync as appsync,
} from "aws-cdk-lib";
import * as identitypool from "@aws-cdk/aws-cognito-identitypool-alpha";
import { CodeFirstSchema } from "awscdk-appsync-utils";
import { dt_lambda } from "../components/lambda";

export interface props {
  cognitoLocalUsers?: boolean;
  cognitoLocalUsersMfa?: string;
  cognitoLocalUsersMfaOtp?: boolean;
  cognitoLocalUsersMfaSms?: boolean;
  cognitoSamlUsers?: boolean;
  cognitoSamlMetadataUrl?: string;
  webUiCustomDomain?: string;
  removalPolicy: cdk.RemovalPolicy;
}

export class dt_api extends Construct {
  public readonly api: appsync.GraphqlApi;
  public readonly apiSchema: CodeFirstSchema;
  public readonly identityPool: identitypool.IdentityPool;
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly userPoolDomain: cognito.UserPoolDomain;
  public readonly manageUsersFunction: dt_lambda;
  public readonly entitlementFunction: dt_lambda;

  constructor(scope: Construct, id: string, props: props) {
    super(scope, id);

    // ENVIRONMENT VARIABLES
    // ENVIRONMENT VARIABLES | GITHUB REPO
    const sourceGitBranch: string =
      process.env.sourceGitBranch !== undefined ? process.env.sourceGitBranch : "main";

    // COGNITO
    // COGNITO | USERPOOL
    let passwordPolicy: undefined | object = undefined;
    if (props.cognitoLocalUsers) {
      passwordPolicy = {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
        tempPasswordValidity: cdk.Duration.days(3),
      };
    }
    const standardAttributes: cognito.StandardAttributes = {
      givenName: {
        required: true,
        mutable: true,
      },
      familyName: {
        required: true,
        mutable: true,
      },
      email: {
        required: true,
        mutable: true,
      },
      //   phoneNumber: {
      //     required: true,
      //     mutable: true,
      //   },
    };

    const customAttributes: Record<string, cognito.ICustomAttribute> = {
      tenantId: new cognito.StringAttribute({
        mutable: true,
      }),
      organisationName: new cognito.StringAttribute({
        mutable: true,
      }),
    };

    let emailConfig: cognito.UserPoolEmail;
    if (props.webUiCustomDomain) {
      emailConfig = cognito.UserPoolEmail.withSES({
        // sourceArn: `arn:aws:ses:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:identity/${props.webUiCustomDomain}`,
        sesVerifiedDomain: props.webUiCustomDomain,
        fromEmail: `support@${props.webUiCustomDomain}`,
        fromName: "City Trax Support",
        replyTo: `support@${props.webUiCustomDomain}`,
        sesRegion: "eu-west-2",
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      emailConfig = cognito.UserPoolEmail.withCognito();
    }

    const userInvitation = {
      emailSubject: "Invitation to use City Trax Translate",
      emailBody: `<p>This message has been sent to {username}.</p>
				<p>Your administrator has invited you to use City Trax Translate.  You will be separately notified of the link to access it.</p>
				<p>Your temporary password is {####}.</p>
				<p>Kind regards,</p>
				<p>City Trax</p>`,
    };
    let mfa: undefined | cognito.Mfa = undefined;
    switch (props.cognitoLocalUsersMfa) {
      case "required":
        mfa = cognito.Mfa.REQUIRED;
        break;
      case "optional":
        mfa = cognito.Mfa.OPTIONAL;
        break;
      default:
        mfa = cognito.Mfa.OFF;
    }
    let mfaSecondFactor: undefined | cognito.MfaSecondFactor = undefined;
    const otp: boolean =
      props.cognitoLocalUsersMfaOtp && props.cognitoLocalUsersMfaOtp === true ? true : false;

    const sms: boolean =
      props.cognitoLocalUsersMfaSms && props.cognitoLocalUsersMfaSms === true ? true : false;

    if (mfa !== cognito.Mfa.OFF) {
      mfaSecondFactor = {
        otp,
        sms,
      };
    }
    this.userPool = new cognito.UserPool(this, "userPool", {
      passwordPolicy,
      mfa,
      mfaSecondFactor,
      selfSignUpEnabled: false,
      email: emailConfig,
      userInvitation,
      signInAliases: {
        username: false,
        email: true,
        phone: false,
      },
      standardAttributes,
      customAttributes,
      signInCaseSensitive: false,
      autoVerify: {
        email: true,
      },
      keepOriginal: {
        email: true,
      },
      removalPolicy: props.removalPolicy, // ASM-CFN1
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      deviceTracking: {
        challengeRequiredOnNewDevice: true,
        deviceOnlyRememberedOnUserPrompt: true,
      },
    });

    // COGNITO | USERPOOL | ADVANCED SECURITY
    const cfnUserPool = this.userPool.node.defaultChild as cognito.CfnUserPool;
    cfnUserPool.userPoolAddOns = {
      // See https://github.com/aws/aws-cdk/issues/7405
      // advancedSecurityMode: "ENFORCED", // ASM-COG3
      advancedSecurityMode: "OFF", // To reduce costs during development; enable for production
    };

    // COGNITO | USERPOOL | DOMAIN
    this.userPoolDomain = this.userPool.addDomain("cognitoDomain", {
      cognitoDomain: {
        domainPrefix: `document-translation-auth-${cdk.Stack.of(this).account}-${sourceGitBranch}`,
      },
    });

    // COGNITO | USERPOOL | SAMLPROVIDER
    let userPoolIdentityProviderSaml: undefined | cognito.UserPoolIdentityProviderSaml;
    const supportedIdentityProviders: cognito.UserPoolClientIdentityProvider[] = [];
    if (props.cognitoSamlUsers && props.cognitoSamlMetadataUrl) {
      userPoolIdentityProviderSaml = new cognito.UserPoolIdentityProviderSaml(
        this,
        "providerSaml",
        {
          metadata: {
            metadataContent: props.cognitoSamlMetadataUrl,
            metadataType: cognito.UserPoolIdentityProviderSamlMetadataType.URL,
          },
          userPool: this.userPool,
          name: "Single-Sign-On",
        },
      );
      supportedIdentityProviders.push(
        cognito.UserPoolClientIdentityProvider.custom(userPoolIdentityProviderSaml.providerName),
      );
    }
    // COGNITO | USERPOOL | COGNITOPROVIDER
    if (props.cognitoLocalUsers) {
      supportedIdentityProviders.push(cognito.UserPoolClientIdentityProvider.COGNITO);
      if (cfnUserPool.userPoolAddOns.advancedSecurityMode === "OFF") {
        NagSuppressions.addResourceSuppressions(
          this.userPool,
          [
            {
              id: "AwsSolutions-COG3",
              reason: "Advanced Security only necessary for production environment",
            },
          ],
          true,
        );
      }
    }
    // COGNITO | USERPOOL | CLIENT
    this.userPoolClient = this.userPool.addClient("webClient", {
      userPoolClientName: "webClient",
      disableOAuth: false,
      accessTokenValidity: cdk.Duration.hours(1),
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [cognito.OAuthScope.OPENID],
      },
      supportedIdentityProviders,
    });
    if (userPoolIdentityProviderSaml) {
      this.userPoolClient.node.addDependency(userPoolIdentityProviderSaml); // See https://github.com/aws/aws-cdk/issues/15692#issuecomment-884495678
    }

    // COGNITO | USERPOOL | CLIENT | HOSTED UI
    const userPoolHostedUICustomisation = new cognito.CfnUserPoolUICustomizationAttachment(
      this,
      "UserPoolHostedUICustomisation",
      {
        userPoolId: this.userPool.userPoolId,
        clientId: "ALL",
      },
    );
    userPoolHostedUICustomisation.node.addDependency(this.userPool);
    userPoolHostedUICustomisation.node.addDependency(this.userPoolDomain);

    // COGNITO | IDENTITYPOOL
    this.identityPool = new identitypool.IdentityPool(this, "IdentityPool", {
      // ASM-COG5
      allowUnauthenticatedIdentities: false,
      authenticationProviders: {
        userPools: [
          new identitypool.UserPoolAuthenticationProvider({
            userPool: this.userPool,
            userPoolClient: this.userPoolClient,
          }),
        ],
      },
    });

    // COGNITO | USER ROLES
    // COGNITO | USER ROLES | UNAUTHENTICATED
    this.identityPool.unauthenticatedRole.attachInlinePolicy(
      new iam.Policy(this, "UnauthorisedExplicitDenyAll", {
        policyName: "EXPLICIT-DENY-ALL",
        statements: [
          new iam.PolicyStatement({
            // ASM-IAM // ASM-COG7
            effect: iam.Effect.DENY,
            actions: ["*"],
            resources: ["*"],
          }),
        ],
      }),
    );

    // USER MANAGEMENT
    /*
      This involves two Lambda functions: one to determine tenant subscription entitlements (GetEntitlements), and the other to perform CRUD operations on Cognito user accounts.  Both are invoked by the Tenant Admin role assumed by admin users when authenticated by Cognito.
      There are several associated IAM roles:
      - TenantAccessManagementRole for initial tenant setup, revocation, and reinstatement (assumed by GrantOrRevokeAccess Lambda function in SaaS MPI solution)
      - TenantAdminRole assumed by admin user granting admin privileges for a given tenant.
      - ManageUsersLambdaRole: execution role for manageUsers Lambda function.
      - EntitlementLambdaRole: execution role for getEntitlement Lambda function.
      - saasAccessManagementRole: assumed by grant-revoke-access-to-product Lambda function in SaaS MPI solution
    */
    // The following three constants are currently hard-coded, but may in future be supplied as parameters supplied to the solution.
    const saasManagementAccount = "534936370474";
    const saasAccessManagementFunctionName = "ctx-mpi-prod-GrantOrRevokeAccess-N5wig0mKWS0X";
    const saasAccessManagementRole = "ctx-mpi-prod-GrantOrRevokeAccessRole-iRzXijaisSra";
    const saasEntitlementRole = "ctx-mpi-prod-GetEntitlementsRole"; // Assumed by GetEntitlements Lambda function in SaaS Deployment account
    const tenantAccessManagementRole = new iam.Role(this, "TenantAccessManagementRole", {
      assumedBy: new iam.ArnPrincipal(
        `arn:aws:iam::${saasManagementAccount}:role/${saasAccessManagementRole}`,
      ),
      description: "Role for initial tenant setup, revocation, and reinstatement",
    });
    tenantAccessManagementRole.assumeRolePolicy?.addStatements(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [
          new iam.ArnPrincipal(
            `arn:aws:iam::${saasManagementAccount}:role/${saasAccessManagementRole}`,
          ),
        ],
        actions: ["sts:AssumeRole"],
        conditions: {
          StringEquals: {
            "aws:SourceAccount": saasManagementAccount,
          },
          ArnLike: {
            "aws:SourceArn": `arn:aws:lambda:*:${saasManagementAccount}:function:${saasAccessManagementFunctionName}`,
          },
        },
      }),
    );
    tenantAccessManagementRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [this.userPool.userPoolArn],
        actions: [
          "cognito-idp:ListUsers",
          "cognito-idp:AdminCreateUser",
          "cognito-idp:AdminAddUserToGroup",
          "cognito-idp:AdminUpdateUserAttributes",
          "cognito-idp:AdminDisableUser",
          "cognito-idp:AdminEnableUser",
        ],
      }),
    );

    // IAM Role for Cognito User Admin
    const assumeTenantAdminRoleConditions: cdk.aws_iam.Conditions = {
      StringEquals: {
        "cognito-identity.amazonaws.com:aud": this.identityPool.identityPoolId,
      },
      "ForAnyValue:StringEquals": {
        "cognito-identity.amazonaws.com:amr": "authenticated",
      },
    };

    const tenantAdminRole = new iam.Role(this, "TenantAdminRole", {
      assumedBy: new iam.FederatedPrincipal(
        "cognito-identity.amazonaws.com",
        assumeTenantAdminRoleConditions,
        "sts:AssumeRoleWithWebIdentity",
      ),
      description: "Tenant Administration Role",
    });

    // Cognito Group for TenantAdmins
    new cognito.CfnUserPoolGroup(this, "TenantAdminGroup", {
      userPoolId: this.userPool.userPoolId,
      groupName: "TenantAdmins",
      description: "For administering specific DocTran Tenant IDs",
      precedence: 0,
      roleArn: tenantAdminRole.roleArn,
    });

    if (!props.cognitoLocalUsers) {
      NagSuppressions.addResourceSuppressions(
        this.userPool,
        [
          {
            id: "AwsSolutions-COG1",
            reason: "Local users not enabled by admin",
          },
          {
            id: "AwsSolutions-COG2",
            reason: "Local users not enabled by admin",
          },
        ],
        true,
      );
    } else {
      NagSuppressions.addResourceSuppressions(
        tenantAdminRole,
        [
          {
            id: "AwsSolutions-IAM5",
            reason: "TenantAdminRole only assumed by admin users authenticated through Cognito",
          },
        ],
        true,
      );
    }
    if (mfa == cognito.Mfa.OFF || mfa == cognito.Mfa.OPTIONAL) {
      NagSuppressions.addResourceSuppressions(
        this.userPool,
        [
          {
            id: "AwsSolutions-COG2",
            reason: "MFA enforcement specified by admin",
          },
        ],
        true,
      );
    }
    if (sms) {
      NagSuppressions.addResourceSuppressions(
        this.userPool,
        [
          {
            id: "AwsSolutions-IAM5",
            reason: "SMS MFA SNS topic unknown at deploy time",
          },
        ],
        true,
      );
    }

    const manageUsersLambdaRole = new iam.Role(this, "ManageUsersLambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      description: "Lambda execution role for user management",
    });
    this.manageUsersFunction = new dt_lambda(this, "manageUsersFunction", {
      functionName: "ManageUsers",
      role: manageUsersLambdaRole,
      path: "lambda/manageUsers",
      description: "Manage Users in Cognito",
    });

    const policyPermitManageUsers = new iam.Policy(this, "UserManagementPermissions", {
      policyName: "User-Management-Permissions",
      statements: [
        new iam.PolicyStatement({
          sid: "InvokeUserManagementLambdaFunction",
          effect: iam.Effect.ALLOW,
          actions: ["lambda:InvokeFunction"],
          resources: [this.manageUsersFunction.lambdaFunction.functionArn],
        }),
      ],
    });
    tenantAdminRole.attachInlinePolicy(policyPermitManageUsers);

    manageUsersLambdaRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"),
    );
    manageUsersLambdaRole.attachInlinePolicy(
      new iam.Policy(this, "manageUsersLambdaPolicy", {
        statements: [
          new iam.PolicyStatement({
            actions: [
              "cognito-idp:ListUsers",
              "cognito-idp:AdminCreateUser",
              "cognito-idp:AdminAddUserToGroup",
              "cognito-idp:AdminRemoveUserFromGroup",
              "cognito-idp:AdminUpdateUserAttributes",
              "cognito-idp:AdminDisableUser",
              "cognito-idp:AdminEnableUser",
              "cognito-idp:AdminDeleteUser",
            ],
            resources: [this.userPool.userPoolArn],
          }),
        ],
      }),
    );
    // Lambda function for getting tenant's subscription entitlement
    const entitlementLambdaRole = new iam.Role(this, "EntitlementLambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      description: "Lambda execution role for determining Marketplace subscription entitlement",
    });
    this.entitlementFunction = new dt_lambda(this, "entitlementFunction", {
      functionName: "GetEntitlement",
      role: entitlementLambdaRole,
      path: "lambda/getEntitlement",
      description: "Get tenant's Marketplace subscription entitlement",
      environment: {
        ENTITLEMENT_ROLE_ARN: `arn:aws:iam::${saasManagementAccount}:role/${saasEntitlementRole}`,
        // Entitlement values are hard-coded here:
        ENTITLEMENT_CODES: `[{ "entitlementId": "T1", "userCount": 5 },{ "entitlementId": "T2", "userCount": 8 },{ "entitlementId": "T3", "userCount": 10 }]`,
      },
    });

    const policyPermitAccessManagement = new iam.Policy(this, "TenantAccessManagementPermissions", {
      policyName: "Assume-Saas-Entitlement-Role",
      statements: [
        new iam.PolicyStatement({
          sid: "AssumeSaasEntitlementRole",
          effect: iam.Effect.ALLOW,
          actions: ["sts:AssumeRole"],
          resources: [`arn:aws:iam::${saasManagementAccount}:role/${saasEntitlementRole}`],
        }),
      ],
    });
    tenantAdminRole.attachInlinePolicy(policyPermitAccessManagement);

    const policyPermitInvokeEntitlementsFunction = new iam.Policy(
      this,
      "InvokeLocalEntitlementsFunction",
      {
        policyName: "Invoke-Entitlements-Function",
        statements: [
          new iam.PolicyStatement({
            sid: "InvokeEntitlementsFunction",
            effect: iam.Effect.ALLOW,
            actions: ["lambda:InvokeFunction"],
            resources: [this.entitlementFunction.lambdaFunction.functionArn],
          }),
        ],
      },
    );
    tenantAdminRole.attachInlinePolicy(policyPermitInvokeEntitlementsFunction);

    const policyPermitAccessManagementRoleAssumption = new iam.Policy(
      this,
      "AccessManagementRoleAssumptionPermissions",
      {
        policyName: "Entitlement-Role-Assumption",
        statements: [
          new iam.PolicyStatement({
            sid: "AssumeSaasEntitlementRole",
            effect: iam.Effect.ALLOW,
            actions: ["sts:AssumeRole"],
            resources: [`arn:aws:iam::${saasManagementAccount}:role/${saasEntitlementRole}`],
          }),
        ],
      },
    );
    entitlementLambdaRole.attachInlinePolicy(policyPermitAccessManagementRoleAssumption);

    NagSuppressions.addResourceSuppressions(
      this.manageUsersFunction,
      [
        {
          id: "AwsSolutions-L1",
          reason: "Configured runtime is NODEJS_20_X",
        },
      ],
      true,
    );

    NagSuppressions.addResourceSuppressions(
      manageUsersLambdaRole,
      [
        {
          id: "AwsSolutions-IAM4",
          reason:
            "Lambda execution role requires logging permissions granted by relevant AWS managed policy",
        },
      ],
      true,
    );

    // GRAPHQL
    // GRAPHQL | ROLE
    const apiLoggingRole = new iam.Role(this, "apiLoggingRole", {
      assumedBy: new iam.ServicePrincipal("appsync.amazonaws.com"),
      description: "API CloudWatch Logging Role",
    });

    // GRAPHQL | API
    this.apiSchema = new CodeFirstSchema();
    this.api = new appsync.GraphqlApi(this, "Api", {
      name: `${cdk.Stack.of(this).stackName}-api`,
      definition: appsync.Definition.fromSchema(this.apiSchema),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.USER_POOL, // ASM-ASC2
          userPoolConfig: {
            userPool: this.userPool,
            defaultAction: appsync.UserPoolDefaultAction.ALLOW,
          },
        },
        additionalAuthorizationModes: [{ authorizationType: appsync.AuthorizationType.IAM }],
      },
      logConfig: {
        fieldLogLevel: appsync.FieldLogLevel.ALL, // ASM-ASC3
        excludeVerboseContent: false,
        role: apiLoggingRole,
      },
      xrayEnabled: true, // ASM-SF2
    });
    const policyPermitLoggingForApi = new iam.Policy(this, "permitLoggingForApi", {
      policyName: "CloudWatch-Logging",
      statements: [
        new iam.PolicyStatement({
          // ASM-IAM
          actions: ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
          resources: [
            `arn:aws:states:${cdk.Stack.of(this).region}:${
              cdk.Stack.of(this).account
              // }:log-group:${this.api.logGroup}`,
            }:log-group:${this.api.logGroup.logGroupName}`,
          ],
        }),
      ],
    });
    apiLoggingRole?.attachInlinePolicy(policyPermitLoggingForApi);

    // INFRA | GRAPHQL | API | WAF
    const apiWaf = new waf.CfnWebACL(this, "apiWaf", {
      scope: "REGIONAL",
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: `${cdk.Stack.of(this).stackName}_apiWaf`,
        sampledRequestsEnabled: true,
      },
      defaultAction: {
        allow: {},
      },
      rules: [
        {
          name: "AWS-AWSManagedRulesCommonRuleSet",
          priority: 0,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              name: "AWSManagedRulesCommonRuleSet",
              vendorName: "AWS",
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: "AWS-AWSManagedRulesCommonRuleSet",
            sampledRequestsEnabled: true,
          },
        },
      ],
    });
    new waf.CfnWebACLAssociation(this, "ApiAclAssociation", {
      resourceArn: this.api.arn,
      webAclArn: apiWaf.attrArn,
    });

    // END
  }
}
