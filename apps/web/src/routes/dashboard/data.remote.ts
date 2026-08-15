import { command, getRequestEvent, query } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';
import { deleteAccountDraft, listAccountDrafts } from '#lib/server/database.js';
import { publicDraftUrl } from '#lib/server/public-url.js';

export const getDrafts = query(() => {
	const event = getRequestEvent();
	const session = event.locals.session;
	if (!session) error(401, 'Sign in to view your drafts.');
	return listAccountDrafts(session.accountId).map((draft) => ({
		...draft,
		url: publicDraftUrl(draft.id, new URL(event.request.url))
	}));
});

export const deleteDraft = command(
	v.pipe(v.string(), v.regex(/^[a-z0-9]{12}$/)),
	(draftId) => {
		const session = getRequestEvent().locals.session;
		if (!session) error(401, 'Sign in to delete a draft.');
		if (!deleteAccountDraft(draftId, session.accountId))
			error(404, 'Draft not found.');
		void getDrafts().refresh();
		return { ok: true };
	}
);
