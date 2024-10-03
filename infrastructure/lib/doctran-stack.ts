// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { NagSuppressions } from "cdk-nag";

import {
	aws_s3 as s3,
	aws_iam as iam,
	aws_lambda as lambda,
	aws_lambda_nodejs as nodejs,
} from "aws-cdk-lib";

import { dt_api } from "./features/api";
import { dt_help } from "./features/help";
import { dt_web } from "./features/web";
import { dt_sharedPreferences } from "./features/preferences";
import { dt_translate } from "./features/translation/translation";
import { dt_readable } from "./features/readable/readable";
import { getSharedConfiguration } from "./shared";

// STATIC VARS
const s3PrefixPrivate = "private";

export class DocTranStack extends cdk.Stack {
	// OUTPUTS
	public readonly appStackId: cdk.CfnOutput;
	public readonly appStackName: cdk.CfnOutput;
	public readonly appWebsiteDistribution: cdk.CfnOutput;

	// OUTPUTS | WEBSITE FRONT-END
	// OUTPUTS | WEBSITE FRONT-END | React
	public readonly awsRegion: cdk.CfnOutput;
	public readonly awsAppsyncId: cdk.CfnOutput;
	public readonly awsAppsyncGraphqlEndpoint: cdk.CfnOutput;
	public readonly awsCognitoIdentityPoolId: cdk.CfnOutput;
	public readonly awsUserPoolsId: cdk.CfnOutput;
	public readonly awsUserPoolsWebClientId: cdk.CfnOutput;
	public readonly awsCognitoOauthDomain: cdk.CfnOutput;
	public readonly awsUserFilesS3Bucket: cdk.CfnOutput;
	public readonly awsReadableS3Bucket: cdk.CfnOutput;
	public readonly awsCognitoOauthRedirectSignIn: cdk.CfnOutput;
	public readonly awsCognitoOauthRedirectSignOut: cdk.CfnOutput;
	public readonly awsLambdaUserManagementFunction: cdk.CfnOutput; // To invoke user administration Lambda function
	// OUTPUTS | WEBSITE FRONT-END | User
	public readonly appWebsiteS3Bucket: cdk.CfnOutput;
	public readonly appHostedUrl: cdk.CfnOutput;
	public readonly appHostedUrlCloudFront: cdk.CfnOutput;
	// OUTPUTS | SAML PROVIDER
	public readonly samlIdentifier: cdk.CfnOutput;
	public readonly samlReplyUrl: cdk.CfnOutput;

	constructor(scope: Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props);

		const {
			development,
			cognitoLocalUsers,
			cognitoLocalUsersMfa,
			cognitoLocalUsersMfaOtp,
			cognitoLocalUsersMfaSms,
			cognitoSamlUsers,
			cognitoSamlMetadataUrl,
			translation,
			translationPii,
			readable,
			readableBedrockRegion,
			webUi,
			webUiCustomDomain,
			webUiCustomDomainCertificate,
			appRemovalPolicy,
		} = getSharedConfiguration();

		let removalPolicy: cdk.RemovalPolicy;
		switch (appRemovalPolicy) {
			case "destroy":
				removalPolicy = cdk.RemovalPolicy.DESTROY;
				break;
			case "snapshot":
				removalPolicy = cdk.RemovalPolicy.SNAPSHOT;
				break;
			default:
				removalPolicy = cdk.RemovalPolicy.RETAIN;
		}

		// S3 LOGS (Required feature)
		const serverAccessLoggingBucket = new s3.Bucket(
			this,
			"serverAccessLoggingBucket",
			{
				objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
				blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, // ASM-S2
				encryption: s3.BucketEncryption.S3_MANAGED, // ASM-S3
				enforceSSL: true, // ASM-S10
				versioned: true,
				removalPolicy: removalPolicy, // ASM-CFN1
			},
		);
		NagSuppressions.addResourceSuppressions(
			serverAccessLoggingBucket,
			[
				{
					id: "AwsSolutions-S1",
					reason:
						"This bucket is the AccessLogs destination bucket for other buckets.",
				},
			],
			true,
		);

		//
		// API (Required feature)
		//
		const base_api = new dt_api(this, "base_api", {
			cognitoLocalUsers,
			cognitoLocalUsersMfa,
			cognitoLocalUsersMfaOtp,
			cognitoLocalUsersMfaSms,
			cognitoSamlUsers,
			cognitoSamlMetadataUrl,
			removalPolicy: removalPolicy, // ASM-CFN1
		});

