import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPublicOrigin } from '$lib/server/config';
import { findOrCreateShooAccount } from '$lib/server/database';
import { exchangeShooCode, verifyShooToken } from '$lib/server/shoo';
import { clearAuthState, readAuthState, setSession } from '$lib/server/session';

export const GET: RequestHandler = async ({ cookies, url }) => {
	const authState = readAuthState(cookies);
	clearAuthState(cookies);
	if (url.searchParams.get('error') || !authState)
		redirect(303, '/login?error=cancelled');

	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	if (!code || state !== authState.state) redirect(303, '/login?error=expired');

	try {
		const origin = getPublicOrigin(url);
		const idToken = await exchangeShooCode({
			code,
			verifier: authState.verifier,
			redirectUri: `${origin}/auth/callback`
		});
		const claims = await verifyShooToken(idToken, origin);
		const account = findOrCreateShooAccount({
			subject: String(claims.pairwise_sub),
			name: claimText(claims.name),
			email: claimText(claims.email),
			pictureUrl: claimText(claims.picture)
		});
		setSession(cookies, {
			accountId: account.id,
			name: account.name,
			email: account.email,
			pictureUrl: account.pictureUrl
		});
	} catch (error) {
		console.error('Shoo sign-in failed:', error);
		redirect(303, '/login?error=failed');
	}

	redirect(303, authState.next);
};

function claimText(value: unknown): string | null {
	return typeof value === 'string' && value.trim() ? value.trim() : null;
}
