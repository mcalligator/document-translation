import cfnOutputs from "../../../cfnOutputs.json";

import { Credentials } from "./typeExtensions";

import {
  AdminDeleteUserCommand,
  CognitoIdentityProviderClient,
  UserNotFoundException,
} from "@aws-sdk/client-cognito-identity-provider";

export default async function deleteUsers(
  rowsForDeletion: Set<string>,
  adminCredentials: Credentials
) {
  console.log(
    "Actual set of users to be deleted: " +
      JSON.stringify(Array.from(rowsForDeletion))
  ); // Delete after debugging
  let usersDeleted = new Set<string>();
  let responseMessage = "";
  let responseDetails = "";
  let response = { message: "", details: "", usersDeleted: new Set<string>() };
  const cognitoClient = new CognitoIdentityProviderClient({
    region: cfnOutputs.awsRegion,
    credentials: {
      accessKeyId: adminCredentials!.accessKeyId,
      secretAccessKey: adminCredentials!.secretAccessKey,
      sessionToken: adminCredentials!.sessionToken,
    },
  });

  for (const userId of rowsForDeletion) {
    try {
      const deleteUserParams = {
        UserPoolId: cfnOutputs.awsUserPoolsId,
        Username: userId,
      };
      const deleteUserCommand = new AdminDeleteUserCommand(deleteUserParams);
      const deleteUserResponse = await cognitoClient.send(deleteUserCommand);
      console.log(
        "Result of user deletion: " + JSON.stringify(deleteUserResponse)
      );
      usersDeleted.add(userId);
    } catch (error) {
      if (error instanceof UserNotFoundException) {
        // Retain until newly-created users' IDs successfully replaced with Cognito sub attribute
        responseMessage =
          "Page must be refreshed before deleting newly-created users";
        responseDetails += `User with ID ${userId} not deleted\n`;
        console.error(
          "Attempt to delete newly-created user before refreshing page"
        );
      } else {
        if (responseMessage === "")
          responseMessage = `Error deleting user with ID ${userId}`;
        console.error("Error deleting user: ", error);
      }
    }
  }
  if (usersDeleted.size === rowsForDeletion.size) {
    responseMessage = "All users successfully deleted";
  }
  response.message = responseMessage;
  response.details = responseDetails;
  response.usersDeleted = usersDeleted;
  return response;
}
