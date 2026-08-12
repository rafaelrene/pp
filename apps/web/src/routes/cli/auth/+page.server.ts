import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getCliAuthRequest, normalizeUserCode } from '$lib/server/database';

export const load: PageServerLoad = ({ locals, url }) => {
	const userCode = normalizeUserCode(url.searchParams.get('user_code') || '');
	if (!userCode) error(400, 'Missing CLI authorization code.');
	if (!locals.session) {
		const next = `/cli/auth?user_code=${encodeURIComponent(userCode)}`;
		redirect(303, `/login?next=${encodeURIComponent(next)}`);
	}
	const request = getCliAuthRequest(userCode);
	if (!request)
		error(404, 'This CLI authorization code is invalid or expired.');
	return { userCode, status: request.status, session: locals.session };
};
