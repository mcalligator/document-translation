import cfnOutputs from "../../../cfnOutputs.json";

import { ManageUsersError } from "./classes";
import { Credentials, UserData } from "./typeExtensions";

import {
  InvokeCommand,
  InvokeCommandInput,
  InvokeCommandOutput,
  LambdaClient,
} from "@aws-sdk/client-lambda";

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

  const lambdaParams: InvokeCommandInput = {
    FunctionName: lambdaFunctionName,
    InvocationType: "RequestResponse",
    Payload: new TextEncoder().encode(
      JSON.stringify({
        userPoolId: userPoolId,
        operation: "create",
        body: changedUsers,
      })
    ),
  };
  try {
    const lambdaInvokeCommand = new InvokeCommand(lambdaParams);
    const lambdaInvokeResponse: InvokeCommandOutput = await lambdaClient.send(lambdaInvokeCommand);
    const responsePayload = JSON.parse(new TextDecoder().decode(lambdaInvokeResponse.Payload));
    console.log(`Lambda invocation response payload:\n${responsePayload}`);
    switch (responsePayload.statusCode) {
      case 200:
        usersUpdated.length > 1 ? (response.message = "Users") : (response.message = "User");
        response.message += " successfully updated";
        response.usersUpdated = responsePayload.body;
        console.log(`Users added:\n`);
        console.table(usersUpdated);
        return response;
      case 403:
        throw new ManageUsersError("Insufficient permissions to update users", "No users updated");
      case 422:
        throw new ManageUsersError(responsePayload.body.message, responsePayload.body.details);
      default:
        throw new ManageUsersError(
          "Failed to update users for reasons unknown",
          "No users updated"
        );
    }
  } catch (error: unknown) {
    if (error instanceof ManageUsersError) {
      throw new ManageUsersError(error.message, error.details);
    } else {
      throw new Error(JSON.stringify(error));
    }
  }
}
