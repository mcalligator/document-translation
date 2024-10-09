import cfnOutputs from "../../../cfnOutputs.json";

import { ManageUsersError } from "./classes";
import { Credentials, UserData } from "./typeExtensions";

import {
  InvokeCommand,
  InvokeCommandInput,
  InvokeCommandOutput,
  LambdaClient,
} from "@aws-sdk/client-lambda";

export default async function saveNewUsers(
  tenantId: string,
  newUsers: UserData[],
  adminCredentials: Credentials
) {
  let usersAdded = new Array<UserData>();
  let response = {
    message: "",
    details: "",
    usersAdded: usersAdded,
  };

  const lambdaFunctionName = cfnOutputs.manageUsersFunctionName;
  const userPoolId = cfnOutputs.awsUserPoolsId;

  const lambdaClient = new LambdaClient({
    region: cfnOutputs.awsRegion,
    credentials: {
      accessKeyId: adminCredentials!.accessKeyId,
      secretAccessKey: adminCredentials!.secretAccessKey,
      sessionToken: adminCredentials!.sessionToken,
    },
  });

  if (newUsers.length > 0) {
    // Leave this check in the front end
    const lambdaParams: InvokeCommandInput = {
      FunctionName: lambdaFunctionName,
      InvocationType: "RequestResponse",
      Payload: JSON.stringify({
        tenantId: tenantId,
        userPoolId: userPoolId,
        operation: "create",
        body: newUsers,
      }),
    };

    try {
      const lambdaInvokeCommand = new InvokeCommand(lambdaParams);
      const lambdaInvokeResponse: InvokeCommandOutput =
        await lambdaClient.send(lambdaInvokeCommand);
      console.log(
        `Lambda invocation response:\n${new TextDecoder().decode(lambdaInvokeResponse.Payload)}`
      );
      const responsePayload = JSON.parse(
        new TextDecoder().decode(lambdaInvokeResponse.Payload) // Might need to omit Payload
      );
      switch (responsePayload.statusCode) {
        case 200:
          response.message = "New users created successfully";
          response.usersAdded = responsePayload.body.usersAdded;
          console.log(`Users added:\n`);
          console.table(usersAdded);
          return response;
        case 403:
          throw new ManageUsersError(
            "Insufficient permissions to create users",
            "No users created"
          );
        case 422:
          throw new ManageUsersError(
            responsePayload.body.message,
            responsePayload.body.details
          );
        default:
          throw new ManageUsersError(
            "Failed to create users for reasons unknown",
            "No users created"
          );
      }
    } catch (error) {
      console.error(JSON.stringify(error));
      throw error;
    }
  }
}
