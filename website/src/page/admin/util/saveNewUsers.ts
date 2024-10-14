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
    const lambdaParams: InvokeCommandInput = {
      FunctionName: lambdaFunctionName,
      InvocationType: "RequestResponse",
      Payload: new TextEncoder().encode(
        JSON.stringify({
          tenantId: tenantId,
          userPoolId: userPoolId,
          operation: "create",
          body: newUsers,
        })
      ),
    };

    try {
      const lambdaInvokeCommand = new InvokeCommand(lambdaParams);
      const lambdaInvokeResponse: InvokeCommandOutput =
        await lambdaClient.send(lambdaInvokeCommand);
      const responsePayload = JSON.parse(new TextDecoder().decode(lambdaInvokeResponse.Payload));
      console.log(
        `Lambda invocation response payload in saveNewUsers:\n${JSON.stringify(responsePayload)}`
      );
      switch (responsePayload.statusCode) {
        case 200:
          responsePayload.body.length > 1
            ? (response.message = "Users")
            : (response.message = "User");
          response.message += " successfully added";
          response.usersAdded = responsePayload.body;
          console.log(`Users added:\n`);
          console.table(response.usersAdded);
          return response;
        case 403:
          throw new ManageUsersError(
            "Insufficient permissions to create users",
            "No users created"
          );
        case 422:
          response.message = JSON.parse(responsePayload.body).message;
          response.details = JSON.parse(responsePayload.body).details;
          console.error(`Error logged in saveNewUsers(): ${response.message} ${response.details}`);
          throw new ManageUsersError(response.message, response.details);
        default:
          console.log(
            `Status Code ${responsePayload.statusCode}: failed to create users for reasons unknown`
          );
          throw new ManageUsersError(
            "Failed to create users for reasons unknown",
            "No users created"
          );
      }
    } catch (error) {
      if (error instanceof ManageUsersError) {
        console.log(`${error.message}: ${error.details}`);
        throw error;
      } else {
        console.error(`Unknown error in saveNewUsers(): ${JSON.stringify(error)}`);
        throw error;
      }
    }
  }
}
