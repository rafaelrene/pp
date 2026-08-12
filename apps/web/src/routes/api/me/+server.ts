import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authenticateApiKey } from '$lib/server/database';

export const GET: RequestHandler = ({ request }) => {
	const identity = authenticateApiKey(request.headers.get('authorization'));
	if (!identity)
		return json({ error: 'Authentication required.' }, { status: 401 });
	return json({
		account: { id: identity.accountId, name: identity.accountName },
		apiKey: { id: identity.keyId, name: 'pp CLI' }
	});
};
