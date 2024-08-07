// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import "@cloudscape-design/global-styles/index.css";

import React, {useState} from "react";
import { fetchAuthSession } from "@aws-amplify/auth";

// Modified copy of TranslationQuick to get admin panel working from navigation link
import {
	Box,
	Button,
	ContentLayout,
	Header,
	SpaceBetween,
} from "@cloudscape-design/components";

function AdminPanel() {
	const [boxContent, setBoxContent] = useState("");
	
	async function displayDetails() {
		try {
			const authSession = await fetchAuthSession();
			// console.log(JSON.stringify(authSession));
			setBoxContent(JSON.stringify(authSession));
		} catch (error) {
			console.error({ error });
		};
	}
	
	return (
		<>
			<ContentLayout
				header={
					<SpaceBetween size="m">
						<Header
							variant="h1"
							// description={t("translation_quick_text_description")}
							description={"Add, Edit, and Configure user accounts for Translate"}
						>
							{"Manage Users"}
						</Header>
					</SpaceBetween>
				}
			>
				<SpaceBetween size="m">
					<p>Click to display details of currently logged in user</p>
					<Button
						variant="primary"
						onClick={displayDetails}
					>
						User Details
					</Button>
					<Box variant="code">
						{boxContent}
					</Box>
				</SpaceBetween>				
			</ContentLayout>
		</>
	);
}

export default AdminPanel;