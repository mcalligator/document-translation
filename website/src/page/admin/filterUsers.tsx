import { UserData } from "../../util/typeExtensions";

import {
  AttributeType,
  ListUsersCommandOutput,
} from "@aws-sdk/client-cognito-identity-provider";

/* Create array of user objects */
export default function filterUsers(
  unfilteredUsers: ListUsersCommandOutput,
  adminTenantId: string
): UserData[] {
  let filteredUsers: UserData[] = [];
  unfilteredUsers.Users!.forEach((user) => {
    const tenant: AttributeType | undefined = user.Attributes!.find((attr) => {
      if (attr.Name === "custom:tenantId") {
        return attr;
      }
    });
    if (tenant && tenant.Value === adminTenantId) {
      // console.log(`TenantId: ${tenant}`);
      const email: AttributeType | undefined = user.Attributes!.find((attr) => {
        if (attr.Name === "email") {
          return attr;
        }
      });
      const lastName: AttributeType | undefined = user.Attributes!.find(
        (attr) => {
          if (attr.Name === "family_name") {
            return attr;
          }
        }
      );
      const firstName: AttributeType | undefined = user.Attributes!.find(
        (attr) => {
          if (attr.Name === "given_name") {
            return attr;
          }
        }
      );
      const id: AttributeType | undefined = user.Attributes!.find((attr) => {
        if (attr.Name === "sub") {
          return attr;
        }
      });
      const org: AttributeType | undefined = user.Attributes!.find((attr) => {
        if (attr.Name === "custom:organisationName") {
          return attr;
        }
      });
      filteredUsers.push({
        id: id!.Value!,
        firstName: firstName!.Value!,
        lastName: lastName!.Value!,
        email: email!.Value!,
        tenantId: tenant!.Value!,
        // organisationName: org!.Value!
      });
    }
  });
  return filteredUsers;
}
