import { UserData } from "./typeExtensions.js";
import { ManageUsersError } from "./classes.js";
import {
  AdminUpdateUserAttributesCommand,
  AdminUpdateUserAttributesCommandInput,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";

export default async function updateUsers(userPoolId: string, body: string): Promise<UserData[]> {
  let responseMessage = "";
  let responseDetails = "";

  const cognitoClient = new CognitoIdentityProviderClient({
    region: process.env.AWS_REGION,
  });
  let changedUsers: UserData[];

  // Check format of incoming data
  try {
    changedUsers = JSON.parse(body) as UserData[];
    if (changedUsers.length === 0) {
      throw new ManageUsersError("Unable to update users", "No users supplied");
    }
  } catch (error: unknown) {
    if (error instanceof ManageUsersError) {
      throw new ManageUsersError(error.message, error.details);
    } else if (error instanceof Error) {
      throw new Error("Invalid body format: " + error.message);
    } else {
      throw new Error("Invalid body format - unknown error occurred");
    }
  }

  const usersUpdated = new Array<UserData>(); // Record changes actually made

  try {
    for (const user of changedUsers) {
      try {
        if (!user.id || !user.firstName || !user.lastName || !user.email) {
          throw new ManageUsersError("Unable to update users", "Missing required fields");
        }
        const updateUsersParams: AdminUpdateUserAttributesCommandInput = {
          UserPoolId: userPoolId,
          Username: user.id,
          UserAttributes: [
            { Name: "given_name", Value: user.firstName },
            { Name: "family_name", Value: user.lastName },
            { Name: "email", Value: user.email },
          ],
        };
        const updateUsercommand = new AdminUpdateUserAttributesCommand(updateUsersParams);
        await cognitoClient.send(updateUsercommand); // Successful response is blank, so no need to capture it
        user.isChanged = false;
        console.log(`User updated: ${JSON.stringify(user)}`);
        usersUpdated.push(user);
      } catch (error) {
        if (error instanceof ManageUsersError) {
          throw new ManageUsersError(error.message, error.details);
        } else {
          responseMessage = `Unable to save changes to Identity Store`;
          responseDetails.length === 0 ? "" : (responseDetails += "\n");
          responseDetails += `Error updating user ${user.id}`;
          console.error(`Error updating user ${user.id}: `, error);
          throw new ManageUsersError(responseMessage, responseDetails);
        }
      }
    }
    return usersUpdated;
  } catch (error) {
    if (error instanceof ManageUsersError) {
      throw new ManageUsersError(error.message, error.details);
    } else {
      responseMessage = `Unknown error saving changes to Identity Store`;
      responseDetails.length === 0 ? "" : (responseDetails += "\n");
      console.error(`Unexpected error updating users: `, JSON.stringify(error));
      throw error;
    }
  }
}
