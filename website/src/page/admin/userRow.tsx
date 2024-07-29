import React, { useEffect, useState } from "react";
import { Checkbox } from "@cloudscape-design/components";

export default function UserRow({ user, updateUserSetWithChanges, deleteToggleChanges, reportStatus }) {
    const [userDetails, setUserDetails] = useState(user);
    const [deleteChecked, setDeleteChecked] = useState(false);  // Local state for Delete User tickbox
    // console.log("deleteChecked rendered with box ticked " + deleteChecked);
    // console.log("Displaying details for user " + JSON.stringify(userDetails));

    useEffect(() => {   // Required to make userRow component re-render when ancestor components do
        setUserDetails(user);
        setDeleteChecked(false);
    }, [user]);

    function handleChange(e) {
        // console.log("handleChange - value of user before change: " + JSON.stringify(userDetails));
        let userCopy = Object.assign({}, userDetails);  // Local shadow variable for current user
        const fieldName = e.target.name; 
        if (!userCopy.ischanged) {    // Only set these properties if change to field value not already flagged
            userCopy.ischanged = true;
            userCopy.isvalid = false; // Assume invalid until explicitly validated in onBlur()
        } else {
            if (e.target.value === user[fieldName]) {   // Has value reverted to that persisted in the identify store?
                // console.log(fieldName + " has reverted");
                userCopy.ischanged = false;
                userCopy.isvalid = true;
            };
        };
        userCopy[fieldName] = e.target.value;
        // console.log(" handleChange - Updated value of user: " + JSON.stringify(userCopy));
        setUserDetails(userCopy);
    };
    
    function handleBlur(e) {
        console.log("handleBlur - user: " + JSON.stringify(userDetails));
        let userCopy = Object.assign({}, userDetails);  // Local shadow variable for current user
        const fieldName = e.target.name; 
        // console.log("Leaving " + fieldName + " with latest user details: " + JSON.stringify(userDetails[fieldName]));
        reportStatus("");   // Clear any existing status message
        const result = validateChanges(fieldName, e.target.value);
        if (result === true) {
            userCopy.isvalid = true;
            // console.log("handleBlur - value of " + fieldName + " for following user is valid: " + JSON.stringify(userCopy));
            setUserDetails(userCopy);   // Is this still necessary in the light of updateUserSetWithChanges?
            // console.log(" handleBlur - updated users: " + JSON.stringify(userDetails));
            updateUserSetWithChanges(userCopy);
            // To do: Change field's background colour to light orange indicating it needs to be saved
        } else {
            reportStatus(result);   // Notify user of invalid entry
            // To do: Change field's background colour to light red indicating it is invalid
            e.target.focus();
            e.target.select();
        }
    };

    function validateChanges(fieldName, value) {
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
            };
        };
    }

    function handleDeleteToggle(e) {
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
                    name="firstName"
                    type="text"
                    required={true}
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
                    maxLength={64}
                    pattern="[a-zA-Z0-9.]@(\S)+\.\D"
                    value={userDetails.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                />
            </td>
            <td>
                <Checkbox
                    checked={deleteChecked}
                    onChange={handleDeleteToggle}
                    disabled = {user.isNew}>
                </Checkbox>
            </td>
        </>
    )
}