import {
  AdminCreateUserCommand,
  AdminCreateUserCommandInput,
  CognitoIdentityProviderClient,
  UsernameExistsException,
} from "@aws-sdk/client-cognito-identity-provider";
import { UserData } from "./typeExtensions.js";
import { ManageUsersError } from "./classes.js";

export default async function createUsers(userPoolId: string, body: string): Promise<UserData[]> {
  const cognitoClient = new CognitoIdentityProviderClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      sessionToken: process.env.AWS_SESSION_TOKEN!,
    },
  });
  let responseMessage = "";
  let responseDetails = "";

  let newUsers: UserData[];

  // Check format of incoming data
  try {
    newUsers = JSON.parse(body) as UserData[];
    if (newUsers.length === 0) {
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

  const usersAdded = new Array<UserData>(); // Arry of users successfully created in Cognito

  for (const newUser of newUsers) {
    try {
      const createUserParams: AdminCreateUserCommandInput = {
        UserPoolId: userPoolId,
        DesiredDeliveryMediums: ["EMAIL"],
        Username: newUser.email,
        ForceAliasCreation: true,
        UserAttributes: [
          { Name: "email", Value: newUser.email },
          { Name: "email_verified", Value: "true" },
          { Name: "given_name", Value: newUser.firstName },
          { Name: "family_name", Value: newUser.lastName },
          { Name: "custom:tenantId", Value: newUser.tenantId },
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
      const tempUser = newUsers.find((user) => user.email === newUser.email);
      tempUser!.id = newUserId!.Value!;
      tempUser!.isNew = false;
      console.log(`newUser (persisted ID): ${JSON.stringify(newUser)}`);
      usersAdded.push(tempUser!);
    } catch (error: unknown) {
      if (error instanceof UsernameExistsException) {
        responseMessage = `User ${newUser.email} already exists`;
        console.log(responseMessage);
      } else {
        responseMessage = `Unable to save changes to Identity Store`;
        responseDetails += `Error adding user ${newUser.email}\n`;
        if (error instanceof Error) {
          console.error(`Error adding user ${newUser.email}: `, error.message);
        } else {
          console.error(`Error adding user ${newUser.email} - unknown error occurred`);
        }
      }
    }

    console.log("saveChanges: value of users");
    console.table(newUsers);
  }

  if (responseMessage !== "") throw new ManageUsersError(responseMessage, responseDetails);
  return usersAdded;
}
