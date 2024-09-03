import { AdminCreateUserRequest } from "@aws-sdk/client-cognito-identity-provider";

export interface Credentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  expiration?: string;
}

export interface AdminVerifiedCreateUserRequest
  extends AdminCreateUserRequest {}

export interface UserData extends Record<string, any> {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  tenantId: string;
  isNew?: boolean;
  isValid?: boolean;
  isChanged?: boolean;
}

export interface Id {
  id: string;
}

export interface CognitoUserData {
  Attributes: [
    {
      Name: string;
      Value: string;
    },
  ];
}
