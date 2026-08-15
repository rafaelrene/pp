import { describe, expect, it, vi } from 'vitest';

vi.mock('#lib/server/database.js', () => ({
	getDraftVersion: vi.fn(() => ({
		draftId: 'draft1234567',
		version: 1,
		html: '<h1>Plan</h1>',
		createdAt: 1
	}))
}));

import { draftResponse } from '#lib/server/draft-response.js';

describe('draft response', () => {
	it('prevents indexing', () => {
		const response = draftResponse('draft1234567');

		expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
	});
});
