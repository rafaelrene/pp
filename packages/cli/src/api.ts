import type {
	Account,
	DraftSummary,
	UploadMetadata,
	UploadResponse
} from './types.js';

export class ApiError extends Error {
	constructor(
		message: string,
		readonly status: number
	) {
		super(message);
	}
}

type RequestOptions = {
	token?: string;
	body?: unknown;
};

export class ApiClient {
	constructor(private readonly baseUrl: string) {}

	async startCliAuth(): Promise<CliAuthStart> {
		return parseCliAuthStart(
			await this.request('/api/cli-auth/start', { body: {} })
		);
	}

	async pollCliAuth(deviceCode: string): Promise<CliAuthPoll> {
		try {
			return parseCliAuthPoll(
				await this.request('/api/cli-auth/token', { body: { deviceCode } })
			);
		} catch (error) {
			if (error instanceof ApiError) {
				if (error.message === 'authorization_pending')
					return { status: 'pending' };
				if (error.message === 'access_denied') return { status: 'denied' };
				if (error.message === 'expired_token') return { status: 'expired' };
			}
			throw error;
		}
	}

	async upload(input: {
		html: string;
		filename: string;
		description?: string;
		draftId?: string;
		editToken?: string;
		metadata: UploadMetadata;
		token?: string;
	}): Promise<UploadResponse> {
		const { token, ...body } = input;
		return parseUploadResponse(
			await this.request('/api/uploads', { body, ...(token ? { token } : {}) })
		);
	}

	async whoami(token: string): Promise<Account> {
		return parseAccount(await this.request('/api/me', { token }));
	}

	async listDrafts(token: string): Promise<DraftSummary[]> {
		return parseDraftList(await this.request('/api/drafts', { token }));
	}

	private async request(
		path: string,
		options: RequestOptions
	): Promise<unknown> {
		let response: Response;
		try {
			response = await fetch(`${this.baseUrl}${path}`, {
				method: options.body === undefined ? 'GET' : 'POST',
				headers: {
					accept: 'application/json',
					...(options.body === undefined
						? {}
						: { 'content-type': 'application/json' }),
					...(options.token ? { authorization: `Bearer ${options.token}` } : {})
				},
				...(options.body === undefined
					? {}
					: { body: JSON.stringify(options.body) }),
				signal: AbortSignal.timeout(30_000)
			});
		} catch (error) {
			const reason = error instanceof Error ? error.message : String(error);
			throw new ApiError(`Could not reach ${this.baseUrl}: ${reason}`, 0);
		}

		const body = (await response.json().catch(() => undefined)) as unknown;
		if (!response.ok)
			throw new ApiError(errorMessage(body, response.status), response.status);
		return body;
	}
}

export type CliAuthStart = {
	deviceCode: string;
	userCode: string;
	verificationUrl: string;
	verificationUrlComplete: string;
	expiresIn: number;
	interval: number;
};

export type CliAuthPoll =
	| { status: 'pending' }
	| { status: 'denied' }
	| { status: 'expired' }
	| { status: 'approved'; token: string };

export function parseCliAuthStart(value: unknown): CliAuthStart {
	const body = requireRecord(value, 'Invalid authentication response.');
	return {
		deviceCode: requireString(body, 'deviceCode'),
		userCode: requireString(body, 'userCode'),
		verificationUrl:
			typeof body.verificationUrl === 'string'
				? requireUrl(body, 'verificationUrl')
				: requireUrl(body, 'verificationUri'),
		verificationUrlComplete: requireUrl(body, 'verificationUrlComplete'),
		expiresIn: requirePositiveNumber(body, 'expiresIn'),
		interval: requirePositiveNumber(body, 'interval')
	};
}

