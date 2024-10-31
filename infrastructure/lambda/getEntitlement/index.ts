import {
  MarketplaceEntitlementServiceClient,
  GetEntitlementsCommand,
  GetEntitlementsCommandInput,
  GetEntitlementsCommandOutput,
} from "@aws-sdk/client-marketplace-entitlement-service";
import { STSClient, AssumeRoleCommand, AssumeRoleCommandOutput } from "@aws-sdk/client-sts";

interface Entitlement {
  entitlementId: string;
  userCount: number;
}

const entitlementCodes: Entitlement[] = JSON.parse(process.env.ENTITLEMENT_CODES || "[]");
const getEntitlementRoleArn = process.env.ENTITLEMENT_ROLE_ARN;

interface SubscriptionEvent {
  tenantId: string;
  productCode: string;
}

export const handler = async (event: SubscriptionEvent) => {
  console.log(JSON.stringify(event));
  const tenantId = event.tenantId;

  try {
    console.log(`Assuming GetEntitlement role ${getEntitlementRoleArn} in SaaS Management AWS account`);
    const stsClient = new STSClient({ region: "us-east-1" });
    const assumeRoleCommand = new AssumeRoleCommand({
      RoleArn: getEntitlementRoleArn,
      RoleSessionName: "GetEntitlementRequest",
      DurationSeconds: 900,
    });
    const assumeRoleResponse = await stsClient.send(assumeRoleCommand);
    // let message = 'AssumeRole command completed';
    let marketplaceCredentials: AssumeRoleCommandOutput["Credentials"];
    if (assumeRoleResponse) {
      // console.log(`assumeRoleResponse:\n${JSON.stringify(assumeRoleResponse)}`);
      marketplaceCredentials = assumeRoleResponse.Credentials;
      // message += `, returning the following credentials:\n${JSON.stringify(marketplaceCredentials)}`;
      // console.log(message);
      const entitlementParams: GetEntitlementsCommandInput = {
        ProductCode: event.productCode,
        Filter: {
          "CUSTOMER_IDENTIFIER": [tenantId],
        },
        // CustomerIdentifier: tenantId,
      };

      const entitlementClient = new MarketplaceEntitlementServiceClient({
        region: "us-east-1",
        credentials: {
          accessKeyId: marketplaceCredentials!.AccessKeyId!,
          secretAccessKey: marketplaceCredentials!.SecretAccessKey!,
          sessionToken: marketplaceCredentials!.SessionToken!,
        },
      });
      console.log(`Getting entitlement for tenant ${tenantId}`);
      const entitlementCommand = new GetEntitlementsCommand(
        entitlementParams,
      ) as GetEntitlementsCommand;
      const entitlementResponse: GetEntitlementsCommandOutput = await entitlementClient.send(entitlementCommand);
      // console.log(`Entitlement response:\n${JSON.stringify(entitlementResponse)}`);

      if (!entitlementResponse.Entitlements || entitlementResponse.Entitlements.length === 0) {
        return { isExpired: true, userCount: 0 };
      } else {
        if (new Date(entitlementResponse!.Entitlements[0]!.ExpirationDate!) < new Date()) {
        return { isExpired: true, userCount: 0 };
        }
      };

      const entitlementCode = entitlementResponse.Entitlements[0].Dimension;
      const entitlement = entitlementCodes.find(
        ({ entitlementId }) => entitlementId === entitlementCode,
      );

      return {
        subscriptionStatus: "Subscription valid",
        isExpired: false,
        userCount: entitlement ? entitlement.userCount : 0,
      };
    } else {
      // message += ' with no credentials returned.';
      // console.log(message);
      throw new Error("Unable to assume role; no credentials available to get entitlement");
    }

    // console.log(`Credentials used to access Marketplace Entitlement Service in Management Account:\n${JSON.stringify(marketplaceCredentials)}`);
  } catch (error) {
    console.error(`Error in handler: ${error}`);
    return {
      subscriptionStatus: "No valid subscription",
      isExpired: true,
      userCount: 0,
    };
  }
};
