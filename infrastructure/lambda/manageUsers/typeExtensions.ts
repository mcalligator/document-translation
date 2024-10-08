export interface Event {
	body: string | Array<string>;
	userPoolId: string;
	tenantId: string;
	operation: string;
}

export interface UserData {
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

export interface Id {
	id: string;
}

export interface DeleteUsersOutcome {
	message: string;
	details: string;
	usersDeleted: Array<string>; // Array in back end (Set in front end)
}
