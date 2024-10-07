import { Credentials, UserData } from "./typeExtensions";

import {
  InvokeCommand,
  InvokeCommandInput,
  InvokeCommandOutput,
  LambdaClient,
} from "@aws-sdk/client-lambda";

export default async function retrieveUsers(
  lambdaFunctionArn: string,
  adminCredentials: Credentials,
  userPoolId: string,
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
  const lambdaParams: InvokeCommandInput = {
    FunctionName: lambdaFunctionArn,
    InvocationType: "RequestResponse",
    Payload: JSON.stringify({
      tenantId: tenantId,
      userPoolId: userPoolId,
    }),
  };
  try {
    console.log(`Retrieving users for tenant ${tenantId}`);
    const lambdaInvokeCommand = new InvokeCommand(lambdaParams);
    const lambdaInvokeResponse = await lambdaClient.send(lambdaInvokeCommand);
    const retrievedUsers: UserData[] = JSON.parse(
      new TextDecoder().decode(lambdaInvokeResponse.Payload)
    );

    console.log(`Users retrieved:\n${JSON.stringify(retrievedUsers)}`);

    return retrievedUsers;
  } catch (error) {
    console.error(`Unable to retrieve users: ${error}`);
    return [];
  }
}
