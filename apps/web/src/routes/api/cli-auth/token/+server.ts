import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { pollCliAuthRequest } from '#lib/server/database.js';

export const POST: RequestHandler = async ({ request }) => {
	const body: unknown = await request.json().catch(() => null);
	if (!isRecord(body) || typeof body.deviceCode !== 'string') {
		return json({ error: 'invalid_request' }, { status: 400 });
	}

	const result = pollCliAuthRequest(body.deviceCode);
	if (result.status === 'pending')
		return json({ error: 'authorization_pending' }, { status: 202 });
	if (result.status === 'denied')
		return json({ error: 'access_denied' }, { status: 403 });
	if (result.status === 'expired')
		return json({ error: 'expired_token' }, { status: 400 });
	return json({ accessToken: result.token, tokenType: 'Bearer' });
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}
