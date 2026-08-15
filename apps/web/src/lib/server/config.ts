import { isAbsolute } from 'node:path';
import { building } from '$app/env';
import {
	ORIGIN,
	DATABASE_PATH,
	SESSION_SECRET,
	NODE_ENV,
	SHOO_BASE_URL,
	MAX_HTML_BYTES,
	ALLOWED_EMAILS,
	ALLOW_ANONYMOUS_UPLOADS
} from '$app/env/private';

import { PUBLIC_DRAFT_URL } from '$app/env/public';

const LOCAL_SESSION_SECRET = 'pp-local-development-session-secret-change-me';

export function getPublicOrigin(requestUrl?: URL): string {
	const configured = ORIGIN?.replace(/\/+$/, '');

	return configured || requestUrl?.origin || 'http://localhost:5173';
}

export function getDraftBaseUrl(): string | undefined {
	return PUBLIC_DRAFT_URL?.replace(/\/+$/, '');
}

export function getDatabasePath(): string {
	return DATABASE_PATH || './data/pp.sqlite';
}

export function getSessionSecret(): string | undefined {
	if (SESSION_SECRET) return SESSION_SECRET;
	if (NODE_ENV !== 'production') return LOCAL_SESSION_SECRET;
	return undefined;
}

export function getShooBaseUrl(): string {
	return (SHOO_BASE_URL || 'https://shoo.dev').replace(/\/+$/, '');
}

export function getMaxHtmlBytes(): number {
	const configured = Number(MAX_HTML_BYTES || 512 * 1024);

	return Number.isSafeInteger(configured) && configured > 0
		? configured
		: 512 * 1024;
}

export function getAnonymousUploadsEnabled(): boolean {
	if (ALLOW_ANONYMOUS_UPLOADS) return ALLOW_ANONYMOUS_UPLOADS === 'true';
	return NODE_ENV !== 'production';
}

export function isAllowedEmail(email: string | null): boolean {
	const allowedEmails = parseAllowedEmails(ALLOWED_EMAILS);
	if (allowedEmails.size === 0) return NODE_ENV !== 'production';
	return email !== null && allowedEmails.has(email.trim().toLowerCase());
}

export function validateProductionConfig(input: {
	origin: string;
	sessionSecret: string;
	databasePath: string;
	allowedEmails: string;
}): void {
	const errors: string[] = [];
	try {
		const origin = new URL(input.origin);
		if (origin.protocol !== 'https:' || origin.origin !== input.origin) {
			errors.push('ORIGIN must be an exact HTTPS origin without a path.');
		}
	} catch {
		errors.push('ORIGIN must be a valid URL.');
	}
	if (input.sessionSecret.length < 32) {
		errors.push('SESSION_SECRET must contain at least 32 characters.');
	}
	if (!isAbsolute(input.databasePath)) {
		errors.push('DATABASE_PATH must be an absolute path.');
	}
	const allowedEmails = parseAllowedEmails(input.allowedEmails);
	if (allowedEmails.size === 0) {
		errors.push('ALLOWED_EMAILS must contain at least one email address.');
	} else if (
		[...allowedEmails].some((email) => !/^\S+@\S+\.\S+$/.test(email))
	) {
		errors.push('ALLOWED_EMAILS contains an invalid email address.');
	}
	if (errors.length) {
		throw new Error(
			`Invalid production configuration:\n- ${errors.join('\n- ')}`
		);
	}
}

function parseAllowedEmails(value: string): Set<string> {
	return new Set(
		value
			.split(',')
			.map((email) => email.trim().toLowerCase())
			.filter(Boolean)
	);
}

if (NODE_ENV === 'production' && !building) {
	validateProductionConfig({
		origin: ORIGIN,
		sessionSecret: SESSION_SECRET,
		databasePath: DATABASE_PATH,
		allowedEmails: ALLOWED_EMAILS
	});
}