export function parseCliAuthPoll(value: unknown): CliAuthPoll {
	const body = requireRecord(value, 'Invalid authentication response.');
	if (body.error === 'authorization_pending') return { status: 'pending' };
	if (body.error === 'access_denied') return { status: 'denied' };
	if (body.error === 'expired_token') return { status: 'expired' };
	if (typeof body.accessToken === 'string' && body.accessToken) {
		return { status: 'approved', token: body.accessToken };
	}
	if (body.status === 'approved')
		return { status: 'approved', token: requireString(body, 'token') };
	if (
		body.status === 'pending' ||
		body.status === 'denied' ||
		body.status === 'expired'
	) {
		return { status: body.status };
	}
	throw new ApiError('Invalid authentication status.', 200);
}

export function parseUploadResponse(value: unknown): UploadResponse {
	const body = requireRecord(value, 'Invalid upload response.');
	return {
		draftId: requireString(body, 'draftId'),
		version:
			typeof body.version === 'number'
				? requirePositiveNumber(body, 'version')
				: requirePositiveNumber(body, 'versionNumber'),
		url:
			typeof body.url === 'string'
				? requireUrl(body, 'url')
				: requireUrl(body, 'publicUrl'),
		...(typeof body.editToken === 'string' ? { editToken: body.editToken } : {})
	};
}

export function parseAccount(value: unknown): Account {
	const candidate =
		isRecord(value) && isRecord(value.account) ? value.account : value;
	const body = requireRecord(candidate, 'Invalid account response.');
	return {
		id: requireString(body, 'id'),
		name: requireString(body, 'name'),
		email: optionalNullableString(body, 'email'),
		...(body.pictureUrl === undefined
			? {}
			: { pictureUrl: optionalNullableString(body, 'pictureUrl') })
	};
}

export function parseDraftList(value: unknown): DraftSummary[] {
	const candidate =
		isRecord(value) && Array.isArray(value.drafts) ? value.drafts : value;
	if (!Array.isArray(candidate))
		throw new ApiError('Invalid draft list response.', 200);
	return candidate.map((entry) => {
		const body = requireRecord(entry, 'Invalid draft in list response.');
		return {
			id: requireString(body, 'id'),
			title: requireString(body, 'title'),
			description: optionalNullableString(body, 'description'),
			currentVersion: requirePositiveNumber(body, 'currentVersion'),
			versionCount: requirePositiveNumber(body, 'versionCount'),
			updatedAt: requirePositiveNumber(body, 'updatedAt'),
			createdAt: requirePositiveNumber(body, 'createdAt'),
			...(typeof body.url === 'string' ? { url: body.url } : {})
		};
	});
}

function errorMessage(body: unknown, status: number): string {
	if (isRecord(body)) {
		if (typeof body.error === 'string' && body.error) return body.error;
		if (typeof body.message === 'string' && body.message) return body.message;
	}
	return `Request failed (${status}).`;
}

function requireRecord(
	value: unknown,
	message: string
): Record<string, unknown> {
	if (!isRecord(value)) throw new ApiError(message, 200);
	return value;
}

function requireString(body: Record<string, unknown>, key: string): string {
	const value = body[key];
	if (typeof value !== 'string' || !value)
		throw new ApiError(`Response is missing ${key}.`, 200);
	return value;
}

function requireUrl(body: Record<string, unknown>, key: string): string {
	const value = requireString(body, key);
	try {
		const url = new URL(value);
		if (url.protocol !== 'http:' && url.protocol !== 'https:')
			throw new Error();
	} catch {
		throw new ApiError(`Response contains an invalid ${key}.`, 200);
	}
	return value;
}

function requirePositiveNumber(
	body: Record<string, unknown>,
	key: string
): number {
	const value = body[key];
	if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
		throw new ApiError(`Response contains an invalid ${key}.`, 200);
	}
	return value;
}

function optionalNullableString(
	body: Record<string, unknown>,
	key: string
): string | null {
	const value = body[key];
	if (value === undefined || value === null) return null;
	if (typeof value !== 'string')
		throw new ApiError(`Response contains an invalid ${key}.`, 200);
	return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}
