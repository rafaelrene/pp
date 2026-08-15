import { isRedirect } from '@sveltejs/kit';
import { describe, expect, it, vi } from 'vitest';
import { GET } from '../src/routes/auth/sign-in/+server';

describe('GET /auth/sign-in', () => {
	it('redirects to Shoo', () => {
		const event = {
			cookies: { set: vi.fn() },
			url: new URL('http://localhost:5173/auth/sign-in?next=%2Fdashboard')
		} as unknown as Parameters<typeof GET>[0];

		try {
			GET(event);
			expect.unreachable('Expected the handler to redirect');
		} catch (error) {
			expect(isRedirect(error)).toBe(true);
			if (!isRedirect(error)) throw error;

			expect(error.status).toBe(303);
			expect(new URL(error.location).origin).toBe('https://shoo.dev');
		}
	});
});
