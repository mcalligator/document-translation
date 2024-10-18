import cfnOutputs from "../../../cfnOutputs.json";

import { Credentials, UserData } from "./typeExtensions";

import { InvokeCommand, InvokeCommandInput, LambdaClient } from "@aws-sdk/client-lambda";

export default async function retrieveUsers(
  adminCredentials: Credentials,
  tenantId: string
): Promise<UserData[]> {
  const lambdaClient = new LambdaClient({
    region: "eu-west-2",
    credentials: {
      accessKeyId: adminCredentials!.accessKeyId,
      secretAccessKey: adminCredentials!.secretAccessKey,
      sessionToken: adminCredentials!.sessionToken,
    },
  });
  const lambdaFunctionName = cfnOutputs.manageUsersFunctionName;
  const userPoolId = cfnOutputs.awsUserPoolsId;

  const lambdaParams: InvokeCommandInput = {
    FunctionName: lambdaFunctionName,
    InvocationType: "RequestResponse",
    Payload: JSON.stringify({
      tenantId: tenantId,
      userPoolId: userPoolId,
      operation: "retrieve",
    }),
  };
  try {
    const lambdaInvokeCommand = new InvokeCommand(lambdaParams);
    const lambdaInvokeResponse = await lambdaClient.send(lambdaInvokeCommand);
    // console.log(
    //   `Lambda invocation response:\n${new TextDecoder().decode(lambdaInvokeResponse.Payload)}`
    // );
    const responsePayload = JSON.parse(new TextDecoder().decode(lambdaInvokeResponse.Payload));
    const retrievedUsers: UserData[] = responsePayload.body;

    // console.log(`Users retrieved:\n${JSON.stringify(retrievedUsers)}`);

    return retrievedUsers;
  } catch (error) {
    console.error(`Unable to retrieve users: ${error}`);
    return [];
  }
}
