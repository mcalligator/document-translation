// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import React from "react";
import { Route, Routes } from "react-router-dom";

import SignOut from "./util/signOut";

import Help from "./page/help/help";
import ReadableHistory from "./page/readable/history";
import ReadablePrint from "./page/readable/print";
import ReadableView from "./page/readable/view";
import TranslationHistory from "./page/translation/history";
import TranslationNew from "./page/translation/new";
import TranslationQuick from "./page/translation/quick";
import AdminPanel from "./page/admin/AdminPanel";
import { AuthSession } from "@aws-amplify/auth";

const features = require("./features.json");

export default function AppRoutes(user: any ) {
	const groups : string[] = user?.user?.authSession?.tokens?.accessToken?.payload?.["cognito:groups"]

	return (
		<Routes>
			{features.translation && (
				<>
					<Route path="/" element={<TranslationHistory />} />
					<Route path="/translation/" element={<TranslationHistory />} />
					<Route
						path="/translation/history/"
						element={<TranslationHistory />}
					/>
					<Route path="/translation/new/" element={<TranslationNew />} />
					<Route path="/translation/quick/" element={<TranslationQuick />} />
				</>
			)}
			{!features.translation && features.readable && (
				<Route path="/" element={<ReadableHistory />} />
			)}
			{features.readable && (
				<>
					<Route path="/readable/" element={<ReadableHistory />} />
					<Route path="/readable/history/" element={<ReadableHistory />} />
					<Route path="/readable/view/*" element={<ReadableView />} />
					<Route path="/readable/print/*" element={<ReadablePrint />} />
				</>
			)}
			{typeof(groups) !== 'undefined' && groups.includes('TenantAdmins') && (
				<Route path="/admin/" element={<AdminPanel />} />
			)}
			<Route path="/help/" element={<Help />} />
			<Route path="/signout/" element={<SignOut />} />
		</Routes>
	);
}
