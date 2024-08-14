// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import "@cloudscape-design/global-styles/index.css";

import cfnOutputs from "../../cfnOutputs.json";

import React, { useEffect, useState } from "react";

import {
  Box,
  Button,
  ContentLayout,
  Form,
  Header,
  SpaceBetween,
} from "@cloudscape-design/components";

import { AuthSession } from "@aws-amplify/auth";

import { extractField } from "../../util/checkAdmin";
import { Credentials, Id, UserData } from "../../util/typeExtensions";

import UserTable from "./userTable";

import {
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminUpdateUserAttributesCommand,
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from "@aws-sdk/client-cognito-identity-provider";

function AdminPanel(currentUser: any) {
  // To do:
  //  1. Check for expired AWS Session Token and refresh.
  //  2. Retrieve Marketplace entitlement from relevant API when solution integrated.
  //  3. Create combined client-side and server-side filter for retrieved users.
  //  4. Clear status message when condition no longer applies.
  //  5. Replace cognitoClient with shared component-level object.
  //  6. Get user.id for newly-created user in UserRow to be from server, not stale local value
  let entitlement = 5; // Placeholder value
  const tenantId = extractField(currentUser, "custom:tenantId");

  const [adminCredentials, setAdminCredentials] = useState<Credentials>();
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
        // Only attempt this if credentials have been defined and users have not already been fetched
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
          // To avoid performance problems, filter by email domain at back end, then tenantId in client
          const listUsersParams = {
            UserPoolId: cfnOutputs.awsUserPoolsId,
            // Filter: 'custom:tenantId = "CityTrax"',
          };
          const listUsersCommand = new ListUsersCommand(listUsersParams);
          const listUsersResponse = await cognitoClient.send(listUsersCommand);
          // console.log(
          //   `List users response:\n${JSON.stringify(listUsersResponse)}`
          // );
          let retrievedUsers: UserData[] = [];
          if (listUsersResponse.Users!.length > 0) {
            // Create array of user objects
            retrievedUsers = listUsersResponse.Users!.map((user) => ({
              id: user.Attributes!.find((attr) => attr.Name === "sub")!.Value!,
              firstName: user.Attributes!.find(
                (attr) => attr.Name === "given_name"
              )!.Value!,
              lastName: user.Attributes!.find(
                (attr) => attr.Name === "family_name"
              )!.Value!,
              email: user.Attributes!.find((attr) => attr.Name === "email")!
                .Value!,
              tenantId: user.Attributes!.find(
                (attr) => attr.Name === "custom:tenantId"
              )!.Value!,
            }));
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

  function addUser(e) {
    if (users.length >= entitlement) {
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

  function updateUserSetWithChanges(changedUser: UserData) {
    // Updates the users state variable with the new values of the added / changed users
    const userArray = [...users]; // Temporary working copy of users state array for manipulation
    // console.log(`updateUserSetWithChanges - Changed user: ${JSON.stringify(changedUser)}`);
    console.table(userArray);
    const userIndex = userArray.findIndex((user) => user.id === changedUser.id);
    // console.log("Index of changed user: " + userIndex);
    Object.assign(userArray[userIndex], changedUser);
    // console.log("Current user set:\n" + JSON.stringify(userArray));
    setUsers(userArray); // Update state with changed users
  }

  function reportStatus(message: string) {
    setStatusMessage(message);
  }

  async function handleClickSaveChanges(e) {
    // Write both new and changed users to back end
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
          const createUserParams = {
            UserPoolId: cfnOutputs.awsUserPoolsId,
            DesiredDeliveryMediums: ["EMAIL"],
            Username: newUser.email,
            email_verified: true,
            ForceAliasCreation: true,
            UserAttributes: [
              { Name: "email", Value: newUser.email },
              { Name: "given_name", Value: newUser.firstName },
              { Name: "family_name", Value: newUser.lastName },
              { Name: "custom:tenantId", Value: tenantId },
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
          tempUser!.id = newUserId!.Value;
          tempUser!.isNew = false;
        }

        // Prepare to re-render new (and changed?) users:
        newUsers.length = 0; // Clear newUsers array now they are committed to the identity store

        setUsers(usersCopy); // Update state so changes are reflected on the page
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
          console.log(
            " Output from update request: " +
              JSON.stringify(updateUserAttributesResponse)
          );
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
    console.log(
      "rowsSelectedForDeletion includes " +
        user.id +
        "? " +
        rowsSelectedForDeletion.has(user.id)
    );
    // let debugUsers = "";  // Delete after debugging
    if (rowsSelectedForDeletion.has(user.id)) {
      // console.log("  User ID IS in the list");  // Delete after debugging
      tempUsers.delete(user.id); // Remove user from set (not id property from user)
      // for (const u of tempUsers) { debugUsers += u + ":" };  // Delete after debugging
      // console.log(" Updated set of users to be deleted: " + debugUsers);  // Delete after debugging
      setRowsSelectedForDeletion(tempUsers);
    } else {
      console.log("  User ID is NOT in the list");
      tempUsers.add(user.id); // Add user to set (not id property to user)
      // for (const u of tempUsers) { debugUsers += u + ":" };  // Delete after debugging
      // console.log(" Updated set of users to be deleted: " + debugUsers);  // Delete after debugging
      setRowsSelectedForDeletion(tempUsers);
    }
    console.log("No. rows to be deleted: " + rowsSelectedForDeletion.size);
    // console.log("Rows with Delete checkbox ticked: " + debugUsers);  // Delete after debugging
    tempUsers.size === 0
      ? setDisableDeleteButton(true)
      : setDisableDeleteButton(false);
  }

  async function handleClickDeleteUser(e) {
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
        setRowsSelectedForDeletion(tempUsers); // After deleting, clear state variable
        setUsers(usersCopy); // Update state with remaining users
      } catch (error) {
        console.error("Error deleting users:", error);
      }
    }
    // console.log("Array of users to be deleted:\n" + JSON.stringify(usersToDelete));
  }

  function handleCancelClick(): void {
    // throw new Error("Function not implemented.");
    // For experimentation; remove when working
  }

  return (
    <>
      <ContentLayout
        header={
          <SpaceBetween size="m">
            <Header
              variant="h1"
              // description={t("translation_quick_text_description")}
              description={
                "Add, Edit, and Configure user accounts for Translate"
              }
            >
              <SpaceBetween direction="horizontal" alignItems="end" size="xl">
                Manage Users
              </SpaceBetween>
            </Header>
          </SpaceBetween>
        }
      >
        <Form
          header={
            <p>
              <b>Entitlement</b>: {entitlement} named users ({users.length}{" "}
              registered)
            </p>
          }
        >
          <SpaceBetween direction="vertical" size="m">
            <UserTable
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
      </ContentLayout>
    </>
  );
}

export default AdminPanel;
