import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authenticateApiKey, listAccountDrafts } from '$lib/server/database';
import { publicDraftUrl } from '$lib/server/public-url';

export const GET: RequestHandler = ({ request, url }) => {
	const identity = authenticateApiKey(request.headers.get('authorization'));
	if (!identity)
		return json({ error: 'Authentication required.' }, { status: 401 });
	const drafts = listAccountDrafts(identity.accountId).map((draft) => ({
		...draft,
		url: publicDraftUrl(draft.id, url),
		publicUrl: publicDraftUrl(draft.id, url)
	}));
	return json({ drafts });
};
