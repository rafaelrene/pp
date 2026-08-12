import type { Handle } from '@sveltejs/kit';
import { draftResponse } from '$lib/server/draft-response';
import { draftIdFromHostname } from '$lib/server/public-url';
import { readSession } from '$lib/server/session';

export const handle: Handle = async ({ event, resolve }) => {
	const hostedDraftId = draftIdFromHostname(event.url.hostname);
	if (hostedDraftId) {
		if (event.url.pathname === '/' || event.url.pathname === '/raw') {
			return draftResponse(hostedDraftId);
		}
		const versionMatch = /^\/v\/(\d+)(?:\/raw)?$/.exec(event.url.pathname);
		return versionMatch
			? draftResponse(hostedDraftId, Number.parseInt(versionMatch[1]!, 10))
			: new Response('Not found', { status: 404 });
	}

	event.locals.session = readSession(event.cookies);
	return resolve(event);
};
