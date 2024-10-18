export class ManageUsersError extends Error {
  details: string;

  constructor(message: string, details: string) {
    super(message);
    this.name = "ManageUsersError";
    this.details = details;
    Object.setPrototypeOf(this, ManageUsersError.prototype); // Necessary for proper prototype chain setup in some environments
  }
}
