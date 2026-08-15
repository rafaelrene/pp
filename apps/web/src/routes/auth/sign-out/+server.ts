import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { clearSession } from '#lib/server/session.js';

export const POST: RequestHandler = ({ cookies }) => {
	clearSession(cookies);
	redirect(303, '/');
};
