import cfnOutputs from "../../../cfnOutputs.json";

import { Credentials, DeleteUsersOutcome, UserData } from "./typeExtensions";

import {
  InvokeCommand,
  InvokeCommandInput,
  InvokeCommandOutput,
  LambdaClient,
} from "@aws-sdk/client-lambda";

export default async function deleteUsers(
  rowsForDeletion: Set<string>,
  adminCredentials: Credentials,
  tenantId: string
): Promise<DeleteUsersOutcome> {
  console.log("Actual set of users to be deleted: " + JSON.stringify(Array.from(rowsForDeletion))); // Delete after debugging
  let response = { message: "", details: "", usersDeleted: new Set<string>() };

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
    Payload: JSON.stringify({
      tenantId: tenantId,
      userPoolId: userPoolId,
      operation: "delete",
      body: Array.from(rowsForDeletion), // Convert to Array for serialisation
    }),
  };

  try {
    const lambdaInvokeCommand = new InvokeCommand(lambdaParams);
    const lambdaInvokeResponse: InvokeCommandOutput = await lambdaClient.send(lambdaInvokeCommand);
    const responsePayload = JSON.parse(new TextDecoder().decode(lambdaInvokeResponse.Payload));
    console.log(`Lambda invocation response payload:\n${JSON.stringify(responsePayload)}`);
    const usersDeleted: Array<string> = responsePayload.body.usersDeleted;
    console.log(`Users deleted:\n${JSON.stringify(usersDeleted)}`);

    response.message = responsePayload.body.message;
    response.details = responsePayload.body.details;
    response.usersDeleted = new Set(usersDeleted); // Convert back to Set for processing
    return response;
  } catch (error) {
    console.error(JSON.stringify(error));
    throw error;
  }
}
