import { describe, expect, it } from 'vitest';
import { safeNextPath } from '$lib/server/public-url';

describe('safeNextPath', () => {
	it('keeps local routes', () => {
		expect(safeNextPath('/cli/auth?user_code=ABCD1234')).toBe(
			'/cli/auth?user_code=ABCD1234'
		);
	});

	it.each(['https://evil.example', '//evil.example', '/\\evil.example', null])(
		'rejects redirects outside the app',
		(value) => {
			expect(safeNextPath(value)).toBe('/dashboard');
		}
	);
});
