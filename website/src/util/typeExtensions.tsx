export interface UserData {
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

export interface Credentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  expiration?: string;
}

export interface CognitoUserData {
  Attributes: [
    {
      Name: string;
      Value: string;
    },
  ];
}
