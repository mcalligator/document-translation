import cfnOutputs from "../../../cfnOutputs.json";

import { useEffect } from "react";

import { Credentials, UserData } from "../util/typeExtensions";

import {
  AdminDeleteUserCommand,
  CognitoIdentityProviderClient,
  UserNotFoundException,
} from "@aws-sdk/client-cognito-identity-provider";

const deleteUsers = function (
  adminCredentials: Credentials,
  users: UserData[],
  rowsToDelete: Set<string>
) {
  const cognitoClient = new CognitoIdentityProviderClient({
    region: cfnOutputs.awsRegion,
    credentials: {
      accessKeyId: adminCredentials!.accessKeyId,
      secretAccessKey: adminCredentials!.secretAccessKey,
      sessionToken: adminCredentials!.sessionToken,
    },
  });

  useEffect(() => {
    const executeDeletion = async () => {
      // let usersToDelete = Array<string>(); // To do: check whether this is still required; if not, delete
      for (const userId of rowsToDelete) {
        try {
          const deleteUserParams = {
            UserPoolId: cfnOutputs.awsUserPoolsId,
            Username: userId,
          };
          const deleteUserCommand = new AdminDeleteUserCommand(
            deleteUserParams
          );
          const deleteUserResponse =
            await cognitoClient.send(deleteUserCommand); // Since this runs asynchronously, and is an effect, move to a hook
          console.log(
            "Result of user deletion: " + JSON.stringify(deleteUserResponse)
          );
          console.log("User set before deletion:");
          console.table(users);
          let usersCopy = [...users]; // Temporary local variable to shadow component state
          usersCopy.splice(
            usersCopy.findIndex((user) => user.id === userId),
            1
          );
          console.log("Shadow user set after deletion:");
          console.table(usersCopy);

          setUsers(usersCopy); // Update state with remaining users - not yet sure how to deal with this within custom hook
          console.log("State user set after deletion:");
          console.table(users);
        } catch (error) {
          if (error instanceof UserNotFoundException) {
            console.error(
              "Attempt to delete newly-created user before refreshing page"
            );
            throw new Error(
              "Page must be refreshed before deleting newly-created users"
            );
          } else {
            console.error("Error deleting user:", error);
            throw new Error(error);
          }
        }
      }
    };

    executeDeletion();
  });
};

export default deleteUsers;
