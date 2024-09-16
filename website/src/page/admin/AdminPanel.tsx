// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import "@cloudscape-design/global-styles/index.css";

import cfnOutputs from "../../cfnOutputs.json";

import React, { useEffect, useState } from "react";

import {
  Box,
  Button,
  Container,
  ContentLayout,
  Form,
  Header,
  SpaceBetween,
} from "@cloudscape-design/components";

import { Entitlement, getEntitlement } from "../../util/adminUtils";
import { Credentials, UserData } from "../../util/typeExtensions";

import { extractField } from "./checkAdmin";
import filterUsers from "./filterUsers";
import UserTable from "./userTable";

import {
  AdminCreateUserCommand,
  AdminCreateUserCommandInput,
  AdminDeleteUserCommand,
  AdminUpdateUserAttributesCommand,
  CognitoIdentityProviderClient,
  ListUsersCommand,
  UserNotFoundException,
} from "@aws-sdk/client-cognito-identity-provider";

export default function AdminPanel(currentUser: any) {
  /* To do:
    1. Check for expired AWS Session Token and refresh.
    2. Retrieve Marketplace entitlement from relevant API when solution integrated - PARTIALLY DONE.
    3. Clear status message when condition no longer applies - DONE (I think).
    5. Replace cognitoClient with shared component-level object.
    6. Get user.id for newly-created user in UserRow to be from server, not stale local value.
    7. After deleting user, disable Delete User button - DONE.
    8. *** Enable Cancel button functionality.
    9. Get Input fields for new users to be same width as those above when data being entered.
   10. Set initial text column widths to be that of longest content.
   11. *** Add pagination to retrieving userse from Cognito - fast-follow.
   12. Change input fields' colour to signify invalid entry.
   13. *** Redeploy CTT with organisationName and phoneNumber attributes in user pool; enable in front end - DONE.
   14. Refine TenantAdmins Cognito permissions, adding SNS Publish - DONE.
  */

  // let entitlement = 5; // Placeholder value
  const tenantId = extractField(currentUser, "custom:tenantId");
  // const subscriptionStatus = getEntitlement(tenantId);
  const organisationName = extractField(currentUser, "custom:organisationName");

  const [adminCredentials, setAdminCredentials] = useState<Credentials>();
  const [subscriptionStatus, setSubscriptionStatus] = useState<Entitlement>();
  const [users, setUsers] = useState<UserData[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [rowsSelectedForDeletion, setRowsSelectedForDeletion] = useState(
    new Set<string>()
  );
  const [disableDeleteButton, setDisableDeleteButton] = useState(true);

  // console.log(`User passed into AdminPanel:\n${JSON.stringify(currentUser)}`);

  useEffect(() => {
    setAdminCredentials(extractField(currentUser, "credentials"));

    let usersFetched = false;
    // console.log(
    //   `Value of adminCredentials:\n${JSON.stringify(adminCredentials)}`
    // );

    const fetchUsers = async () => {
      // Retrieve users from Cognito user pool
      if (adminCredentials && !usersFetched) {
        // Only attempt if credentials defined & users not already fetched
        try {
          // console.log(
          //   `Applied value of adminCredentials:\n${JSON.stringify(adminCredentials)}`
          // );
          const cognitoClient = new CognitoIdentityProviderClient({
            region: cfnOutputs.awsRegion,
            credentials: {
              // Not possible to assign object directly, strangely
              accessKeyId: adminCredentials!.accessKeyId,
              secretAccessKey: adminCredentials!.secretAccessKey,
              sessionToken: adminCredentials!.sessionToken,
            },
          });

          // List users
          const listUsersParams = {
            UserPoolId: cfnOutputs.awsUserPoolsId,
            Limit: 20,
          };
          const listUsersCommand = new ListUsersCommand(listUsersParams);
          const listUsersResponse = await cognitoClient.send(listUsersCommand);
          // console.log(
          //   `List users response:\n${JSON.stringify(listUsersResponse)}`
          // );
          let retrievedUsers: UserData[] = [];
          if (listUsersResponse.Users!.length > 0) {
            retrievedUsers = filterUsers(listUsersResponse, tenantId);
          } else {
            retrievedUsers = [];
          }
          // const users: UserData[] = [];
          setUsers(retrievedUsers);
        } catch (error) {
          console.error("Error fetching users:", error);
        }
      }
      return () => {
        if (users.length > 0) usersFetched = true;
      };
    };
    fetchUsers();
    // console.log(`adminCredentials after fetchCredentials and fetchUsers:\n${JSON.stringify(adminCredentials)}`);
  }, [adminCredentials]);

  useEffect(() => {
    // Retrieve subscription status
    let entitlementFetched = false;
    const fetchSubscriptionStatus = async () => {
      if (adminCredentials && !entitlementFetched) {
        // Only attempt if adminCredentials have been obtained and Entitlement not yet obtained
        try {
          const subscriptionStatus = await getEntitlement(
            adminCredentials,
            tenantId
          );
          setSubscriptionStatus(subscriptionStatus);
        } catch (error) {
          console.error("Error fetching subscription status:", error);
        }
        return () => {
          if (subscriptionStatus) entitlementFetched = true;
        };
      }
    };
    fetchSubscriptionStatus();
  }, []);

  function addUser() {
    if (users.length >= subscriptionStatus!.userCount) {
      reportStatus(
        "No remaining entitlement - purchase additional subscription"
      );
      return;
    }
    const newId = new Date().toISOString(); // Dummy ID for uniquely identifying new user until persisted to Auth store
    let newUser: UserData = {
      id: newId,
      firstName: "",
      lastName: "",
      email: "",
      tenantId: tenantId,
      isNew: true,
      isChanged: false,
      isValid: false,
    };
    const userArray = [...users]; // Create copy, not reference, so React will detect change and trigger re-render.
    userArray.push(newUser);
    setUsers(userArray);
    // console.log(" After adding new blank user:" + JSON.stringify(userArray));
  }

  function updateUserSetWithChanges(changedUser: UserData): void {
    /*
      Updates the users state variable with the new values of the added / changed users
    */
    const userArray = [...users]; // Temporary working copy of users state array for manipulation
    // console.log(
    //   `updateUserSetWithChanges - Changed user: ${JSON.stringify(changedUser)}`
    // );
    // console.table(userArray);
    try {
      const userIndex = userArray.findIndex(
        (user) => user.id === changedUser.id
      );
      // console.log("Index of changed user: " + userIndex);
      Object.assign(userArray[userIndex], changedUser);
      // console.log("Current user set:");
      // console.table(userArray);
      setUsers(userArray); // Update state with changed users
    } catch (error) {
      if (error instanceof TypeError) {
        // Temporary workaround for stale closure
        reportStatus("Refresh the page before editing newly-created users");
        console.error(
          "Admin Panel not refreshed before newly-created user added",
          error
        );
      } else {
        reportStatus("Error updating user");
        console.error("Error updating user set with changes:", error);
      }
    }
  }

  function reportStatus(message: string) {
    setStatusMessage(message);
  }

  async function handleClickSaveChanges(e: Event) {
    // Write both new and changed users to back end
    e.preventDefault();
    const changedUsers = users.filter((user) => user.isChanged);
    const newUsers = users.filter((user) => user.isNew); // Separate array for new users to replace local temporary IDs after write
    let usersCopy = [...users]; // Local variable to shadow state users array

    const cognitoClient = new CognitoIdentityProviderClient({
      region: cfnOutputs.awsRegion,
      credentials: {
        // Not possible to assign object directly, strangely
        accessKeyId: adminCredentials!.accessKeyId,
        secretAccessKey: adminCredentials!.secretAccessKey,
        sessionToken: adminCredentials!.sessionToken,
      },
    });

    // Add new users to Cognito user pool
    if (newUsers.length > 0) {
      try {
        for (const newUser of newUsers) {
          const createUserParams: AdminCreateUserCommandInput = {
            UserPoolId: cfnOutputs.awsUserPoolsId,
            DesiredDeliveryMediums: ["EMAIL"],
            Username: newUser.email,
            ForceAliasCreation: true,
            UserAttributes: [
              { Name: "email", Value: newUser.email },
              { Name: "email_verified", Value: "true" },
              { Name: "given_name", Value: newUser.firstName },
              { Name: "family_name", Value: newUser.lastName },
              // { Name: "phone_number", Value: newUser.phoneNumber },
              { Name: "custom:tenantId", Value: tenantId }, // Replace with customer_id
              // { Name: "custom:organisationName", Value: organisationName},
              // { Name: "website", Value: tenantId }, // Temporarily repurposed to enable server-side filtering
            ],
          };
          const createUserCommand = new AdminCreateUserCommand(
            createUserParams
          );
          const createUserResponse =
            await cognitoClient.send(createUserCommand);
          // Set user's local id to value of "sub" in identity store:
          const newUserId = createUserResponse.User!.Attributes!.find(
            (attr) => {
              return attr.Name === "sub";
            }
          );
          let tempUser = usersCopy.find(
            (userCopy) => userCopy.email === newUser.email
          );
          tempUser!.id = newUserId!.Value!;
          tempUser!.isNew = false;
        }

        // Prepare to re-render new (and changed?) users:
        newUsers.length = 0; // Clear newUsers array now they are committed to the identity store

        // console.log("handleClickSaveChanges: usersCopy");
        // console.table(usersCopy);
        setUsers(usersCopy); // Update state so changes are reflected on the page
        // console.log("handleClickSaveChanges: users");
        // console.table(users);
      } catch (error) {
        console.error("Error adding users: ", error);
      }
    }

    // Update changed users in Cognito user pool
    if (changedUsers.length > 0) {
      try {
        for (const changedUser of changedUsers) {
          const updateUserAttributesParams = {
            UserPoolId: cfnOutputs.awsUserPoolsId,
            Username: changedUser.email,
            UserAttributes: [
              { Name: "email", Value: changedUser.email },
              { Name: "given_name", Value: changedUser.firstName },
              { Name: "family_name", Value: changedUser.lastName },
            ],
          };
          const updateUserAttributesCommand =
            new AdminUpdateUserAttributesCommand(updateUserAttributesParams);
          const updateUserAttributesResponse = await cognitoClient.send(
            updateUserAttributesCommand
          );
          // console.log(
          //   " Output from update request: " +
          //     JSON.stringify(updateUserAttributesResponse)
          // );
        }
      } catch (error) {
        console.error("Error updating users: ", error);
      }
    }
  }

  function deleteToggleChanges(user: UserData) {
    // userRow's user variable not updated when new user added
    let tempUsers = rowsSelectedForDeletion; // Local shadow variable for users to be deleted
    // console.log("User passed in: " + user.id);  // Delete after debugging
    // Disable Delete User button only when NO checkboxes are ticked
    // console.log(
    //   "rowsSelectedForDeletion includes " +
    //     user.id +
    //     "? " +
    //     rowsSelectedForDeletion.has(user.id)
    // );
    // let debugUsers = "";  // Delete after debugging
    if (rowsSelectedForDeletion.has(user.id)) {
      // console.log("  User ID IS in the list");  // Delete after debugging
      tempUsers.delete(user.id); // Remove user from set (not id property from user)
      // for (const u of tempUsers) { debugUsers += u + ":" };  // Delete after debugging
      // console.log(" Updated set of users to be deleted: " + debugUsers);  // Delete after debugging
      setRowsSelectedForDeletion(tempUsers);
    } else {
      // console.log("  User ID is NOT in the list");
      tempUsers.add(user.id); // Add user to set (not id property to user)
      // for (const u of tempUsers) { debugUsers += u + ":" };  // Delete after debugging
      // console.log(" Updated set of users to be deleted: " + debugUsers);  // Delete after debugging
      setRowsSelectedForDeletion(tempUsers);
    }
    // console.log("No. rows to be deleted: " + rowsSelectedForDeletion.size);
    // console.log("Rows with Delete checkbox ticked: " + debugUsers);  // Delete after debugging
    tempUsers.size === 0
      ? setDisableDeleteButton(true)
      : setDisableDeleteButton(false);
  }

  async function handleClickDeleteUser() {
    // console.log("Deleting users " + JSON.stringify(Array.from(rowsSelectedForDeletion)));
    const cognitoClient = new CognitoIdentityProviderClient({
      region: cfnOutputs.awsRegion,
      credentials: {
        // Not possible to assign object directly, strangely
        accessKeyId: adminCredentials!.accessKeyId,
        secretAccessKey: adminCredentials!.secretAccessKey,
        sessionToken: adminCredentials!.sessionToken,
      },
    });

    // let usersToDelete = Array<Id>();
    for (const userId of rowsSelectedForDeletion) {
      try {
        const deleteUserParams = {
          UserPoolId: cfnOutputs.awsUserPoolsId,
          Username: userId,
        };
        const deleteUserCommand = new AdminDeleteUserCommand(deleteUserParams);
        await cognitoClient.send(deleteUserCommand); // No response metadata required
        let usersCopy = [...users]; // Temporary local variable to shadow component state
        usersCopy.splice(
          usersCopy.findIndex((user) => user.id === userId),
          1
        );

        // Reset set of users deleted:
        let tempUsers = rowsSelectedForDeletion;
        tempUsers.clear();
        // Post-deletion clean-up:
        setRowsSelectedForDeletion(tempUsers); // Clear state variable
        setDisableDeleteButton(true);
        setUsers(usersCopy); // Update state with remaining users
      } catch (error) {
        if (error instanceof UserNotFoundException) {
          reportStatus(
            "Page must be refreshed before deleting newly-created users"
          );
          console.error(
            "Attempt to delete newly-created user before refreshing page"
          );
        } else {
          reportStatus("Error deleting user");
          console.error("Error deleting user:", error);
        }
      }
    }
    // console.log("Array of users to be deleted:\n" + JSON.stringify(usersToDelete));
  }

  function handleCancelClick(): void {
    // throw new Error("Function not implemented.");
    // For experimentation; remove when working
  }

  const headings = ["First Name", "Last Name", "Email", "Delete?"];

  return (
    <>
      <ContentLayout
        header={
          <SpaceBetween direction="vertical" size="m">
            <Header
              variant="h1"
              // description={t("translation_quick_text_description")}
              description={
                "Add, Edit, and Configure user accounts for Translate"
              }
            >
              Manage Users
            </Header>
            <p>
              <b>Entitlement</b>:{" "}
              {subscriptionStatus?.userCount && !subscriptionStatus?.isExpired
                ? subscriptionStatus?.userCount +
                  ` named users ` +
                  users.length +
                  ` registered`
                : `No active subscription`}
            </p>
          </SpaceBetween>
        }
      >
        <Container>
          <Form>
            <SpaceBetween direction="vertical" size="m">
              <UserTable
                headings={headings}
                minCellWidth={100}
                users={users}
                updateUserSetWithChanges={updateUserSetWithChanges} //Callback function to surface changes for write
                deleteToggleChanges={deleteToggleChanges}
                reportStatus={reportStatus}
              ></UserTable>
              <SpaceBetween direction="horizontal" size="l">
                <Button variant="primary" onClick={addUser}>
                  Add New User
                </Button>
                <Button
                  disabled={disableDeleteButton}
                  variant="normal"
                  onClick={handleClickDeleteUser}
                >
                  Delete User
                </Button>
                <Button
                  onClick={handleCancelClick}
                  // disabled={userInfoChanged}
                  variant="normal"
                >
                  Cancel
                </Button>
                <Box color="text-label" variant="p" textAlign="center">
                  {statusMessage}
                </Box>
                <Button
                  // disabled={userInfoChanged}
                  variant="normal"
                  onClick={handleClickSaveChanges}
                >
                  Save Changes
                </Button>
              </SpaceBetween>
            </SpaceBetween>
          </Form>
        </Container>
      </ContentLayout>
    </>
  );
}
