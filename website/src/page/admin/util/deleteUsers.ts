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
  console.log(
    "Actual set of users to be deleted: " +
      JSON.stringify(Array.from(rowsForDeletion))
  ); // Delete after debugging
  let responseMessage = "";
  let responseDetails = "";
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
    const lambdaInvokeResponse: InvokeCommandOutput =
      await lambdaClient.send(lambdaInvokeCommand);
    console.log(
      `Lambda invocation response:\n${new TextDecoder().decode(lambdaInvokeResponse.Payload)}`
    );
    const responsePayload = JSON.parse(
      new TextDecoder().decode(lambdaInvokeResponse.Payload)
    );
    const usersDeleted: Array<string> = responsePayload.body.usersDeleted;
    console.log(`Users deleted:\n${JSON.stringify(usersDeleted)}`);

    response = responsePayload.body;
    if (responsePayload.body.details !== "")
      responseMessage = "Failed to delete users)";
    response.details = responseDetails;
    response.usersDeleted = new Set(usersDeleted);

    return response;
  } catch (error) {
    console.error(JSON.stringify(error));
    throw error;
  }
}
