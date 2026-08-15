import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPublicOrigin } from '#lib/server/config.js';
import { createCliAuthRequest } from '#lib/server/database.js';

export const POST: RequestHandler = ({ url }) => {
	const request = createCliAuthRequest();
	const verificationUri = `${getPublicOrigin(url)}/cli/auth`;
	return json(
		{
			deviceCode: request.deviceCode,
			userCode: request.userCode,
			verificationUri,
			verificationUrlComplete: `${verificationUri}?user_code=${encodeURIComponent(request.userCode)}`,
			expiresIn: request.expiresIn,
			interval: request.interval
		},
		{ status: 201 }
	);
};
