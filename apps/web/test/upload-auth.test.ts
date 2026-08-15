import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	authenticateApiKey: vi.fn(() => null),
	getAnonymousUploadsEnabled: vi.fn(() => false)
}));

vi.mock('#lib/server/config.js', () => ({
	getAnonymousUploadsEnabled: mocks.getAnonymousUploadsEnabled
}));

vi.mock('#lib/server/database.js', () => ({
	authenticateApiKey: mocks.authenticateApiKey,
	DraftAccessError: class extends Error {},
	saveDraft: vi.fn()
}));

import { POST } from '../src/routes/api/uploads/+server';

describe('POST /api/uploads', () => {
	it('rejects anonymous uploads before reading the body', async () => {
		const response = await POST({
			request: new Request('https://plans.rafr.dev/api/uploads', {
				method: 'POST'
			}),
			url: new URL('https://plans.rafr.dev/api/uploads')
		} as Parameters<typeof POST>[0]);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({
			error: 'Authentication required.'
		});
	});
});
