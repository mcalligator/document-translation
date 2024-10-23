import "./adminStyles.css";
import "@cloudscape-design/global-styles/index.css";

import React, { ChangeEvent, useEffect, useState } from "react";

import { Checkbox, CheckboxProps } from "@cloudscape-design/components";

import { ColumnDefinition, UserData } from "./util/typeExtensions";

interface UserRowProps {
  user: UserData;
  updateUserSetWithChanges: Function;
  deleteToggleChanges: Function;
  reportStatus: Function;
  fields: ColumnDefinition[];
}

export default function UserRow({
  user,
  updateUserSetWithChanges,
  deleteToggleChanges,
  reportStatus,
  fields,
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
    // console.log("handleChange - value before change: " + JSON.stringify(userDetails)); // <-- Delete after debugging
    let userCopy: UserData = { ...userDetails }; // Local shadow variable for current user
    const currentColumn = fields.find((col) => col.name === e.target.name);
    const minWidth = currentColumn?.minWidth || 0;
    // e.target.style.width = "30px";
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
    const charWidth = 8; // Approximate width of a character in pixels
    const newWidth = Math.max(e.target.value.length * charWidth, minWidth);
    e.target.style.width = `${newWidth}px`;

    // console.log(" handleChange - previous value of user: " + JSON.stringify(userCopy));  // <-- Delete after debugging
    userCopy[fieldName] = e.target.value;
    // console.log(" handleChange - Updated value of user: " + JSON.stringify(userCopy)); // <-- Delete after debugging
    setUserDetails(userCopy);
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    // console.log("handleBlur - user: " + JSON.stringify(userDetails));
    let userCopy: UserData = Object.assign({}, userDetails); // Local shadow variable for current user
    const fieldName = e.target.name;
    reportStatus(""); // Clear any existing status message
    const result = validateChanges(fieldName, e.target.value);
    if (result === true) {
      userCopy.isValid = true;
      setFieldValidity(true);
      setUserDetails(userCopy);
      // console.log(" handleBlur - updated user: " + JSON.stringify(userDetails));
      updateUserSetWithChanges(userCopy); // Not sure this is ideal: updates users array (and hence re-renders) every time focus leaves any field in any userRow
      // To do: Change field's background colour to light orange indicating it needs to be saved
    } else {
      reportStatus(result); // Notify user of invalid entry
      setFieldValidity(false);

      // To do: Change field's background colour to light red indicating it is invalid
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

  const handleDeleteToggle: CheckboxProps["onChange"] = (e) => {
    const checked = e.detail.checked;
    // console.log("Toggle button clicked; value now " + checked);
    setDeleteChecked(checked);
    // console.log("deleteChecked set to " + deleteChecked);
    // Enable or disable the Delete User button when checkbox at end of row clicked
    deleteToggleChanges(userDetails);
  };

  return (
    <>
      <td>
        <input
          name={fields[0].name}
          type="text"
          style={{ width: fields[0].minWidth }} // Replace with dynamic calculation of longest entry in this column
          required={true}
          className={fieldValidity ? "input.valid" : "input.error"}
          value={userDetails.firstName}
          onChange={handleChange}
          onBlur={handleBlur}
        />
      </td>
      <td>
        <input
          name={fields[1].name}
          type="text"
          style={{ width: fields[1].minWidth }} // Replace with dynamic calculation of longest entry in this column
          required={true}
          className={fieldValidity ? "input.valid" : "input.error"}
          value={userDetails.lastName}
          onChange={handleChange}
          onBlur={handleBlur}
        />
      </td>
      <td>
        <input
          name={fields[2].name}
          type="email"
          style={{ width: fields[2].minWidth }} // Replace with dynamic calculation of longest entry in this column
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
