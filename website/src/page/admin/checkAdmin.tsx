export default function checkAdmin(user: any) {
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

function isInAdminGroup(
  userObject: any,
  groupsProperty: string,
  adminGroup: string
) {
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

export function extractField(
  userObject: any,
  requiredProperty: string
): any | undefined {
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
