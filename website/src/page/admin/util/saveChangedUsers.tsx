import cfnOutputs from "../../../cfnOutputs.json";

import { Credentials, UserData } from "./typeExtensions";

import {
  AdminUpdateUserAttributesCommand,
  AdminUpdateUserAttributesCommandInput,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";

export default async function saveChangedUsers(
  changedUsers: UserData[],
  adminCredentials: Credentials
) {
  let usersUpdated = new Array<UserData>();
  let responseMessage = "";
  let responseDetails = "";
  let response = {
    message: "",
    details: "",
    usersUpdated: new Array<UserData>(),
  };
  const cognitoClient = new CognitoIdentityProviderClient({
    region: cfnOutputs.awsRegion,
    credentials: {
      accessKeyId: adminCredentials.accessKeyId,
      secretAccessKey: adminCredentials.secretAccessKey,
      sessionToken: adminCredentials.sessionToken,
    },
  });
  for (const changedUser of changedUsers) {
    try {
      const updateUsersParams: AdminUpdateUserAttributesCommandInput = {
        UserPoolId: cfnOutputs.awsUserPoolsId,
        Username: changedUser.id,
        UserAttributes: [
          { Name: "given_name", Value: changedUser.firstName },
          { Name: "family_name", Value: changedUser.lastName },
          { Name: "email", Value: changedUser.email },
        ],
      };
      const command = new AdminUpdateUserAttributesCommand(updateUsersParams);
      await cognitoClient.send(command); // Successful response is blank, so no need to capture it
      changedUser.isChanged = false;
      console.log(`User updated: ${JSON.stringify(changedUser)}`);
      usersUpdated.push(changedUser);
    } catch (error) {
      responseMessage = `Unable to save changes to Identity Store`;
      responseDetails += `Error updating user ${changedUser.id}\n`;
      console.error(`Error updating user ${changedUser.id}: `, error);
    }
  }
  if (response.message === "" && usersUpdated.length > 0)
    responseMessage = "Changes saved successfully";
  response.message = responseMessage;
  response.details = responseDetails;
  response.usersUpdated = usersUpdated;
  return response;
}
