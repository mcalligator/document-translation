import "./adminStyles.css";
import "@cloudscape-design/global-styles/index.css";

import React, { ChangeEvent, useEffect, useRef, useState } from "react";

import { Checkbox, CheckboxProps } from "@cloudscape-design/components";

import { ColumnDefinition, UserData } from "./util/typeExtensions";

interface UserRowProps {
  user: UserData;
  updateUserSetWithChanges: Function;
  deleteToggleChanges: Function;
  reportStatus: Function;
  fields: ColumnDefinition[];
  columnWidths: Record<string, number>;
  onInputResize: (field: string, width: number) => void;
}

export default function UserRow({
  user,
  updateUserSetWithChanges,
  deleteToggleChanges,
  reportStatus,
  fields,
  columnWidths,
  onInputResize,
}: UserRowProps) {
  const [userDetails, setUserDetails] = useState<UserData>(user);
  const [deleteChecked, setDeleteChecked] = useState(false); // Local state for Delete User tickbox
  const [fieldValidity, setFieldValidity] = useState(true);

  const inputRefs = {
    firstName: useRef<HTMLInputElement>(null),
    lastName: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
  };

  console.debug("deleteChecked rendered with box ticked " + deleteChecked);
  console.debug("Displaying details for user " + JSON.stringify(userDetails));

  useEffect(() => {
    // Required to make userRow component re-render when ancestor components do
    setUserDetails(user);
    setDeleteChecked(false);
  }, [user]);

  const handleInputChange =
    (field: keyof typeof inputRefs) => (e: ChangeEvent<HTMLInputElement>) => {
      let userCopy: UserData = { ...userDetails }; // Local shadow variable for current user
      const currentColumn = fields.find((col) => col.name === e.target.name);
      const minWidth = currentColumn?.minWidth || 0;
      const maxWidth = currentColumn?.maxWidth || 400;
      const fieldName: string = e.target.name;
      if (!userCopy.isNew) {
        if (!userCopy.isChanged) {
          // Only set these properties if change to field value not already flagged
          userCopy.isChanged = true;
          userCopy.isValid = false; // Assume invalid until explicitly validated in onBlur()
        } else {
          if (e.target.value === user[fieldName]) {
            // Has value reverted to that persisted in the identity store?
            console.debug(fieldName + " has reverted");
            userCopy.isChanged = false;
            userCopy.isValid = true;
          }
        }
      }

      userCopy[fieldName] = e.target.value;
      setUserDetails(userCopy);
      // Measure content width
      const input = inputRefs[field].current;
      if (input) {
        // Create temporary span to measure text width
        const span = document.createElement("span");
        span.style.visibility = "hidden";
        span.style.position = "absolute";
        span.style.whiteSpace = "pre";
        span.style.font = window.getComputedStyle(input).font;
        span.textContent = e.target.value;
        document.body.appendChild(span);

        const textWidth = span.offsetWidth;
        document.body.removeChild(span);

        // Add padding for input
        const newWidth = textWidth + 20;
        if (newWidth > columnWidths[field]) {
          onInputResize(field, newWidth);
        }
      }
    };

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    console.debug("handleBlur - user: " + JSON.stringify(userDetails));
    let userCopy: UserData = Object.assign({}, userDetails); // Local shadow variable for current user
    const fieldName = e.target.name;
    reportStatus(""); // Clear any existing status message
    const result = validateChanges(fieldName, e.target.value);
    if (result === true) {
      userCopy.isValid = true;
      setFieldValidity(true);
      setUserDetails(userCopy);
      console.debug(" handleBlur - updated user: " + JSON.stringify(userDetails));
      updateUserSetWithChanges(userCopy); // Not sure this is ideal: updates users array (and hence re-renders) every time focus leaves any field in any userRow
      // To do: Change field's background colour to light orange indicating it needs to be saved
    } else {
      reportStatus(result); // Notify user of invalid entry
      setFieldValidity(false);

      // To do: Change field's background colour to light red indicating it is invalid
    }
  }

  function validateChanges(fieldName: string | undefined, value: string) {
    console.debug("Validating changes for " + fieldName);
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
    console.debug("Toggle button clicked; value now " + checked);
    setDeleteChecked(checked);
    console.debug("deleteChecked set to " + deleteChecked);
    // Enable or disable the Delete User button when checkbox at end of row clicked
    deleteToggleChanges(userDetails);
  };

  return (
    <>
      <td style={{ width: columnWidths.firstName }}>
        <input
          ref={inputRefs.firstName}
          name={"firstName"}
          type="text"
          style={{ width: "100%" }}
          required={true}
          className={fieldValidity ? "input.valid" : "input.error"}
          value={userDetails.firstName}
          onChange={handleInputChange("firstName")}
          onBlur={handleBlur}
        />
      </td>
      <td style={{ width: columnWidths.lastName }}>
        <input
          ref={inputRefs.lastName}
          name={"lastName"}
          type="text"
          style={{ width: "100%" }}
          required={true}
          className={fieldValidity ? "input.valid" : "input.error"}
          value={userDetails.lastName}
          onChange={handleInputChange("lastName")}
          onBlur={handleBlur}
        />
      </td>
      <td style={{ width: columnWidths.email }}>
        <input
          ref={inputRefs.email}
          name={"email"}
          type="email"
          style={{ width: "100%" }}
          required={true}
          className={fieldValidity ? "input.valid" : "input.error"}
          placeholder="user@domain"
          maxLength={64}
          pattern="[a-zA-Z0-9.]@(\S)+\.\D"
          value={userDetails.email}
          onChange={handleInputChange("email")}
          onBlur={handleBlur}
        />
      </td>
      <td className="centred" style={{ width: columnWidths.delete }}>
        <Checkbox
          checked={deleteChecked}
          onChange={handleDeleteToggle}
          disabled={user.isNew}
        ></Checkbox>
      </td>
    </>
  );
}