// To do:
// 1. Introduce pagination

import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  ListUsersCommandOutput,
} from "@aws-sdk/client-cognito-identity-provider";
import { UserData } from "./typeExtensions.js";
import filterUsers from "./filterUsers.js";

interface ListUsersParams {
  region: string;
  UserPoolId: string;
  PaginationToken?: string;
}

export default async function retrieveUsers(
  userPoolId: string,
  tenantId: string,
): Promise<UserData[]> {
  try {
    const cognitoClient = new CognitoIdentityProviderClient({
      region: process.env.AWS_REGION,
    });
    // List users
    const listUsersParams: ListUsersParams = {
      region: process.env.AWS_REGION!,
      UserPoolId: userPoolId,
      PaginationToken: undefined,
    };
    const listUsersCommand = new ListUsersCommand(listUsersParams);
    let listUsersResponse: ListUsersCommandOutput;
    const retrievedUsers: UserData[] = [];
    do {
      listUsersResponse = await cognitoClient.send(listUsersCommand);
      console.debug(`Set of users returned:\n${JSON.stringify(listUsersResponse)}`);
      retrievedUsers.push(...filterUsers(listUsersResponse, tenantId));
      listUsersParams.PaginationToken = listUsersResponse.PaginationToken;
    } while (listUsersResponse.PaginationToken);
    return retrievedUsers;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
}
