import type { Cookies } from '@sveltejs/kit';
import { getSessionSecret } from './config';
import { signValue, verifyValue } from './crypto';

const SESSION_COOKIE = 'pp_session';
const AUTH_STATE_COOKIE = 'pp_auth_state';
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
const AUTH_STATE_TTL_SECONDS = 10 * 60;

export type Session = {
	accountId: string;
	name: string;
	email: string | null;
	pictureUrl: string | null;
};

export type AuthState = {
	state: string;
	verifier: string;
	next: string;
};

export function readSession(cookies: Cookies): Session | null {
	const secret = getSessionSecret();
	const value = cookies.get(SESSION_COOKIE);
	if (!secret || !value) return null;

	const payload = verifyValue(value, secret);
	if (
		!payload ||
		typeof payload.accountId !== 'string' ||
		typeof payload.name !== 'string' ||
		!(typeof payload.email === 'string' || payload.email === null) ||
		!(typeof payload.pictureUrl === 'string' || payload.pictureUrl === null)
	) {
		return null;
	}

	return {
		accountId: payload.accountId,
		name: payload.name,
		email: payload.email,
		pictureUrl: payload.pictureUrl
	};
}

export function setSession(cookies: Cookies, session: Session): void {
	const secret = requireSessionSecret();
	cookies.set(
		SESSION_COOKIE,
		signValue(session, secret, SESSION_TTL_SECONDS),
		cookieOptions(SESSION_TTL_SECONDS)
	);
}

export function clearSession(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}

export function readAuthState(cookies: Cookies): AuthState | null {
	const secret = getSessionSecret();
	const value = cookies.get(AUTH_STATE_COOKIE);
	if (!secret || !value) return null;

	const payload = verifyValue(value, secret);
	if (
		!payload ||
		typeof payload.state !== 'string' ||
		typeof payload.verifier !== 'string' ||
		typeof payload.next !== 'string'
	) {
		return null;
	}

	return {
		state: payload.state,
		verifier: payload.verifier,
		next: payload.next
	};
}

export function setAuthState(cookies: Cookies, state: AuthState): void {
	cookies.set(
		AUTH_STATE_COOKIE,
		signValue(state, requireSessionSecret(), AUTH_STATE_TTL_SECONDS),
		cookieOptions(AUTH_STATE_TTL_SECONDS)
	);
}

export function clearAuthState(cookies: Cookies): void {
	cookies.delete(AUTH_STATE_COOKIE, { path: '/' });
}

function requireSessionSecret(): string {
	const secret = getSessionSecret();
	if (!secret) throw new Error('SESSION_SECRET is required in production.');
	return secret;
}

function cookieOptions(maxAge: number) {
	return {
		path: '/',
		httpOnly: true,
		sameSite: 'lax' as const,
		secure: process.env.NODE_ENV === 'production',
		maxAge
	};
}
