import "./adminStyles.css";
import "@cloudscape-design/global-styles/index.css";

import React, { ChangeEvent, useEffect, useState } from "react";

import { Checkbox } from "@cloudscape-design/components";
import {
  borderRadiusInput,
  colorBackgroundInputDefault,
  colorTextBodyDefault,
  spaceFieldHorizontal,
} from "@cloudscape-design/design-tokens";

import { UserData } from "../../util/typeExtensions";

interface UserRowProps {
  user: UserData;
  updateUserSetWithChanges: Function;
  deleteToggleChanges: Function;
  reportStatus: Function;
}

export default function UserRow({
  user,
  updateUserSetWithChanges,
  deleteToggleChanges,
  reportStatus,
}: UserRowProps) {
  const [userDetails, setUserDetails] = useState<UserData>(user);
  const [deleteChecked, setDeleteChecked] = useState(false); // Local state for Delete User tickbox
  const [fieldValidity, setFieldValidity] = useState(true);
  // console.log("deleteChecked rendered with box ticked " + deleteChecked);
  // console.log("Displaying details for user " + JSON.stringify(userDetails));

  useEffect(() => {
    // Required to make userRow component re-render when ancestor components do
    setUserDetails(user);
    setDeleteChecked(false);
  }, [user]);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    /*
    Updates field content with text typed, and resizes it appropriately
    */
    // console.log(
    //   "handleChange - value before change: " + JSON.stringify(userDetails)
    // );
    let userCopy: UserData = Object.assign({}, userDetails); // Local shadow variable for current user
    // let userCopy: UserData = { ...userDetails }; // Local shadow variable for current user
    e.target.style.width = "30px";
    e.target.style.width = `${e.target.scrollWidth}px`;
    const fieldName: string = e.target.name;
    if (!userCopy.isNew) {
      if (!userCopy.isChanged) {
        // Only set these properties if change to field value not already flagged
        userCopy.isChanged = true;
        userCopy.isValid = false; // Assume invalid until explicitly validated in onBlur()
      } else {
        if (e.target.value === user[fieldName]) {
          // Has value reverted to that persisted in the identity store?
          // console.log(fieldName + " has reverted");
          userCopy.isChanged = false;
          userCopy.isValid = true;
        }
      }
    }
    // console.log(
    //   " handleChange - previous value of user: " + JSON.stringify(userCopy)
    // );
    userCopy[fieldName] = e.target.value;
    // console.log(
    //   " handleChange - Updated value of user: " + JSON.stringify(userCopy)
    // );
    setUserDetails(userCopy);
  }

  function handleBlur(e) {
    // console.log("handleBlur - user: " + JSON.stringify(userDetails));
    let userCopy: UserData = Object.assign({}, userDetails); // Local shadow variable for current user
    const fieldName = e.target.name;
    // console.log(
    //   "Leaving " +
    //     fieldName +
    //     " with latest user details: " +
    //     JSON.stringify(userDetails[fieldName])
    // );
    reportStatus(""); // Clear any existing status message
    const result = validateChanges(fieldName, e.target.value);
    if (result === true) {
      userCopy.isValid = true;
      setFieldValidity(true);
      // console.log(
      //   "handleBlur - value of " +
      //     fieldName +
      //     " for following user is valid: " +
      //     JSON.stringify(userCopy)
      // );
      setUserDetails(userCopy); // Is this still necessary in the light of updateUserSetWithChanges?
      // console.log(" handleBlur - updated user: " + JSON.stringify(userDetails));
      updateUserSetWithChanges(userCopy);
      // To do: Change field's background colour to light orange indicating it needs to be saved
    } else {
      reportStatus(result); // Notify user of invalid entry
      setFieldValidity(false);
      // To do: Change field's background colour to light red indicating it is invalid
      // e.target.focus();
      // e.target.select();
    }
  }

  function validateChanges(fieldName: string | undefined, value: string) {
    // console.log("Validating changes for " + fieldName);
    if (fieldName === "email") {
      const matchPattern = /[a-zA-Z0-9.]@(\S)+\.\D/;
      // If entry matches regex, return true, otherwise return error message
      return matchPattern.test(value) ? true : "Not a valid email address";
    } else {
      if (value === "") {
        return "This field cannot be blank";
      } else {
        return true;
      }
    }
  }

  function handleDeleteToggle(e) {
    const checked = e.detail.checked;
    // console.log("Toggle button clicked; value now " + checked);
    setDeleteChecked(checked);
    // console.log("deleteChecked set to " + deleteChecked);
    // Enable or disable the Delete User button when checkbox at end of row clicked
    deleteToggleChanges(userDetails);
  }

  return (
    <>
      <td>
        <input
          name="firstName"
          type="text"
          required={true}
          className={fieldValidity ? "input.valid" : "input.error"}
          value={userDetails.firstName}
          onChange={handleChange}
          onBlur={handleBlur}
        />
      </td>
      <td>
        <input
          name="lastName"
          type="text"
          required={true}
          className={fieldValidity ? "input.valid" : "input.error"}
          value={userDetails.lastName}
          onChange={handleChange}
          onBlur={handleBlur}
        />
      </td>
      <td>
        <input
          name="email"
          type="email"
          required={true}
          className={fieldValidity ? "input.valid" : "input.error"}
          placeholder="user@domain"
          maxLength={64}
          pattern="[a-zA-Z0-9.]@(\S)+\.\D"
          value={userDetails.email}
          onChange={handleChange}
          onBlur={handleBlur}
        />
      </td>
      <td className="centred">
        <Checkbox
          checked={deleteChecked}
          onChange={handleDeleteToggle}
          disabled={user.isNew}
        ></Checkbox>
      </td>
    </>
  );
}
