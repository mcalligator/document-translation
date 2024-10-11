import {
	AdminDeleteUserCommand,
	CognitoIdentityProviderClient,
	UserNotFoundException,
} from "@aws-sdk/client-cognito-identity-provider";

export default async function deleteUsers(
	userPoolId: string,
	rowsForDeletion: Set<string>,
) {
	console.log(
		"Set of users scheduled for deletion: " +
			JSON.stringify(Array.from(rowsForDeletion)),
	); // Delete after debugging
	const usersDeleted = new Set<string>();
	let responseMessage = "";
	let responseDetails = "";
	const response = {
		message: "",
		details: "",
		usersDeleted: new Array<string>(), // Captured in array for serialisation by Lambda runtime without data loss
	};
	const cognitoClient = new CognitoIdentityProviderClient({
		region: process.env.AWS_REGION!,
		credentials: {
			accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
			secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
			sessionToken: process.env.AWS_SESSION_TOKEN!,
		},
	});

	for (const userId of rowsForDeletion) {
		try {
			const deleteUserParams = {
				UserPoolId: userPoolId,
				Username: userId,
			};
			const deleteUserCommand = new AdminDeleteUserCommand(deleteUserParams);
			const deleteUserResponse = await cognitoClient.send(deleteUserCommand);
			console.log(
				"Result of user deletion: " + JSON.stringify(deleteUserResponse),
			);
			usersDeleted.add(userId);
		} catch (error) {
			if (responseMessage === "") responseMessage = "Error deleting users";
			if (responseDetails === "")
				responseDetails = `The following user IDs could not be deleted:`;
			responseDetails += `\n${JSON.stringify(userId)}`;
			if (error instanceof UserNotFoundException) {
				responseDetails += " (not found)";
				console.error(
					`Attempt to delete user with ID ${userId} failed; user not found`,
				);
			} else {
				console.error("Error deleting user: ", error);
			}
		}
	}
	if (usersDeleted.size === rowsForDeletion.size) {
		if (usersDeleted.size > 1) {
			responseMessage = "All users";
		} else {
			responseMessage = "User";
		}
		responseMessage += " successfully deleted";
	} else {
		response.message = responseMessage;
		response.details = responseDetails;
		throw new Error(JSON.stringify(response));
	}
	response.message = responseMessage;
	response.details = responseDetails;
	response.usersDeleted = Array.from(usersDeleted); // Array used to avoid data loss during serialisation by Lambda runtime
	return response;
}
