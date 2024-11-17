// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

export const handler = (event, context, callback) => {
	console.debug("EVENT:", event);
	const resultList: string[] = [];
	for (const terminology of event.terminologies) {
		resultList.push(terminology.Name);
	}
	console.debug("RESULT:", resultList);
	callback(null, resultList);
};