		// OUTPUTS
		this.samlReplyUrl = new cdk.CfnOutput(this, "samlReplyUrl", {
			value: `https://${base_api.userPoolDomain.domainName}.auth.${this.region}.amazoncognito.com/saml2/idpresponse`,
		});
		this.samlIdentifier = new cdk.CfnOutput(this, "samlIdentifier", {
			value: `urn:amazon:cognito:sp:${base_api.userPool.userPoolId}`,
		});
		this.awsUserPoolsWebClientId = new cdk.CfnOutput(
			this,
			"awsUserPoolsWebClientId",
			{ value: base_api.userPoolClient.userPoolClientId },
		);
		this.awsUserPoolsId = new cdk.CfnOutput(this, "awsUserPoolsId", {
			value: base_api.userPool.userPoolId,
		});
		this.awsCognitoOauthDomain = new cdk.CfnOutput(
			this,
			"awsCognitoOauthDomain",
			{ value: base_api.userPoolDomain.domainName },
		);
		this.awsCognitoIdentityPoolId = new cdk.CfnOutput(
			this,
			"awsCognitoIdentityPoolId",
			{ value: base_api.identityPool.identityPoolId },
		);
		this.awsAppsyncId = new cdk.CfnOutput(this, "awsAppsyncId", {
			value: base_api.api.apiId,
		});
		this.awsAppsyncGraphqlEndpoint = new cdk.CfnOutput(
			this,
			"awsAppsyncGraphqlEndpoint",
			{ value: base_api.api.graphqlUrl },
		);

