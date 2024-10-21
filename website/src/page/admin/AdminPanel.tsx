// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import "@cloudscape-design/global-styles/index.css";

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

import { Entitlement, getEntitlement } from "./util/adminUtils";
import { extractField } from "./util/adminUtils";
import { ManageUsersError } from "./util/classes";
import deleteUsers from "./util/deleteUsers";
import retrieveUsers from "./util/retrieveUsers";
import saveChangedUsers from "./util/saveChangedUsers";
import saveNewUsers from "./util/saveNewUsers";
import { Credentials, DeleteUsersOutcome, UserData } from "./util/typeExtensions";

import UserTable from "./userTable";

export default function AdminPanel(currentUser: any) {
  /* To do:
    1. Check for expired AWS Session Token and refresh.
    2. Get Input fields for new users to be same width as those above when data being entered.
    3. *** Add pagination to retrieving users from Cognito - fast-follow.
    4. Change input fields' colour to signify invalid entry.
  */

  const tenantId = extractField(currentUser, "custom:tenantId");
  const organisationName = extractField(currentUser, "custom:organisationName"); // To do: identify where this needs to be used

  const [adminCredentials, setAdminCredentials] = useState<Credentials>();
  const [subscription, setSubscription] = useState<Entitlement>();
  const [users, setUsers] = useState<UserData[]>([]);
  const [originalUsers, setOriginalUsers] = useState<UserData[]>([]); // To enable simple cancellation of all changes before save
  const [statusMessage, setStatusMessage] = useState("");
  const [rowsToDelete, setrowsToDelete] = useState(new Set<string>());
  const [disableDeleteButton, setDisableDeleteButton] = useState(true);

  // console.log(`User passed into AdminPanel:\n${JSON.stringify(currentUser)}`);

  useEffect(() => {
    setAdminCredentials(extractField(currentUser, "credentials"));

    let usersFetched = false;

    const fetchUsers = async () => {
      // Retrieve users from Cognito user pool
      if (adminCredentials && !usersFetched) {
        // Only attempt if credentials defined & users not already fetched
        try {
          const retrievedUsers = await retrieveUsers(adminCredentials!, tenantId);
          if (retrievedUsers.length > 0) {
            // console.log(`Users returned to fetchUsers in AdminPanel:`);
            // console.table(retrievedUsers);
            setUsers(retrievedUsers);

            const originalUsersLocal = structuredClone(retrievedUsers);
            setOriginalUsers(originalUsersLocal); // To enable changes to be reverted before saving
          } else {
            console.log("No users returned");
            setUsers([]);
            setOriginalUsers([]);
          }
          // const users: UserData[] = [];
        } catch (error) {
          console.error("Error fetching users:", error);
        }
      }
      return () => {
        if (users.length > 0) usersFetched = true;
      };
    };
    fetchUsers();
  }, [adminCredentials]);

  useEffect(() => {
    // Retrieve subscription status
    let entitlementFetched = false;
    const fetchSubscriptionStatus = async () => {
      if (adminCredentials && !entitlementFetched) {
        // Only attempt if adminCredentials have been obtained and Entitlement not yet obtained
        try {
          // console.log(
          //   `Fetching subscription status for tenant ${tenantId} using credentials ${JSON.stringify(adminCredentials)}`
          // );
          // const getEntitlementFunctionArn = cfnOutputs.getEntitlementFunctionArn;  // Uncomment once deployed via CDK
          const getEntitlementFunctionArn =
            "arn:aws:lambda:eu-west-2:471112910241:function:DocTran-mt-test-app-"; // Temporarily hard-coded
          const entitlement = await getEntitlement(
            getEntitlementFunctionArn,
            adminCredentials,
            tenantId
          );
          setSubscription(entitlement);
        } catch (error) {
          console.error("Error fetching subscription status:", error);
        }
        return () => {
          if (subscription) entitlementFetched = true;
        };
      }
    };
    fetchSubscriptionStatus();
  }, [adminCredentials]);

  function handleClickAddUser() {
    if (users.length >= subscription!.userCount) {
      reportStatus("No remaining entitlement - purchase additional subscription");
      return;
    }
    const usersLocal = [...users]; // Create copy, not reference, so React detects change and re-renders.

    const newId = new Date().toISOString(); // Dummy ID for uniquely identifying new user until persisted to Auth store
    let newUser: UserData = {
      id: newId,
      firstName: "",
      lastName: "",
      email: "",
      tenantId: tenantId,
      organisationName: organisationName,
      isNew: true,
      isChanged: false,
      isValid: false,
    };
    usersLocal.push(newUser);
    setUsers(usersLocal);
  }

  function updateUserSetWithChanges(changedUser: UserData): void {
    /*
      Updates the users state variable with the new values of the added / changed users
    */
    const usersLocal = [...users]; // Temporary working copy of users state array for manipulation
    try {
      const userIndex = usersLocal.findIndex((user) => user.id === changedUser.id);
      Object.assign(usersLocal[userIndex], changedUser);
      setUsers(usersLocal); // Update state with changed users
    } catch (error) {
      reportStatus("Error updating user");
      console.error("Error updating user set with changes:", error);
    }
  }

  function reportStatus(message: string) {
    setStatusMessage(message);
  }

  async function handleClickSaveChanges(e: Event) {
    // Write both new and changed users to back end
    e.preventDefault();
    let saveChangesOutcome = "";
    let usersCopy = [...users]; // Local variable to shadow state users array
    const newUsers = users.filter((user) => user.isNew && user.isValid); // New array of users newly-created locally
    const changedUsers = users.filter((user) => user.isChanged && user.isValid); // New array of users changed locally
    try {
      if (newUsers.length > 0) {
        try {
          const saveNewUsersOutcome = await saveNewUsers(tenantId, newUsers, adminCredentials!);
          if (saveNewUsersOutcome!.details.length > 0) console.error(saveNewUsersOutcome!.details); // Delete after debugging
          // Update usersCopy with results of saveNewUsersOutcome.usersAdded:
          if (saveNewUsersOutcome!.usersAdded.length > 0) {
            // Replace temporary timestamp-based Ids of new users with those assigned by identity store:
            const updateUsersWithSavedState = (savedUsers: UserData[]) => {
              usersCopy.forEach((user, index) => {
                const matchedNewUser = savedUsers.find((newUser) => newUser.email === user.email);
                if (matchedNewUser) {
                  usersCopy[index] = {
                    ...user,
                    id: matchedNewUser.id,
                    isNew: matchedNewUser.isNew,
                  };
                }
              });
            };
            updateUsersWithSavedState(saveNewUsersOutcome!.usersAdded);
          }

          saveChangesOutcome = saveNewUsersOutcome!.message;
        } catch (error) {
          if (error instanceof ManageUsersError) {
            saveChangesOutcome = error.message;
            console.error(`Error saving new users: ${error.message}: ${error.details}`);
          } else {
            saveChangesOutcome = "Unknown error saving new users";
            console.error("Error saving new users:", JSON.stringify(error));
          }
          throw error;
        }
      }

      if (changedUsers.length > 0) {
        try {
          // console.log(`${changedUsers.length} users updated`);
          const saveChangedUsersOutcome = await saveChangedUsers(changedUsers, adminCredentials!);
          if (saveChangesOutcome.length > 0) saveChangesOutcome += "; "; // To concatenate outcomes from both operations
          saveChangesOutcome += saveChangedUsersOutcome.message;
          if (saveChangedUsersOutcome.details.length > 0)
            console.error(saveChangedUsersOutcome.details); // <-- Delete after debugging
          if (saveChangedUsersOutcome.usersUpdated.length > 0) {
            const updateUsersWithSavedState = (savedUsers: UserData[]) => {
              usersCopy.forEach((user, index) => {
                const matchedChangedUser = savedUsers.find(
                  (changedUser) => changedUser.id === user.id
                );
                if (matchedChangedUser) {
                  usersCopy[index] = {
                    ...user,
                    isChanged: matchedChangedUser.isChanged,
                  };
                }
              });
            };
            updateUsersWithSavedState(saveChangedUsersOutcome.usersUpdated);
          }
        } catch (error) {
          if (error instanceof ManageUsersError) {
            saveChangesOutcome = error.message;
            console.error(`Error saving changed users: ${error.details}`);
          } else {
            saveChangesOutcome = "Unknown error saving changed users";
            console.error("Error saving changed users:", JSON.stringify(error));
          }
          throw error;
        }
      }
      // Display operation-specific outcomes:
      if (newUsers.length > 0 && changedUsers.length > 0) {
        setUsers(usersCopy);
        setOriginalUsers(usersCopy); // Now that changes successfully applied, ensure local state cannot be reverted out of sync with back end
        reportStatus("Changes written successfully to the Identity Store");
      } else if (newUsers.length > 0 || changedUsers.length > 0) {
        console.log(`Current user set before setUsers():`);
        console.table(usersCopy);
        setUsers(usersCopy);
        setOriginalUsers(structuredClone(usersCopy));
        reportStatus(saveChangesOutcome);
      } else {
        reportStatus("No changes to write");
      }
    } catch (error) {
      reportStatus(saveChangesOutcome);
    }
  }

  function deleteToggleChanges(user: UserData) {
    let tempUsers = rowsToDelete; // Local shadow variable for users to be deleted
    if (rowsToDelete.has(user.id)) {
      // console.log("  User ID IS in the list, so needs to be removed"); // Delete after debugging
      tempUsers.delete(user.id); // Remove user from set (not id property from user)
      setrowsToDelete(tempUsers);
    } else {
      tempUsers.add(user.id); // Add user to set (not id property to user)
      setrowsToDelete(tempUsers);
    }
    tempUsers.size === 0 ? setDisableDeleteButton(true) : setDisableDeleteButton(false);
  }

  async function handleClickDeleteUser() {
    try {
      const deleteUsersOutcome: DeleteUsersOutcome = await deleteUsers(
        rowsToDelete,
        adminCredentials!,
        tenantId
      );
      // console.log("User set before deletion:");
      // console.table(users);
      let usersCopy = [...users]; // Temporary local variable to shadow component state
      for (const deletedUserId of deleteUsersOutcome.usersDeleted) {
        usersCopy.splice(
          usersCopy.findIndex((user) => {
            return user.id === deletedUserId;
          }),
          1
        );
      }
      // console.log("Shadow user set after deletion:");
      // console.table(usersCopy);
      reportStatus(deleteUsersOutcome.message);
      setUsers(usersCopy);
      setOriginalUsers(usersCopy); // Now that user(s) successfully deleted, ensure local state cannot be reverted out of sync with back end
      // Reset set of users deleted:
      let tempUsers = rowsToDelete;
      tempUsers.clear();
      // Post-deletion clean-up:
      setrowsToDelete(tempUsers); // Clear state variable
      setDisableDeleteButton(true);
    } catch (error: any) {
      console.error(JSON.stringify(error.message));
      reportStatus(error.message);
    }
  }

  function handleCancelClick(): void {
    setUsers(structuredClone(originalUsers));
  }

  const columns = [
    { title: "First Name", minWidth: 85 },
    { title: "Last Name", minWidth: 85 },
    { title: "Email", minWidth: 235 },
    { title: "Delete?", minWidth: 10 },
  ];

  return (
    <>
      <ContentLayout
        header={
          <SpaceBetween direction="vertical" size="m">
            <Header
              variant="h1"
              // description={t("translation_quick_text_description")}
              description={"Add, Edit, and Configure user accounts for Translate"}
            >
              Manage Users
            </Header>
            <Container
              header={
                <Header variant="h2" description="">
                  Entitlement
                </Header>
              }
            >
              {subscription?.subscriptionStatus === "Subscription valid" && !subscription?.isExpired
                ? users.length + ` registered of ` + subscription?.userCount + ` available `
                : subscription?.subscriptionStatus}
            </Container>
          </SpaceBetween>
        }
      >
        <Container>
          <Form>
            <SpaceBetween direction="vertical" size="m">
              <UserTable
                columnDefinitions={columns}
                users={users}
                updateUserSetWithChanges={updateUserSetWithChanges} // Callback function to surface changes for write
                deleteToggleChanges={deleteToggleChanges}
                reportStatus={reportStatus}
              ></UserTable>
              <SpaceBetween direction="horizontal" size="l">
                <Button
                  disabled={!subscription || subscription.userCount < 1}
                  variant="normal"
                  onClick={handleClickAddUser}
                >
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
