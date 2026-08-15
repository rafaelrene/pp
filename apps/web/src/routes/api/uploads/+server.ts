import { json } from '@sveltejs/kit';
import * as v from 'valibot';
import type { RequestHandler } from './$types';
import {
	authenticateApiKey,
	DraftAccessError,
	saveDraft,
	type UploadMetadata
} from '#lib/server/database.js';
import { validateHtml } from '#lib/server/html-policy.js';
import { publicDraftUrl, rawDraftUrl } from '#lib/server/public-url.js';

const optionalText = (length: number) =>
	v.optional(v.pipe(v.string(), v.maxLength(length)));
const uploadSchema = v.object({
	html: v.string(),
	filename: v.pipe(v.string(), v.minLength(1), v.maxLength(255)),
	draftId: v.optional(
		v.nullable(v.pipe(v.string(), v.regex(/^[a-z0-9]{12}$/)))
	),
	editToken: optionalText(128),
	description: optionalText(200),
	metadata: v.optional(
		v.object({
			cliVersion: optionalText(32),
			fileSha256: optionalText(64),
			gitBranch: optionalText(255),
			gitCommit: optionalText(64),
			gitSubject: optionalText(500),
			gitDirty: v.optional(v.boolean()),
			ciUrl: optionalText(1000),
			ciActor: optionalText(255)
		})
	)
});

export const POST: RequestHandler = async ({ request, url }) => {
	const authorization = request.headers.get('authorization');
	const identity = authenticateApiKey(authorization);
	if (authorization && !identity)
		return json({ error: 'Invalid API token.' }, { status: 401 });

	const rawBody: unknown = await request.json().catch(() => null);
	const parsed = v.safeParse(uploadSchema, rawBody);
	if (!parsed.success) {
		return json(
			{ error: 'Invalid upload request.', issues: parsed.issues },
			{ status: 400 }
		);
	}

	const validation = validateHtml(parsed.output.html);
	if (!validation.ok) {
		return json(
			{ error: 'HTML failed validation.', errors: validation.errors },
			{ status: 400 }
		);
	}

	try {
		const saved = saveDraft({
			html: parsed.output.html,
			filename: parsed.output.filename,
			description: parsed.output.description,
			draftId: parsed.output.draftId ?? undefined,
			editToken: parsed.output.editToken,
			identity,
			metadata: (parsed.output.metadata ?? {}) satisfies UploadMetadata
		});
		const publicUrl = publicDraftUrl(saved.draftId, url);
		const rawUrl = rawDraftUrl(saved.draftId, url);
		return json(
			{
				url: publicUrl,
				publicUrl,
				rawUrl,
				draftId: saved.draftId,
				version: saved.version,
				versionNumber: saved.version,
				...(saved.editToken ? { editToken: saved.editToken } : {})
			},
			{ status: saved.created ? 201 : 200 }
		);
	} catch (error) {
		if (error instanceof DraftAccessError)
			return json({ error: error.message }, { status: error.status });
		throw error;
	}
};
