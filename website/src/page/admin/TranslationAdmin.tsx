// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import "@cloudscape-design/global-styles/index.css";

import React from "react";
// import { useTranslation } from "react-i18next";
// Modified copy of TranslationQuick to get admin panel working from navigation link
import {
	ContentLayout,
	Header,
	SpaceBetween,
} from "@cloudscape-design/components";

// import Form from "./quickForm";

export default function TranslationAdmin() {
	// const { t } = useTranslation();

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
				{/* <Form /> */}
			</ContentLayout>
		</>
	);
}
