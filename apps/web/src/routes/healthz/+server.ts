import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { checkDatabase } from '#lib/server/database.js';

export const GET: RequestHandler = () => {
	checkDatabase();
	return json({ ok: true });
};
