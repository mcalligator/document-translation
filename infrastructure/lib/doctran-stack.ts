// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { NagSuppressions } from "cdk-nag";

import { aws_s3 as s3 } from "aws-cdk-lib";

import { dt_api } from "./features/api";
import { dt_help } from "./features/help";
import { dt_web } from "./features/web";
import { dt_sharedPreferences } from "./features/preferences";
import { dt_translate } from "./features/translation/translation";
import { dt_readable } from "./features/readable/readable";
import { Config } from "./types";
import { loadConfig } from "../util/loadConfig";

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
	// OUTPUTS | WEBSITE FRONT-END | User
	public readonly appWebsiteS3Bucket: cdk.CfnOutput;
	public readonly appHostedUrl: cdk.CfnOutput;
	public readonly appHostedUrlCloudFront: cdk.CfnOutput;
	// OUTPUTS | SAML PROVIDER
	public readonly samlIdentifier: cdk.CfnOutput;
	public readonly samlReplyUrl: cdk.CfnOutput;

	constructor(scope: Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props);

		const config: Config = loadConfig();

		let removalPolicy: cdk.RemovalPolicy;
		switch (config.app.removalPolicy) {
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
			cognitoLocalUsers: config.app.cognito.localUsers.enable,
			cognitoLocalUsersMfa: config.app.cognito.localUsers.mfa.enforcement,
			cognitoLocalUsersMfaOtp: config.app.cognito.localUsers.mfa.otp,
			cognitoLocalUsersMfaSms: config.app.cognito.localUsers.mfa.sms,
			cognitoSamlUsers: config.app.cognito.saml.enable,
			cognitoSamlMetadataUrl: config.app.cognito.saml.metadataUrl,
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
		// HELP (Required feature)
		new dt_help(this, "base_help", {
			api: base_api.api,
			apiSchema: base_api.apiSchema,
			removalPolicy: removalPolicy, // ASM-CFN1
		});

		//
		// TRANSLATE (Optional feature)
		//
		if (config.app.translation.enable) {
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
				translationPii: config.app.translation.pii.enable!,
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
		if (config.app.readable.enable) {
			const base_readable = new dt_readable(this, "base_readable", {
				api: base_api.api,
				apiSchema: base_api.apiSchema,
				bedrockRegion: config.app.readable.bedrockRegion!,
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
		if (config.app.webUi.enable) {
			const signOutSuffix: string = "signout";
			const base_web = new dt_web(this, "base_web", {
				serverAccessLoggingBucket,
				userPoolClient: base_api.userPoolClient,
				removalPolicy: removalPolicy, // ASM-CFN1
				webUiCustomDomain: config.app.webUi.customDomain.domain!,
				webUiCustomDomainCertificate:
					config.app.webUi.customDomain.certificateArn!,
				signOutSuffix: signOutSuffix,
				development: config.common.development.enable,
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
			if (
				config.app.webUi.customDomain.domain &&
				config.app.webUi.customDomain.certificateArn
			) {
				this.awsCognitoOauthRedirectSignIn = new cdk.CfnOutput(
					this,
					"awsCognitoOauthRedirectSignIn",
					{ value: `https://${config.app.webUi.customDomain.domain}/` },
				);
				this.awsCognitoOauthRedirectSignOut = new cdk.CfnOutput(
					this,
					"awsCognitoOauthRedirectSignOut",
					{
						value: `https://${config.app.webUi.customDomain.domain}/${signOutSuffix}`,
					},
				);
				this.appHostedUrl = new cdk.CfnOutput(this, "appHostedUrl", {
					value: `https://${config.app.webUi.customDomain.domain}/`,
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
