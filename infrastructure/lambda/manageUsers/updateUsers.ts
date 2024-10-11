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
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      sessionToken: process.env.AWS_SESSION_TOKEN!,
    },
  });
  let changedUsers: UserData[];
  const usersUpdated = new Array<UserData>(); // Record changes actually made

  // Check format of incoming data
  try {
    changedUsers = JSON.parse(body) as UserData[];
    if (changedUsers.length === 0) {
      throw new ManageUsersError("Unable to create users", "No users supplied");
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

  try {
    for (const user of changedUsers) {
      try {
        if (!user.id || !user.firstName || !user.lastName || !user.email) {
          throw new ManageUsersError("Unable to update users", "Missing required fields");
        }
        const client = new CognitoIdentityProviderClient({ region: "us-east-1" });
        const updateUsersParams: AdminUpdateUserAttributesCommandInput = {
          UserPoolId: userPoolId,
          Username: user.id,
          UserAttributes: [
            { Name: "given_name", Value: user.firstName },
            { Name: "family_name", Value: user.lastName },
            { Name: "email", Value: user.email },
          ],
        };
        const command = new AdminUpdateUserAttributesCommand(updateUsersParams);
        await cognitoClient.send(command); // Successful response is blank, so no need to capture it
        user.isChanged = false;
        console.log(`User updated: ${JSON.stringify(user)}`);
        usersUpdated.push(user);
        const response = await client.send(command);
        console.log(response);
      } catch (error) {
        responseMessage = `Unable to save changes to Identity Store`;
        responseDetails.length === 0 ? "" : (responseDetails += "\n");
        responseDetails += `Error updating user ${user.id}`;
        console.error(`Error updating user ${user.id}: `, error);
      }
    }
  } catch {
    throw new ManageUsersError(responseMessage, responseDetails);
  }

  return usersUpdated;
}
