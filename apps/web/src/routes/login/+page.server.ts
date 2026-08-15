import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { safeNextPath } from '#lib/server/public-url.js';

export const load: PageServerLoad = ({ locals, url }) => {
	const next = safeNextPath(url.searchParams.get('next'));
	if (locals.session) redirect(303, next);
	return { next, error: url.searchParams.get('error') };
};
