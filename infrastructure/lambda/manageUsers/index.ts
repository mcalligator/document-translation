// To Do:
// 1. Ensure node_modules excluded from build script - DONE
// 2. Create appropriate execution role in CDK - DONE
// 3. Create appropriate logging permissions - DONE
// 4. Create appropriate Cognito access permissions in CDK - DONE
// 5. Add logging - DEFERRED
// 6. Return the required data from the function - DONE
// 7. Add environment variables and event data to SAM local instance - DONE

import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { Context } from "aws-lambda";
import filterUsers from "./filterUsers.js";
import { DeleteUsersOutcome, Event, UserData } from "./typeExtensions.js";
import retrieveUsers from "./retrieveUsers.js";
import deleteUsers from "./deleteUsers.js";
import createUsers from "./createUsers.js";
import { ManageUsersError } from "./classes.js";
import updateUsers from "./updateUsers.js";

export const handler = async (event: Event, context: Context) => {
  console.log("Event: ", event);
  console.log("Context: ", context);

  const cognitoClient = new CognitoIdentityProviderClient({
    region: process.env.AWS_REGION,
  });

  switch (event.operation) {
    case "retrieve":
      console.log("Retrieving users...");
      try {
        const retrievedUsers: UserData[] = await retrieveUsers(event.userPoolId, event.tenantId);
        return {
          statusCode: 200,
          body: retrievedUsers,
        };
      } catch (error) {
        console.error("Error fetching users:", error);
        return {
          statusCode: 500,
          body: JSON.stringify({ message: "Error fetching users" }),
        };
      }
    case "create":
      console.log("Creating users...");
      try {
        const usersAdded: UserData[] = await createUsers(
          event.userPoolId,
          JSON.stringify(event.body),
        );
        return {
          statusCode: 200,
          body: usersAdded,
        };
      } catch (error: unknown) {
        if (error instanceof ManageUsersError) {
          console.error(`ManageUsersError: ${error.message}: ${error.details}`);
          return {
            statusCode: 422,
            body: JSON.stringify({
              message: error.message,
              details: error.details,
            }),
          };
        } else {
          console.error(error);
          return {
            statusCode: 422,
            body: JSON.stringify(error),
          };
        }
      }
    case "update":
      console.log("Updating users...");
      try {
        const usersUpdated: UserData[] = await updateUsers(
          event.userPoolId,
          JSON.stringify(event.body),
        );
        return {
          statusCode: 200,
          body: usersUpdated,
        };
      } catch (error: unknown) {
        if (error instanceof ManageUsersError) {
          console.error(`ManageUsersError: ${error.message}: ${error.details}`);
          return {
            statusCode: 422,
            body: JSON.stringify({
              message: error.message,
              details: error.details,
            }),
          };
        } else {
          console.error(error);
          return {
            statusCode: 422,
            body: {
              message: JSON.stringify(error),
            },
          };
        }
      }
    case "delete":
      console.log(`Deleting users ${JSON.stringify(event.body)}`);
      try {
        const deleteUserResponse: DeleteUsersOutcome = await deleteUsers(
          event.userPoolId,
          new Set(event.body), // Convert back to Set for deletion handling
        );
        return {
          statusCode: 200,
          body: deleteUserResponse,
        };
      } catch (error) {
        console.error(error);
        return {
          statusCode: 500,
          body: error,
        };
      }
    default:
      return {
        statusCode: 405,
        body: JSON.stringify({ message: "Invalid operation" }),
      };
  }

  try {
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
      const retrievedUsers: UserData[] = filterUsers(listUsersResponse, event.tenantId);
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
