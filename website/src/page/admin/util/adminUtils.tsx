import { Credentials } from "./typeExtensions";

import { InvokeCommand, InvokeCommandInput, LambdaClient } from "@aws-sdk/client-lambda";

export function checkAdmin(user: any) {
  // console.log(`User passed into checkAdmin:\n${JSON.stringify(user)}`);
  // const propertyPath: string = "[cognito:groups]";
  if (isInAdminGroup(user, "cognito:groups", "TenantAdmins")) {
    // console.log(`User is an admin`);
    return true;
  } else {
    // console.log(`User is not an admin`);
    return false;
  }
}

function isInAdminGroup(userObject: any, groupsProperty: string, adminGroup: string) {
  // Determines whether user is in supplied Admin group in Cognito
  // Iterates through properties to allow for possibly changing data structure of user object
  if (typeof userObject === "object") {
    if (groupsProperty in userObject) {
      if (userObject[groupsProperty].includes(adminGroup)) {
        // console.log(`User is a member of ${adminGroup}`);
        return true;
      } else {
        return false;
      }
    } else {
      const objChildren: any[] = Object.values(userObject);
      for (let i = 0; i < objChildren.length; i++) {
        if (isInAdminGroup(objChildren[i], groupsProperty, adminGroup)) {
          return true;
        } else {
          continue;
        }
      }
    }
  } else {
    return false;
  }
}

export function extractField(userObject: any, requiredProperty: string): any | undefined {
  // Extracts credentials from user object
  if (typeof userObject === "object") {
    if (requiredProperty in userObject) {
      return userObject[requiredProperty];
    } else {
      const objChildren: any[] = Object.values(userObject);
      for (let i = 0; i < objChildren.length; i++) {
        const result = extractField(objChildren[i], requiredProperty);
        if (result) {
          return result;
        } else {
          continue;
        }
      }
    }
  } else {
    return undefined;
  }
}

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
