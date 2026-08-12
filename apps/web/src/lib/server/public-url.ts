import { getDraftBaseUrl, getPublicOrigin } from './config';

export function publicDraftUrl(draftId: string, requestUrl?: URL): string {
	const draftBase = getDraftBaseUrl();
	if (draftBase?.includes('*')) return draftBase.replace('*', draftId);
	return `${getPublicOrigin(requestUrl)}/d/${draftId}`;
}

export function rawDraftUrl(draftId: string, requestUrl?: URL): string {
	return `${getPublicOrigin(requestUrl)}/d/${draftId}/raw`;
}

export function draftIdFromHostname(hostname: string): string | null {
	const draftBase = getDraftBaseUrl();
	if (!draftBase?.includes('*')) return null;
	const marker = 'pp-draft-placeholder';
	const configuredHostname = new URL(draftBase.replace('*', marker)).hostname;
	const [prefix, suffix] = configuredHostname.split(marker);
	if (prefix === undefined || suffix === undefined) return null;
	if (!hostname.startsWith(prefix) || !hostname.endsWith(suffix)) return null;
	const draftId = hostname.slice(
		prefix.length,
		hostname.length - suffix.length
	);
	return /^[a-z0-9]{12}$/.test(draftId) ? draftId : null;
}

export function safeNextPath(
	value: string | null,
	fallback = '/dashboard'
): string {
	if (!value?.startsWith('/') || value.startsWith('//') || value.includes('\\'))
		return fallback;
	return value;
}
