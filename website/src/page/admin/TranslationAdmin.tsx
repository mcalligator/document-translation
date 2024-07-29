import React, { useEffect, useState } from "react";
import "@cloudscape-design/global-styles/index.css"
import { Box, Button, Container, Form, Header, SpaceBetween } from "@cloudscape-design/components";
import { withAuthenticator } from "@aws-amplify/ui-react";
import UserTable from "./userTable";
import config from "./config.json" // with {type: 'json'};
// import users from "./users.json"

function TranslationAdmin() {
  let entitlement = 5;  // Placeholder value; when panel integrated into solution; this will be obtained from Marketplace API
  type UserData = {
    id: string,
    firstName: string,
    lastName: string,
    email: string,
    isNew?: boolean,
    isvalid?: boolean,
    ischanged?: boolean
  };
  type Id = {
    id: string
  };
  const [users, setUsers] = useState<UserData[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [rowsSelectedForDeletion, setRowsSelectedForDeletion] = useState(new Set<string>());
  const [disableDeleteButton, setDisableDeleteButton] = useState(true);
  // const [userInfoChanged, setUserInfoChanged] = useState(false);  // Might not need this state variable

  // console.log("User set at TranslationAdmin render time:\n" + JSON.stringify(users)); // Is users state variable being updated?

  function addUser(e) {
    // To do: enable only if registered users < entitlement
    // console.log("Add User button clicked");
    const newId = new Date().toISOString(); // Dummy ID for uniquely identifying new user until persisted to Auth store
    // console.log("Timestamp generated: " + newId);
    let newUser = ({
      id: newId,
      firstName: "",
      lastName: "",
      email: "",
      isNew: true,
      isvalid: false
    });
    const userArray = [...users]; // Create copy, not reference, otherwise React will not detect change, and no re-render will occur
    userArray.push(newUser);
    setUsers(userArray);
    // console.log(" After adding new blank user:" + JSON.stringify(userArray));
  }

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const dataUrl = config.deploymentConfig.dataScheme +
          "://" + config.deploymentConfig.dataHost + ":" +
          config.deploymentConfig.dataPort;
        const response = await fetch(dataUrl + '/api/users', { mode: 'cors' });
        const users = await response.json();
        setUsers(users);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    console.log("* * * Fetching users");
    fetchUsers();
  }, []);

  function updateUserSetWithChanges(changedUser) {
    // Updates the users state variable with the new values of the added / changed users
    const userArray = [...users]; // Temporary working copy of users state array for manipulation
    console.log(`updateUserSetWithChanges - Changed user: ${JSON.stringify(changedUser)}`);
    console.table(userArray);
    const userIndex = userArray.findIndex(user => user.id === changedUser.id);
    console.log("Index of changed user: " + userIndex);
    Object.assign(userArray[userIndex], changedUser);
    // console.log("Current user set:\n" + JSON.stringify(userArray));
    setUsers(userArray); // Update state with changed users
  }

  async function handleClickSaveChanges(e) {  // Distribute responsibilities between this function and updateAllChangedUsers
    // Write new and changed users to back end
    // If >=1 new or changed user, create PUT request:
    const changedUsers = users.filter((user) => user.ischanged);
    const newUsers = users.filter((user) => user.isNew);  // Separate array for new users so temporary IDs can be reassigned after write
    // Add new and changed users to new set to avoid duplicates of new users (which will also have isChanged = true)
    let usersToWrite = new Set<UserData>();
    for (const user of newUsers) usersToWrite.add(user);
    for (const user of changedUsers) usersToWrite.add(user);
    // Strip out status properties before writing to back end
    usersToWrite.forEach((user: UserData) => {
      // console.log("User with status properties: " + JSON.stringify(user));
      delete user.ischanged;
      delete user.isNew;
      delete user.isvalid;
    })
    // console.log(" Users to write: " + JSON.stringify(usersToWrite));
    // for (const item of usersToWrite.values()) {
    //   console.log(" User without status properties: " + JSON.stringify(item));
    // };
    // console.log("Total users to be written: " + usersToWrite.size);

    try {
      const dataUrl = config.deploymentConfig.dataScheme +
        "://" + config.deploymentConfig.dataHost + ":" +
        config.deploymentConfig.dataPort;
      const requestOptions = {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Array.from(usersToWrite))
      };

      const response = await fetch(dataUrl + '/api/users', requestOptions);

      const updatedUsers = await response.json();
      console.log(" Outcome of update request: " + JSON.stringify(updatedUsers));
      // Replace local temporary ID of new users with server-issued one:
      // console.log("  New users (temporary IDs):\n" + JSON.stringify(newUsers));
      for (let newUser of newUsers) {
        const userIndex = updatedUsers.findIndex((user) => user.email === newUser.email);
        newUser.id = updatedUsers[userIndex].id;
      }
      // console.log("  New users (saved IDs):\n" + JSON.stringify(newUsers));
      // Prepare to re-render new and changed users:
      let usersCopy = [...users];
      // for (const updatedUser of updatedUsers) { // Mulitple lines for readability
      // let tempUser = usersCopy.find((userCopy) => userCopy.id === updatedUser.id);
      // Object.assign(tempUser, updatedUser);
      // };
      // console.log("Modified temporary variable:");
      // console.table(usersCopy);
      setUsers(usersCopy);  // Update state so changes are reflected on the page 
      // console.log("Modified state variable:");
      // console.table(users);
    } catch (error) {
      console.error('Error updating users: ', error);
    }
  }

  function reportStatus(message: string) {
    setStatusMessage(message);
  }

  function deleteToggleChanges(user: UserData) {
    //To do: get value of 'user' passed in for newly-created user to be from server, not the local value
    // Arises from userRow's user variable not being updated when a new user is added
    let tempUsers = rowsSelectedForDeletion; // Local shadow variable for users to be deleted
    console.log("User passed in: " + user.id);  // Delete after debugging
    // Disable Delete User button only when NO checkboxes are ticked
    console.log("rowsSelectedForDeletion includes " + user.id + "? " + rowsSelectedForDeletion.has(user.id))
    let debugUsers = "";  // Delete after debugging
    if (rowsSelectedForDeletion.has(user.id)) {
      console.log("  User ID IS in the list");  // Delete after debugging
      tempUsers.delete(user.id); // Remove this user from the set (not to be confused with removing the id property from the user)
      for (const u of tempUsers) { debugUsers += u + ":" };  // Delete after debugging
      console.log(" Updated set of users to be deleted: " + debugUsers);  // Delete after debugging
      setRowsSelectedForDeletion(tempUsers);
    } else {
      console.log("  User ID is NOT in the list");
      tempUsers.add(user.id); // Add this user to the set (not to be confused with adding an id property to the user)
      for (const u of tempUsers) { debugUsers += u + ":" };  // Delete after debugging
      console.log(" Updated set of users to be deleted: " + debugUsers);  // Delete after debugging
      setRowsSelectedForDeletion(tempUsers);
    };
    console.log("No. rows to be deleted: " + rowsSelectedForDeletion.size);
    console.log("Rows with Delete checkbox ticked: " + debugUsers);  // Delete after debugging
    tempUsers.size === 0 ? setDisableDeleteButton(true) : setDisableDeleteButton(false);
  }

  async function handleClickDeleteUser(e) {
    console.log("Deleting users " + JSON.stringify(Array.from(rowsSelectedForDeletion)));
    let usersToDelete = Array<Id>();
    for (const userId of rowsSelectedForDeletion) {
      if (Array.isArray(usersToDelete)) {
        usersToDelete.push({ id: userId }); // using array of objects rather than scalar numbers to simplify back-end
      }
    };
    console.log("Array of users to be deleted:\n" + JSON.stringify(usersToDelete));
    try {
      const dataUrl = config.deploymentConfig.dataScheme +
        "://" + config.deploymentConfig.dataHost + ":" +
        config.deploymentConfig.dataPort;
      const requestOptions = {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(usersToDelete)
      };
      const response = await fetch(dataUrl + '/api/users', requestOptions);
      let deletedOutcome = await response.json();
      let usersCopy = [...users];  // Temporary variable to shadow component state
      console.log(`Deleted users:\n${JSON.stringify(deletedOutcome)}`);
      for (const deletedUser of deletedOutcome) {
        let localUserToDelete: UserData = usersCopy.find((user: UserData) => user.id === deletedUser.id) as UserData;
        console.log("  Local user to be deleted: " + JSON.stringify(localUserToDelete));
        // usersCopy.splice(usersCopy.find((user) => user.id === deletedUser.id), 1);
        usersCopy.splice(usersCopy.indexOf(localUserToDelete), 1);
      }
      // Reset set of users deleted:
      let tempUsers = rowsSelectedForDeletion;
      tempUsers.clear();
      setRowsSelectedForDeletion(tempUsers); // After deleting, clear state variable
      setUsers(usersCopy);  // Update state with remaining users
    } catch (error) {
      console.error('Error deleting users:', error);
    }
  };

  return (
    <>
      <Container>
        <Header
          variant="h2"
          description="Add, Edit, and Configure user accounts for Translate"
        >
          <SpaceBetween direction="horizontal" alignItems="end" size="xl">
            Manage Users
          </ SpaceBetween>
        </Header >
        <Form header={
          <p>
            <b>Entitlement</b>: {entitlement} named users ({users.length} registered)
          </p>
        }>
          <SpaceBetween direction="vertical" size="m">
            <UserTable
              users={users}
              updateUserSetWithChanges={updateUserSetWithChanges} //Callback function to surface changes for write
              deleteToggleChanges={deleteToggleChanges}
              reportStatus={reportStatus}
            >
            </UserTable>
            <SpaceBetween direction="horizontal" size="l">
              <Button
                variant="primary"
                onClick={addUser}
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
      </Container >
    </>
  )
}

export default withAuthenticator(TranslationAdmin);