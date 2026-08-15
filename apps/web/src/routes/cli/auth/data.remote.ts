import { command, getRequestEvent } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';
import {
	approveCliAuthRequest,
	CliAuthError,
	denyCliAuthRequest,
	getAccount
} from '#lib/server/database.js';

const userCode = v.pipe(v.string(), v.regex(/^[A-Za-z0-9-]{8,9}$/));

export const approveCliAccess = command(userCode, (code) => {
	const session = getRequestEvent().locals.session;
	if (!session) error(401, 'Sign in first.');
	const account = getAccount(session.accountId);
	if (!account) error(401, 'Your session is no longer valid.');
	try {
		approveCliAuthRequest(code, account);
	} catch (caught) {
		if (caught instanceof CliAuthError) error(400, caught.message);
		throw caught;
	}
	return { ok: true };
});

export const denyCliAccess = command(userCode, (code) => {
	if (!getRequestEvent().locals.session) error(401, 'Sign in first.');
	denyCliAuthRequest(code);
	return { ok: true };
});
