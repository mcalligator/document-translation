import { UserData } from "./typeExtensions.js";

import {
	AttributeType,
	ListUsersCommandOutput,
} from "@aws-sdk/client-cognito-identity-provider";

/* Create array of user objects */
export default function filterUsers(
	unfilteredUsers: ListUsersCommandOutput,
	adminTenantId: string,
): UserData[] {
	const filteredUsers: UserData[] = [];
	unfilteredUsers.Users!.forEach((user) => {
		const tenant: AttributeType | undefined = user.Attributes!.find((attr) => {
			if (attr.Name === "custom:tenantId") {
				return attr;
			} else {
				return undefined;
			}
		});
		if (tenant && tenant.Value === adminTenantId) {
			// console.log(`TenantId: ${tenant}`);
			const email: AttributeType | undefined = user.Attributes!.find((attr) => {
				if (attr.Name === "email") {
					return attr;
				} else {
					return undefined;
				}
			});
			const lastName: AttributeType | undefined = user.Attributes!.find(
				(attr) => {
					if (attr.Name === "family_name") {
						return attr;
					} else {
						return undefined;
					}
				},
			);
			const firstName: AttributeType | undefined = user.Attributes!.find(
				(attr) => {
					if (attr.Name === "given_name") {
						return attr;
					} else {
						return undefined;
					}
				},
			);
			const id: AttributeType | undefined = user.Attributes!.find((attr) => {
				if (attr.Name === "sub") {
					return attr;
				} else {
					return undefined;
				}
			});
			const org: AttributeType | undefined = user.Attributes!.find((attr) => {
				if (attr.Name === "custom:organisationName") {
					return attr;
				} else {
					return undefined;
				}
			});
			filteredUsers.push({
				id: id!.Value!,
				firstName: firstName!.Value!,
				lastName: lastName!.Value!,
				email: email!.Value!,
				tenantId: tenant.Value,
				organisationName: org!.Value!,
			});
		}
	});
	return filteredUsers;
}