		//
		// USER MANAGEMENT (Required feature)
		//
		const manageUsersLambdaRole = new iam.Role(this, "manageUsersLambdaRole", {
			assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
			description: "Lambda execution role for user management",
		});
		// Using CDK NodejsFunction construct rather than dt_lambda for access to addPermission method for resource-based policy
		const manageUsersFunction = new nodejs.NodejsFunction(
			this,
			"manageUsersFunction",
			{
				description: "Manage Users in Cognito",
				entry: "lambda/manageUsers/index.ts",
				handler: "handler",
				role: manageUsersLambdaRole,
				environment: {
					LOG_LEVEL: "info",
				},
				bundling: {
					nodeModules: ["@aws-sdk/client-cognito-identity-provider"],
				},
				timeout: cdk.Duration.seconds(30),
				architecture: lambda.Architecture.ARM_64,
				runtime: lambda.Runtime.NODEJS_LATEST,
			},
		);
		manageUsersFunction.addPermission("lambdaManageUsersPermission", {
			principal: base_api.tenantAdminRole,
			sourceArn: base_api.userPool.userPoolArn,
		});
		manageUsersLambdaRole.addManagedPolicy(
			iam.ManagedPolicy.fromAwsManagedPolicyName(
				"service-role/AWSLambdaBasicExecutionRole",
			),
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
						resources: [base_api.userPool.userPoolArn],
					}),
				],
			}),
		);
		//
		// OUTPUTS
		this.awsLambdaUserManagementFunction = new cdk.CfnOutput(
			this,
			"awsLambdaUserManagementFunction",
			{
				value: manageUsersLambdaRole.roleArn,
			},
		);

		//
		// HELP (Required feature)
		new dt_help(this, "base_help", {
			api: base_api.api,
			apiSchema: base_api.apiSchema,
			removalPolicy: removalPolicy, // ASM-CFN1
		});

		//
		// TRANSLATE (Optional feature)
		//
		if (translation) {
			const translationLifecycleDefault: number =
				process.env.translationLifecycleDefault &&
				parseInt(process.env.translationLifecycleDefault) >= 1 &&
				parseInt(process.env.translationLifecycleDefault) <= 2147483647
					? parseInt(process.env.translationLifecycleDefault)
					: 7;
			const translationLifecyclePii: number =
				process.env.translationLifecyclePii &&
				parseInt(process.env.translationLifecyclePii) >= 1 &&
				parseInt(process.env.translationLifecyclePii) <= 2147483647
					? parseInt(process.env.translationLifecyclePii)
					: 3;

			const base_translate = new dt_translate(this, "base_translate", {
				serverAccessLoggingBucket,
				contentLifecycleDefault: translationLifecycleDefault,
				contentLifecyclePii: translationLifecyclePii,
				s3PrefixPrivate,
				identityPool: base_api.identityPool,
				api: base_api.api,
				apiSchema: base_api.apiSchema,
				removalPolicy: removalPolicy, // ASM-CFN1
				translationPii,
			});
			// OUTPUTS
			this.awsUserFilesS3Bucket = new cdk.CfnOutput(
				this,
				"awsUserFilesS3Bucket",
				{ value: base_translate.contentBucket.bucketName },
			);
		}

		//
		// READABLE (Optional feature)
		//
		if (readable) {
			const base_readable = new dt_readable(this, "base_readable", {
				api: base_api.api,
				apiSchema: base_api.apiSchema,
				bedrockRegion: readableBedrockRegion,
				identityPool: base_api.identityPool,
				removalPolicy: removalPolicy, // ASM-CFN1
				serverAccessLoggingBucket,
			});
			// OUTPUTS
			this.awsReadableS3Bucket = new cdk.CfnOutput(
				this,
				"awsReadableS3Bucket",
				{ value: base_readable.contentBucket.bucketName },
			);
		}

		//
		// WEBSITE (Optional feature)
		//
		if (webUi) {
			const signOutSuffix: string = "signout";
			const base_web = new dt_web(this, "base_web", {
				serverAccessLoggingBucket,
				userPoolClient: base_api.userPoolClient,
				removalPolicy: removalPolicy, // ASM-CFN1
				webUiCustomDomain: webUiCustomDomain,
				webUiCustomDomainCertificate: webUiCustomDomainCertificate,
				signOutSuffix: signOutSuffix,
				development: development,
			});
			new dt_sharedPreferences(this, "base_sharedPreferences", {
				api: base_api.api,
				apiSchema: base_api.apiSchema,
				removalPolicy: removalPolicy, // ASM-CFN1
			});
			// OUTPUTS
			this.appWebsiteS3Bucket = new cdk.CfnOutput(this, "appWebsiteS3Bucket", {
				value: base_web.websiteBucket.bucketName,
			});
			this.appWebsiteDistribution = new cdk.CfnOutput(
				this,
				"appWebsiteDistribution",
				{ value: base_web.websiteDistribution.distributionId },
			);
			if (webUiCustomDomain && webUiCustomDomainCertificate) {
				this.awsCognitoOauthRedirectSignIn = new cdk.CfnOutput(
					this,
					"awsCognitoOauthRedirectSignIn",
					{ value: `https://${webUiCustomDomain}/` },
				);
				this.awsCognitoOauthRedirectSignOut = new cdk.CfnOutput(
					this,
					"awsCognitoOauthRedirectSignOut",
					{ value: `https://${webUiCustomDomain}/${signOutSuffix}` },
				);
				this.appHostedUrl = new cdk.CfnOutput(this, "appHostedUrl", {
					value: `https://${webUiCustomDomain}/`,
				});
				this.appHostedUrlCloudFront = new cdk.CfnOutput(
					this,
					"appHostedUrlCloudFront",
					{
						value: `https://${base_web.websiteDistribution.domainName}/`,
					},
				);
			} else {
				this.awsCognitoOauthRedirectSignIn = new cdk.CfnOutput(
					this,
					"awsCognitoOauthRedirectSignIn",
					{ value: `https://${base_web.websiteDistribution.domainName}/` },
				);
				this.awsCognitoOauthRedirectSignOut = new cdk.CfnOutput(
					this,
					"awsCognitoOauthRedirectSignOut",
					{
						value: `https://${base_web.websiteDistribution.domainName}/${signOutSuffix}`,
					},
				);
				this.appHostedUrl = new cdk.CfnOutput(this, "appHostedUrl", {
					value: `https://${base_web.websiteDistribution.domainName}/`,
				});
			}
		}

		// OUTPUTS
		this.awsRegion = new cdk.CfnOutput(this, "awsRegion", {
			value: this.region,
		});
		this.appStackName = new cdk.CfnOutput(this, "appStackName", {
			value: this.stackName,
		});
		this.appStackId = new cdk.CfnOutput(this, "appStackId", {
			value: this.stackId,
		});
		// END
	}
}
