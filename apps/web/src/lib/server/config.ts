import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

const LOCAL_SESSION_SECRET = 'pp-local-development-session-secret-change-me';

export function getPublicOrigin(requestUrl?: URL): string {
	const configured = (publicEnv.PUBLIC_BASE_URL || privateEnv.ORIGIN)?.replace(
		/\/+$/,
		''
	);
	return configured || requestUrl?.origin || 'http://localhost:5173';
}

export function getDraftBaseUrl(): string | undefined {
	return publicEnv.PUBLIC_DRAFT_URL?.replace(/\/+$/, '');
}

export function getDatabasePath(): string {
	return (
		process.env.DATABASE_PATH || privateEnv.DATABASE_PATH || './data/pp.sqlite'
	);
}

export function getSessionSecret(): string | undefined {
	if (privateEnv.SESSION_SECRET) return privateEnv.SESSION_SECRET;
	if (privateEnv.NODE_ENV !== 'production') return LOCAL_SESSION_SECRET;
	return undefined;
}

export function getShooBaseUrl(): string {
	return (privateEnv.SHOO_BASE_URL || 'https://shoo.dev').replace(/\/+$/, '');
}

export function getMaxHtmlBytes(): number {
	const configured = Number(privateEnv.MAX_HTML_BYTES || 512 * 1024);
	return Number.isSafeInteger(configured) && configured > 0
		? configured
		: 512 * 1024;
}
