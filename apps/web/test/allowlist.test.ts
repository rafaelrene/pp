import { describe, expect, it, vi } from 'vitest';

vi.mock('$app/env', () => ({ building: false }));
vi.mock('$app/env/private', () => ({
	ORIGIN: 'https://plans.rafr.dev',
	DATABASE_PATH: '/data/pp.sqlite',
	SESSION_SECRET: 'a-production-secret-with-at-least-32-characters',
	NODE_ENV: 'production',
	SHOO_BASE_URL: 'https://shoo.dev',
	MAX_HTML_BYTES: '524288',
	ALLOWED_EMAILS: 'skreciprodukcia@gmail.com',
	ALLOW_ANONYMOUS_UPLOADS: 'false'
}));
vi.mock('$app/env/public', () => ({ PUBLIC_DRAFT_URL: '' }));

import { isAllowedEmail } from '#lib/server/config.js';
import { signValue } from '#lib/server/crypto.js';
import { readSession } from '#lib/server/session.js';

const sessionSecret = 'a-production-secret-with-at-least-32-characters';

describe('publisher allowlist', () => {
	it('matches the configured email case-insensitively', () => {
		expect(isAllowedEmail('SKRECIPRODUKCIA@gmail.com')).toBe(true);
		expect(isAllowedEmail('somebody@example.com')).toBe(false);
		expect(isAllowedEmail(null)).toBe(false);
	});

	it('invalidates an existing session for a disallowed email', () => {
		const value = signValue(
			{
				accountId: 'acct_123',
				name: 'Not allowed',
				email: 'somebody@example.com',
				pictureUrl: null
			},
			sessionSecret,
			60
		);
		const cookies = { get: () => value } as Parameters<typeof readSession>[0];

		expect(readSession(cookies)).toBeNull();
	});
});
