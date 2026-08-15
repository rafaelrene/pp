import {
	ORIGIN,
	DATABASE_PATH,
	SESSION_SECRET,
	NODE_ENV,
	SHOO_BASE_URL,
	MAX_HTML_BYTES
} from '$app/env/private';

import { PUBLIC_BASE_URL, PUBLIC_DRAFT_URL } from '$app/env/public';

const LOCAL_SESSION_SECRET = 'pp-local-development-session-secret-change-me';

export function getPublicOrigin(requestUrl?: URL): string {
	const configured = (PUBLIC_BASE_URL || ORIGIN)?.replace(/\/+$/, '');

	return configured || requestUrl?.origin || 'http://localhost:5173';
}

export function getDraftBaseUrl(): string | undefined {
	return PUBLIC_DRAFT_URL?.replace(/\/+$/, '');
}

export function getDatabasePath(): string {
	return process.env.DATABASE_PATH || DATABASE_PATH || './data/pp.sqlite';
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
