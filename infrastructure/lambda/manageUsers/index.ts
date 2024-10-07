// To Do:
// 1. Ensure node_modules excluded from build script - DONE
// 2. Create appropriate execution role in CDK - DONE
// 3. Create appropriate logging permissions - DONE
// 4. Create appropriate Cognito access permissions in CDK - DONE
// 5. Add logging - DEFERRED
// 6. Return the required data from the function - DONE
// 7. Add environment variables and event data to SAM local instance - DONE
// 8. Introduce pagination

import {
	CognitoIdentityProviderClient,
	ListUsersCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { Context } from "aws-lambda";
import filterUsers from "./filterUsers.js";
import { Event, UserData } from "./typeExtensions.js";

export const handler = async (event: Event, context: Context) => {
	console.log("Event: ", event);
	console.log("Context: ", context);

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
			UserPoolId: event.userPoolId,
			Limit: 20,
		};
		const listUsersCommand = new ListUsersCommand(listUsersParams);
		const listUsersResponse = await cognitoClient.send(listUsersCommand);
		// console.log(
		//   `List users response:\n${JSON.stringify(listUsersResponse)}`
		// );
		// Bring in pagination here....
		if (listUsersResponse.Users!.length > 0) {
			const retrievedUsers: UserData[] = filterUsers(
				listUsersResponse,
				event.tenantId,
			);
			return {
				statusCode: 200,
				body: retrievedUsers,
			};
		} else {
			return {
				statusCode: 200,
				body: [],
			};
		}
	} catch (error) {
		console.error("Error fetching users:", error);
		return {
			statusCode: 500,
			body: JSON.stringify({ message: "Error fetching users" }),
		};
	}
};
