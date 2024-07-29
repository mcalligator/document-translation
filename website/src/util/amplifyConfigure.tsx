// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { Amplify, ResourcesConfig } from "aws-amplify";

const cfnOutputs = require("../cfnOutputs.json");

export function amplifyConfigure() {
	const authConfig: ResourcesConfig = {
		Auth: {
			Cognito: {
				// userPoolId: cfnOutputs.awsUserPoolsId,
				userPoolId: "eu-west-2_KTJgXeBDx",
				// userPoolClientId: cfnOutputs.awsUserPoolsWebClientId,
				userPoolClientId: "12oie8haqim86oiem5hgisjub5",
				identityPoolId: cfnOutputs.awsCognitoIdentityPoolId,
				allowGuestAccess: false,
				loginWith: {
					oauth: {
						domain:
							// cfnOutputs.awsCognitoOauthDomain +
							"https://document-translation-auth-905418338641-main" +
							".auth." +
							cfnOutputs.awsRegion +
							".amazoncognito.com",
						scopes: ["openid"],
						redirectSignIn: [cfnOutputs.awsCognitoOauthRedirectSignIn],
						redirectSignOut: [cfnOutputs.awsCognitoOauthRedirectSignOut],
						responseType: "code",
					},
				},
			},
		},
	};
	const apiConfig: ResourcesConfig = {
		API: {
			GraphQL: {
				endpoint: cfnOutputs.awsAppsyncGraphqlEndpoint,
				defaultAuthMode: "userPool",
			},
		},
	};
	Amplify.configure({ ...authConfig, ...apiConfig });
}

export function amplifyConfigureAppend(additionalConfig: ResourcesConfig) {
	const currentConfig = Amplify.getConfig();
	Amplify.configure({ ...currentConfig, ...additionalConfig });
}
