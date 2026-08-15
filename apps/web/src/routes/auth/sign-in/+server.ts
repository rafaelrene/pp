import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPublicOrigin, getSessionSecret } from '#lib/server/config.js';
import { safeNextPath } from '#lib/server/public-url.js';
import { createAuthorizeUrl, createPkce } from '#lib/server/shoo.js';
import { setAuthState } from '#lib/server/session.js';

export const GET: RequestHandler = ({ cookies, url }) => {
	if (!getSessionSecret()) redirect(303, '/login?error=auth-not-configured');

	const pkce = createPkce();
	const next = safeNextPath(url.searchParams.get('next'));
	const redirectUri = `${getPublicOrigin(url)}/auth/callback`;
	setAuthState(cookies, { state: pkce.state, verifier: pkce.verifier, next });
	redirect(
		303,
		createAuthorizeUrl({
			redirectUri,
			state: pkce.state,
			challenge: pkce.challenge
		})
	);
};
