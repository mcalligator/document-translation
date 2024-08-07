// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { SideNavigation } from "@cloudscape-design/components";

import { CreateJob as ReadableCreateJob } from "../../util/readableCreateJob";
import { title } from "process";

const features = require("../../features.json");

export default function Navigation( user: any ) {
	const { t } = useTranslation();
	const navigate = useNavigate();

	const groups : string[] = user?.user?.authSession?.tokens?.accessToken?.payload?.["cognito:groups"]

	const userRole = "admin";	// Temporarily hard-coded to display Administration section

	const navigationItems = [];
	if (features.translation) {
		navigationItems.push({
			type: "section-group",
			title: t("translation_title"),
			items: [
				{
					type: "link",
					text: t("generic_history"),
					href: "/translation/history",
				},
				{
					type: "link",
					text: t("generic_create_new"),
					href: "/translation/new",
				},
				{
					type: "link",
					text: t("translation_quick_text"),
					href: "/translation/quick",
				},
			],
		});
	}
	if (features.translation && features.readable) {
		navigationItems.push({ type: "divider" });
	}
	if (features.readable) {
		navigationItems.push({
			type: "section-group",
			title: t("readable_title"),
			items: [
				{
					type: "link",
					text: t("generic_history"),
					href: "/readable/history",
				},
				{
					type: "link",
					text: t("generic_create_new"),
					href: "/readable/view",
				},
			],
		});
	}

	if (typeof(groups) !== 'undefined' && groups.includes('TenantAdmins')) {
		navigationItems.push({
			type: "section",
			text: "Admin",
			items: [
				{
					type: "link",
					text: "Manage Users",
					href: "/admin",
				},
			],
		});
	}

	return (
		<SideNavigation
			data-testid="sidenavigation"
			activeHref={window.location.pathname}
			onFollow={async (event) => {
				if (!event.detail.external) {
					event.preventDefault();

					const readableViewHref = "/readable/view";
					const href = event.detail.href;
					if (href.startsWith(readableViewHref)) {
						const jobId = await ReadableCreateJob();
						const jobHref = `${readableViewHref}?jobId=${jobId}`;

						if (window.location.pathname.startsWith(readableViewHref)) {
							window.location.href = jobHref;
							return;
						} else {
							navigate(jobHref);
							return;
						}
					}
					navigate(href);
				}
			}}
			items={navigationItems}
		/>
	);
}
