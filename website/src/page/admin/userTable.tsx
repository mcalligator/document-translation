import React from "react";

import { UserData } from "../../util/typeExtensions.js";

import UserRow from "./userRow";

export default function UserTable({
  users,
  updateUserSetWithChanges,
  deleteToggleChanges,
  reportStatus,
}) {
  // console.log("Number of users: " + users.length);

  return (
    <table>
      <thead>
        <tr>
          <th>First Name</th>
          <th>Last Name</th>
          <th>Email Address</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user: UserData, index: number) => {
          // console.log(
          //   "User: " + user.firstName + " ID: " + user.id + " Index: " + index
          // );
          return (
            <tr key={index}>
              <UserRow
                user={user}
                updateUserSetWithChanges={updateUserSetWithChanges}
                deleteToggleChanges={deleteToggleChanges}
                reportStatus={reportStatus}
              />
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
