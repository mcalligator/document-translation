export interface Credentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  expiration?: string;
}

export interface UserData extends Record<string, any> {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  tenantId: string;
  organisationName: string;
  isNew?: boolean;
  isValid?: boolean;
  isChanged?: boolean;
}

export interface DeleteUsersOutcome {
  message: string;
  details: string;
  usersDeleted: Set<string>; // Set in front end (Array in back end)
}

// To address restrictions in both parent classes:
export interface listenerMouseEvent extends Event, MouseEvent {}
