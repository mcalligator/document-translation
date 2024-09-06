// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

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

export interface props {
	cognitoLocalUsers?: boolean;
	cognitoLocalUsersMfa?: string;
	cognitoLocalUsersMfaOtp?: boolean;
	cognitoLocalUsersMfaSms?: boolean;
	cognitoSamlUsers?: boolean;
	cognitoSamlMetadataUrl?: string;
	removalPolicy: cdk.RemovalPolicy;
}

export class dt_api extends Construct {
	public readonly api: appsync.GraphqlApi;
	public readonly apiSchema: CodeFirstSchema;
	public readonly identityPool: identitypool.IdentityPool;
	public readonly userPool: cognito.UserPool;
	public readonly userPoolClient: cognito.UserPoolClient;
	public readonly userPoolDomain: cognito.UserPoolDomain;

	constructor(scope: Construct, id: string, props: props) {
		super(scope, id);

		// ENVIRONMENT VARIABLES
		// ENVIRONMENT VARIABLES | GITHUB REPO
		const sourceGitBranch: string =
			process.env.sourceGitBranch !== undefined
				? process.env.sourceGitBranch
				: "main";

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
		let standardAttributes: undefined | cognito.StandardAttributes = undefined;
		standardAttributes = {
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
			phoneNumber: {
				required: true,
				mutable: true,
			},
			website: {
				// Temporarily repurposed for Tenant ID to enable server-side filtering
				required: true,
				mutable: true,
			},
		};
		let customAttributes: undefined | Record<string, cognito.ICustomAttribute> =
			undefined;
		customAttributes = {
			tenantId: new cognito.StringAttribute({
				mutable: true,
			}),
			organisationName: new cognito.StringAttribute({
				mutable: true,
			}),
		};
		let userInvitation: undefined | object = undefined;
		userInvitation = {
			emailSubject: "Invitation to use City Trax Translate",
			emailBody: `<p>This message has been sent to {username}.</p>
				<p>Your administrator has invited you to use City Trax Translate.  The link to access it has been sent to you separately.</p>
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
			props.cognitoLocalUsersMfaOtp && props.cognitoLocalUsersMfaOtp === true
				? true
				: false;

		const sms: boolean =
			props.cognitoLocalUsersMfaSms && props.cognitoLocalUsersMfaSms === true
				? true
				: false;

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

		/*
		Properties added: signInAliases; signInCaseSensitive; required user attributes (firstName, lastName, and custom:tenantId); invitation email template; remember user device (optional);
		Properties to be added: Cognito-assisted verification; and confirmation; verifying attribute changes; temporary password validity duration;
		Verification email not required in addition to invitation email for admin-created user accounts - but how is account verified?
		To do:
		1. Decide whether to use code or link in verification email sent to newly-created users (if relevant).
		2. Establish which property determines that users must verify an updated email address.
		*/

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
				domainPrefix: `document-translation-auth-${
					cdk.Stack.of(this).account
				}-${sourceGitBranch}`,
			},
		});

		// COGNITO | USERPOOL | SAMLPROVIDER
		let userPoolIdentityProviderSaml:
			| undefined
			| cognito.UserPoolIdentityProviderSaml;
		const supportedIdentityProviders: cognito.UserPoolClientIdentityProvider[] =
			[];
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
				cognito.UserPoolClientIdentityProvider.custom(
					userPoolIdentityProviderSaml.providerName,
				),
			);
		}
		// COGNITO | USERPOOL | COGNITOPROVIDER
		if (props.cognitoLocalUsers) {
			supportedIdentityProviders.push(
				cognito.UserPoolClientIdentityProvider.COGNITO,
			);
			if (cfnUserPool.userPoolAddOns.advancedSecurityMode === "OFF") {
				NagSuppressions.addResourceSuppressions(
					this.userPool,
					[
						{
							id: "AwsSolutions-COG3",
							reason:
								"Advanced Security only necessary for production environment",
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
		const userPoolHostedUICustomisation =
			new cognito.CfnUserPoolUICustomizationAttachment(
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

		// IAM Role for Cognito Admin
		const assumeRoleConditions: cdk.aws_iam.Conditions = {
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
				assumeRoleConditions,
				"sts:AssumeRoleWithWebIdentity",
			),
			description: "Tenant Administration Role",
		});

		const policyPermitTenantAdmin = new iam.Policy(this, "MyPolicy", {
			policyName: "Tenant-Admin-Permissions",
			statements: [
				new iam.PolicyStatement({
					effect: iam.Effect.ALLOW,
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
		});

		tenantAdminRole.attachInlinePolicy(policyPermitTenantAdmin);

		// Cognito Group for TenantAdmins
		const tenantAdminGroup = new cognito.CfnUserPoolGroup(
			this,
			"TenantAdminGroup",
			{
				userPoolId: this.userPool.userPoolId,
				groupName: "TenantAdmins",
				description: "For administering specific DocTran Tenant IDs",
				precedence: 0,
				roleArn: tenantAdminRole.roleArn,
			},
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
				additionalAuthorizationModes: [
					{ authorizationType: appsync.AuthorizationType.IAM },
				],
			},
			logConfig: {
				fieldLogLevel: appsync.FieldLogLevel.ALL, // ASM-ASC3
				excludeVerboseContent: false,
				role: apiLoggingRole,
			},
			xrayEnabled: true, // ASM-SF2
		});
		const policyPermitLoggingForApi = new iam.Policy(
			this,
			"permitLoggingForApi",
			{
				policyName: "CloudWatch-Logging",
				statements: [
					new iam.PolicyStatement({
						// ASM-IAM
						actions: [
							"logs:CreateLogGroup",
							"logs:CreateLogStream",
							"logs:PutLogEvents",
						],
						resources: [
							`arn:aws:states:${cdk.Stack.of(this).region}:${
								cdk.Stack.of(this).account
								// }:log-group:${this.api.logGroup}`,
							}:log-group:${this.api.logGroup.logGroupName}`,
						],
					}),
				],
			},
		);
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
