import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPublicOrigin, getSessionSecret } from '$lib/server/config';
import { safeNextPath } from '$lib/server/public-url';
import { createAuthorizeUrl, createPkce } from '$lib/server/shoo';
import { setAuthState } from '$lib/server/session';

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
