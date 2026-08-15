import { describe, expect, it } from 'vitest';
import { validateProductionConfig } from '#lib/server/config.js';

const validConfig = {
	origin: 'https://plans.rafr.dev',
	sessionSecret: 'a-production-secret-with-at-least-32-characters',
	databasePath: '/data/pp.sqlite',
	allowedEmails: 'skreciprodukcia@gmail.com'
};

describe('production configuration', () => {
	it('accepts the release configuration', () => {
		expect(() => validateProductionConfig(validConfig)).not.toThrow();
	});

	it.each([
		[{ ...validConfig, origin: 'http://plans.rafr.dev' }, 'ORIGIN'],
		[{ ...validConfig, sessionSecret: 'too-short' }, 'SESSION_SECRET'],
		[{ ...validConfig, databasePath: './data/pp.sqlite' }, 'DATABASE_PATH'],
		[{ ...validConfig, allowedEmails: '' }, 'ALLOWED_EMAILS'],
		[{ ...validConfig, allowedEmails: 'not-an-email' }, 'ALLOWED_EMAILS']
	])('rejects unsafe values', (config, expectedVariable) => {
		expect(() => validateProductionConfig(config)).toThrow(expectedVariable);
	});
});
