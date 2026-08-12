import { createHash } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { getShooBaseUrl } from './config';
import { randomToken } from './crypto';

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;
let issuer: Promise<string> | undefined;

export function createPkce(): {
	verifier: string;
	challenge: string;
	state: string;
} {
	const verifier = randomToken(32);
	return {
		verifier,
		challenge: createHash('sha256').update(verifier).digest('base64url'),
		state: randomToken(24)
	};
}

export function createAuthorizeUrl(input: {
	redirectUri: string;
	state: string;
	challenge: string;
}): string {
	const url = new URL(`${getShooBaseUrl()}/authorize`);
	url.searchParams.set('redirect_uri', input.redirectUri);
	url.searchParams.set('state', input.state);
	url.searchParams.set('code_challenge', input.challenge);
	url.searchParams.set('code_challenge_method', 'S256');
	url.searchParams.set('pii', 'true');
	return url.toString();
}

export async function exchangeShooCode(input: {
	code: string;
	verifier: string;
	redirectUri: string;
}): Promise<string> {
	const response = await fetch(`${getShooBaseUrl()}/token`, {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'authorization_code',
			redirect_uri: input.redirectUri,
			code: input.code,
			code_verifier: input.verifier
		}),
		signal: AbortSignal.timeout(10_000)
	});

	const body: unknown = await response.json().catch(() => null);
	if (!response.ok || !isRecord(body) || typeof body.id_token !== 'string') {
		throw new Error(`Shoo token exchange failed (${response.status}).`);
	}
	return body.id_token;
}

export async function verifyShooToken(
	idToken: string,
	origin: string
): Promise<JWTPayload> {
	const { payload } = await jwtVerify(idToken, getJwks(), {
		issuer: await getIssuer(),
		audience: `origin:${new URL(origin).origin}`,
		algorithms: ['ES256']
	});
	if (typeof payload.pairwise_sub !== 'string' || !payload.pairwise_sub) {
		throw new Error('Shoo token is missing pairwise_sub.');
	}
	return payload;
}

function getJwks(): ReturnType<typeof createRemoteJWKSet> {
	return (jwks ??= createRemoteJWKSet(
		new URL(`${getShooBaseUrl()}/.well-known/jwks.json`)
	));
}

function getIssuer(): Promise<string> {
	return (issuer ??= fetch(
		`${getShooBaseUrl()}/.well-known/openid-configuration`,
		{
			signal: AbortSignal.timeout(10_000)
		}
	)
		.then(async (response) => {
			const body: unknown = await response.json();
			if (!response.ok || !isRecord(body) || typeof body.issuer !== 'string') {
				throw new Error('Shoo discovery failed.');
			}
			return body.issuer;
		})
		.catch((error: unknown) => {
			issuer = undefined;
			throw error;
		}));
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}
