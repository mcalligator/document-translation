// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import React from "react";
import { Suspense } from "react";

import { AppLayout } from "@cloudscape-design/components";

import { useFederatedSignIn } from "./hooks/useFederatedSignIn";

import { amplifyConfigure } from "./util/amplifyConfigure";
import "./util/i18n";

import AppRoutes from "./appRoutes";
import Footer from "./page/partial/footer";
import SideNavigation from "./page/partial/sideNavigation";
import TopNavigation from "./page/partial/topNavigation";

export default function App() {
	amplifyConfigure();
	const currentUser = useFederatedSignIn();
	// console.log(`currentUser in App:\n${JSON.stringify(currentUser)}`);

	return (
		<>
			<Suspense fallback={null}>
				<TopNavigation user={currentUser} />
				<AppLayout
					navigation={<SideNavigation user={currentUser}/>}
					toolsHide
					content={<AppRoutes user={currentUser}/>}
				></AppLayout>
				<Footer />
			</Suspense>
		</>
	);
}
