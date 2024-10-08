// To do:
// 1. Introduce pagination

import {
	CognitoIdentityProviderClient,
	ListUsersCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { UserData } from "./typeExtensions.js";
import filterUsers from "./filterUsers.js";

export default async function retrieveUsers(
	userPoolId: string,
	tenantId: string,
): Promise<UserData[]> {
	try {
		const cognitoClient = new CognitoIdentityProviderClient({
			region: process.env.AWS_REGION!,
			credentials: {
				accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
				secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
				sessionToken: process.env.AWS_SESSION_TOKEN!,
			},
		});
		// List users
		const listUsersParams = {
			region: process.env.AWS_REGION,
			UserPoolId: userPoolId,
			Limit: 20,
		};
		const listUsersCommand = new ListUsersCommand(listUsersParams);
		const listUsersResponse = await cognitoClient.send(listUsersCommand);
		// console.log(
		//   `List users response:\n${JSON.stringify(listUsersResponse)}`
		// );
		// Bring in pagination here....
		const retrievedUsers: UserData[] = filterUsers(listUsersResponse, tenantId);
		return retrievedUsers;
	} catch (error) {
		console.error("Error fetching users:", error);
		throw error;
	}
}
