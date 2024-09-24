import cfnOutputs from "../../../cfnOutputs.json";

import { Credentials, UserData } from "./typeExtensions";

import {
  AdminCreateUserCommand,
  AdminCreateUserCommandInput,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";

export default async function saveNewUsers(
  newUsers: UserData[],
  adminCredentials: Credentials
) {
  let usersAdded = new Array<UserData>();
  let responseMessage = "";
  let responseDetails = "";
  let response = {
    message: "",
    details: "",
    usersAdded: new Array<UserData>(),
  };
  const cognitoClient = new CognitoIdentityProviderClient({
    region: cfnOutputs.awsRegion,
    credentials: {
      accessKeyId: adminCredentials!.accessKeyId,
      secretAccessKey: adminCredentials!.secretAccessKey,
      sessionToken: adminCredentials!.sessionToken,
    },
  });

  // Add new users to Cognito user pool
  if (newUsers.length > 0) {
    for (const newUser of newUsers) {
      try {
        const createUserParams: AdminCreateUserCommandInput = {
          UserPoolId: cfnOutputs.awsUserPoolsId,
          DesiredDeliveryMediums: ["EMAIL"],
          Username: newUser.email,
          ForceAliasCreation: true,
          UserAttributes: [
            { Name: "email", Value: newUser.email },
            { Name: "email_verified", Value: "true" },
            { Name: "given_name", Value: newUser.firstName },
            { Name: "family_name", Value: newUser.lastName },
            { Name: "custom:tenantId", Value: newUser.tenantId }, // Replace with customer_id?
            {
              Name: "custom:organisationName",
              Value: newUser.organisationName,
            },
          ],
        };
        const createUserCommand = new AdminCreateUserCommand(createUserParams);
        const createUserResponse = await cognitoClient.send(createUserCommand);
        console.log(`newUser (temp ID): ${JSON.stringify(newUser)}`);
        // Set user's local id to value of "sub" in identity store:
        const newUserId = createUserResponse.User!.Attributes!.find((attr) => {
          return attr.Name === "sub";
        });
        let tempUser = newUsers.find((user) => user.email === newUser.email);
        tempUser!.id = newUserId!.Value!;
        tempUser!.isNew = false;
        console.log(`newUser (persisted ID): ${JSON.stringify(newUser)}`);
        usersAdded.push(newUser);
      } catch (error) {
        responseMessage = `Unable to save changes to Identity Store`;
        responseDetails += `Error adding user ${newUser.email}\n`;
        console.error(`Error adding user ${newUser.email}: `, error);
      }

      // Prepare to re-render new (and changed?) users:
      // newUsers.length = 0; // Clear newUsers array now they are committed to the identity store // Move this to handler, potentially

      console.log("saveChanges: value of users");
      console.table(newUsers);
      //   setUsers(usersCopy); // Update state so changes are reflected on the page  // Ensure this runs in handler
    }
  }
  if (responseMessage === "" && usersAdded.length > 0)
    responseMessage = "Changes written successfully to the Identity Store";
  response.message = responseMessage;
  response.details = responseDetails;
  response.usersAdded = usersAdded; // Return new users to render in table
  return response;
}
