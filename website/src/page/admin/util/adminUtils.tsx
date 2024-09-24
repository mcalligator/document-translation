import { Credentials } from "./typeExtensions";

import {
  InvokeCommand,
  InvokeCommandInput,
  InvokeCommandOutput,
  LambdaClient,
} from "@aws-sdk/client-lambda";

export interface Entitlement {
  subscriptionStatus: string;
  isExpired: boolean;
  userCount: number;
}

const getEntitlement = async function (
  lambdaFunctionArn: string,
  adminCredentials: Credentials,
  tenantId: string
): Promise<Entitlement> {
  const lambdaClient = new LambdaClient({
    region: "eu-west-2",
    // adminCredentials, // Experiment with more concise code
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
      ProductCode: "c9z0oe0qbge757tw4e5ey0fc0",
    }),
  };

  try {
    // console.log(`Getting entitlement for tenant ${tenantId}`);
    const lambdaInvokeCommand = new InvokeCommand(lambdaParams);
    const lambdaInvokeResponse = await lambdaClient.send(lambdaInvokeCommand);
    const entitlementResponse: Entitlement = JSON.parse(
      new TextDecoder().decode(lambdaInvokeResponse.Payload)
    );

    // console.log(
    //   `Entitlement response:\n${JSON.stringify(entitlementResponse)}`
    // );

    return {
      subscriptionStatus: entitlementResponse.subscriptionStatus,
      isExpired: entitlementResponse.isExpired,
      userCount: entitlementResponse.userCount,
    };
  } catch (error) {
    console.error(`Unable to determine entitlement: ${error}`);
    return {
      subscriptionStatus: "No valid subscription",
      isExpired: true,
      userCount: 0,
    };
  }
};

export { getEntitlement };
