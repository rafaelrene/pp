import { getDraftVersion } from './database';
import { draftContentSecurityPolicy } from './html-policy';

export function draftResponse(draftId: string, version?: number): Response {
	if (!/^[a-z0-9]{12}$/.test(draftId))
		return new Response('Not found', { status: 404 });
	if (
		version !== undefined &&
		(!Number.isSafeInteger(version) || version < 1)
	) {
		return new Response('Not found', { status: 404 });
	}

	const draft = getDraftVersion(draftId, version);
	if (!draft) return new Response('Not found', { status: 404 });

	return new Response(draft.html, {
		headers: {
			'content-type': 'text/html; charset=utf-8',
			'cache-control': 'no-store',
			'content-security-policy': draftContentSecurityPolicy,
			'x-robots-tag': 'noindex, nofollow',
			'x-content-type-options': 'nosniff',
			'x-pp-draft-id': draft.draftId,
			'x-pp-draft-version': String(draft.version)
		}
	});
}
