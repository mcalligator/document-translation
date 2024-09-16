import entitlementCodes from "./entitlementsCodes.json";

import { Credentials } from "./typeExtensions";

import {
  GetEntitlementsCommand,
  MarketplaceEntitlementServiceClient,
} from "@aws-sdk/client-marketplace-entitlement-service";

export interface Entitlement {
  isExpired: boolean;
  userCount: number;
}

const getEntitlement = async function (
  adminCredentials: Credentials,
  tenantId: string
): Promise<Entitlement> {
  const entitlementClient = new MarketplaceEntitlementServiceClient({
    region: "us-east-1",
    credentials: {
      accessKeyId: adminCredentials!.accessKeyId,
      secretAccessKey: adminCredentials!.secretAccessKey,
      sessionToken: adminCredentials!.sessionToken,
    },
  });
  const entitlementParams = {
    ProductCode: "c9z0oe0qbge757tw4e5ey0fc0",
    CustomerIdentifier: tenantId,
  };
  try {
    console.log(`Getting entitlement for tenant ${tenantId}`);
    const entitlementCommand = new GetEntitlementsCommand(entitlementParams);
    const entitlementResponse =
      await entitlementClient.send(entitlementCommand);
    console.log(
      `Entitlement response:\n${JSON.stringify(entitlementResponse)}`
    );

    const isExpired =
      entitlementResponse.hasOwnProperty("Entitlements") === false ||
      entitlementResponse.Entitlements!.length === 0 ||
      new Date(entitlementResponse.Entitlements![0].ExpirationDate!) <
        new Date();

    const entitlementCode = entitlementResponse.Entitlements![0].Dimension;
    const entitlement = entitlementCodes.find(
      ({ entitlementId }) => entitlementId === entitlementCode
    );
    return {
      isExpired: isExpired,
      userCount: entitlement?.userCount!,
    };
  } catch (error) {
    console.error(`Unable to determine entitlement: ${error}`);
    return {
      isExpired: true,
      userCount: 0,
    };
  }
};

export { getEntitlement };
