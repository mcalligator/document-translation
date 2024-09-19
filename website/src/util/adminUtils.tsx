import entitlementCodes from "./entitlementsCodes.json";

import { Credentials } from "./typeExtensions";

import {
  InvokeCommand,
  InvokeCommandInput,
  InvokeCommandOutput,
  LambdaClient,
} from "@aws-sdk/client-lambda";

// import { GetEntitlementsCommand, MarketplaceEntitlementServiceClient } from "@aws-sdk/client-marketplace-entitlement-service";

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
  // const entitlementClient = new MarketplaceEntitlementServiceClient({
  //   region: "us-east-1",
  //   credentials: {
  //     accessKeyId: adminCredentials!.accessKeyId,
  //     secretAccessKey: adminCredentials!.secretAccessKey,
  //     sessionToken: adminCredentials!.sessionToken,
  //   },
  // });
  // const entitlementParams = {
  //   ProductCode: "c9z0oe0qbge757tw4e5ey0fc0",
  //   CustomerIdentifier: tenantId,
  // };
  try {
    console.log(`Getting entitlement for tenant ${tenantId}`);
    const lambdaInvokeCommand = new InvokeCommand(lambdaParams);
    const lambdaInvokeResponse = await lambdaClient.send(lambdaInvokeCommand);
    const entitlementResponse: Entitlement = JSON.parse(
      new TextDecoder().decode(lambdaInvokeResponse.Payload)
    );

    // const entitlementCommand = new GetEntitlementsCommand(entitlementParams);
    // const entitlementResponse =
    //   await entitlementClient.send(entitlementCommand);
    console.log(
      `Entitlement response:\n${JSON.stringify(entitlementResponse)}`
    );

    // const isExpired =
    //   entitlementResponse.hasOwnProperty("Entitlements") === false ||
    //   entitlementResponse.Entitlements!.length === 0 ||
    //   new Date(entitlementResponse.Entitlements![0].ExpirationDate!) <
    //     new Date();

    // const entitlementCode = entitlementResponse.Entitlements![0].Dimension;
    // const entitlement = entitlementCodes.find(
    //   ({ entitlementId }) => entitlementId === entitlementCode
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
