import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	ORIGIN: { schema: (input) => input ?? 'http://localhost:5173' },
	DATABASE_PATH: { schema: (input) => input ?? './data/pp.sqlite' },
	SESSION_SECRET: { schema: (input) => input ?? '' },
	NODE_ENV: { schema: (input) => input ?? 'development' },
	SHOO_BASE_URL: { schema: (input) => input ?? 'https://shoo.dev' },
	MAX_HTML_BYTES: { schema: (input) => input ?? '524288' },
	ALLOWED_EMAILS: { schema: (input) => input ?? '' },
	ALLOW_ANONYMOUS_UPLOADS: {
		schema: (input) => {
			if (input === undefined || input === '') return '';
			if (input !== 'true' && input !== 'false') {
				throw new Error('expected true or false');
			}
			return input;
		}
	},
	PUBLIC_DRAFT_URL: { public: true, schema: (input) => input ?? '' }
});
