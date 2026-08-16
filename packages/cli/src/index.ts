#!/usr/bin/env node

import { readFile, stat } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ApiClient, ApiError } from './api.js';
import { help, parseArgs, UsageError, type CliArguments } from './args.js';
import { login } from './auth.js';
import { collectMetadata } from './metadata.js';
import { getDraft, getToken, removeToken, setDraft } from './storage.js';
import type { DraftSummary } from './types.js';
import { VERSION } from './version.js';

export async function run(argv = process.argv.slice(2)): Promise<void> {
	const args = parseArgs(argv);
	if (args.command === 'help') {
		process.stdout.write(help);
		return;
	}
	if (args.command === 'version') {
		console.log(VERSION);
		return;
	}

	const api = new ApiClient(args.apiUrl);
	switch (args.command) {
		case 'auth-login':
			await login(api, args.apiUrl);
			return;
		case 'auth-logout': {
			const removed = await removeToken(args.apiUrl);
			console.log(removed ? 'Signed out.' : 'You are not signed in.');
			return;
		}
		case 'whoami':
			await whoami(api, args);
			return;
		case 'list':
			await list(api, args);
			return;
		case 'upload':
			await upload(api, args);
	}
}

async function upload(
	api: ApiClient,
	args: Extract<CliArguments, { command: 'upload' }>
): Promise<void> {
	const file = resolve(args.file);
	const fileInfo = await stat(file).catch((error: unknown) => {
		if (isNodeError(error) && error.code === 'ENOENT')
			throw new Error(`File not found: ${file}`);
		throw error;
	});
	if (!fileInfo.isFile()) throw new Error(`Not a file: ${file}`);
	if (!/\.html?$/i.test(file))
		throw new Error('pp accepts HTML files (.html or .htm).');
	const html = await readFile(file, 'utf8');

	let token = await getToken(args.apiUrl);
	if (!token) token = await login(api, args.apiUrl);

	const saved = args.newDraft ? undefined : await getDraft(file, args.apiUrl);
	const draftId = args.draftId ?? saved?.draftId;
	console.log(
		draftId ? `Publishing a new version of ${draftId}…` : 'Publishing…'
	);
	const uploadInput = {
		html,
		filename: basename(file),
		...(args.description !== undefined
			? { description: args.description }
			: {}),
		metadata: collectMetadata(file, html, VERSION),
		token
	};
	const result = await api
		.upload({
			...uploadInput,
			...(draftId ? { draftId } : {})
		})
		.catch((error: unknown) => {
			if (
				!saved ||
				args.draftId !== undefined ||
				!(error instanceof ApiError) ||
				error.status !== 404
			) {
				throw error;
			}

			console.log(
				`Draft ${saved.draftId} no longer exists. Publishing a new draft…`
			);
			return api.upload(uploadInput);
		});
	await setDraft(file, {
		apiUrl: args.apiUrl,
		draftId: result.draftId
	});
	console.log(result.url);
	console.log(`Draft ${result.draftId} · version ${result.version}`);
}

async function whoami(
	api: ApiClient,
	args: { apiUrl: string; json: boolean }
): Promise<void> {
	const token = await requireToken(args.apiUrl);
	const account = await api.whoami(token);
	if (args.json) {
		console.log(JSON.stringify(account, null, 2));
		return;
	}
	console.log(
		account.email ? `${account.name} <${account.email}>` : account.name
	);
}

async function list(
	api: ApiClient,
	args: { apiUrl: string; json: boolean }
): Promise<void> {
	const token = await requireToken(args.apiUrl);
	const drafts = await api.listDrafts(token);
	if (args.json) {
		console.log(JSON.stringify(drafts, null, 2));
		return;
	}
	if (drafts.length === 0) {
		console.log('No drafts yet.');
		return;
	}
	for (const draft of drafts) console.log(formatDraft(draft, args.apiUrl));
}

function formatDraft(draft: DraftSummary, apiUrl: string): string {
	const updated = new Date(draft.updatedAt).toLocaleString();
	return `${draft.title}  v${draft.currentVersion}  ${draft.url ?? `${apiUrl}/${draft.id}`}  ${updated}`;
}

async function requireToken(apiUrl: string): Promise<string> {
	const token = await getToken(apiUrl);
	if (!token)
		throw new Error(
			`Not signed in to ${apiUrl}. Run: npx @rraf/pp auth login --api-url ${apiUrl}`
		);
	return token;
}

function isNodeError(value: unknown): value is NodeJS.ErrnoException {
	return value instanceof Error && 'code' in value;
}

async function main(): Promise<void> {
	try {
		await run();
	} catch (error) {
		if (error instanceof UsageError) {
			console.error(error.message);
			console.error('Run npx @rraf/pp --help for usage.');
			process.exitCode = 2;
			return;
		}
		if (error instanceof ApiError && error.status === 401) {
			console.error(
				`${error.message} Run npx @rraf/pp auth login to sign in again.`
			);
		} else {
			console.error(error instanceof Error ? error.message : String(error));
		}
		process.exitCode = 1;
	}
}

if (
	process.argv[1] &&
	fileURLToPath(import.meta.url) === resolve(process.argv[1])
)
	void main();
