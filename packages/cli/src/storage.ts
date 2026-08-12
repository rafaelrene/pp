import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import type { DraftReference } from './types.js';

type CredentialsFile = {
	version: 1;
	servers: Record<string, { token: string }>;
};

type DraftsFile = {
	version: 1;
	drafts: Record<string, DraftReference>;
};

const EMPTY_CREDENTIALS: CredentialsFile = { version: 1, servers: {} };
const EMPTY_DRAFTS: DraftsFile = { version: 1, drafts: {} };

export function configPaths(home = homedir()): {
	directory: string;
	credentials: string;
	drafts: string;
} {
	const directory = process.env.PP_CONFIG_DIR || join(home, '.pp');
	return {
		directory,
		credentials: join(directory, 'credentials.json'),
		drafts: join(directory, 'drafts.json')
	};
}

export async function getToken(apiUrl: string): Promise<string | undefined> {
	const credentials = await readCredentials();
	return credentials.servers[apiUrl]?.token;
}

export async function setToken(apiUrl: string, token: string): Promise<void> {
	const credentials = await readCredentials();
	credentials.servers[apiUrl] = { token };
	await writeJson(configPaths().credentials, credentials, 0o600);
}

export async function removeToken(apiUrl: string): Promise<boolean> {
	const credentials = await readCredentials();
	if (!credentials.servers[apiUrl]) return false;
	delete credentials.servers[apiUrl];
	await writeJson(configPaths().credentials, credentials, 0o600);
	return true;
}

export async function getDraft(
	file: string,
	apiUrl: string
): Promise<DraftReference | undefined> {
	const drafts = await readDrafts();
	const reference = drafts.drafts[file];
	return reference?.apiUrl === apiUrl ? reference : undefined;
}

export async function setDraft(
	file: string,
	reference: DraftReference
): Promise<void> {
	const drafts = await readDrafts();
	drafts.drafts[file] = reference;
	await writeJson(configPaths().drafts, drafts, 0o600);
}

async function readCredentials(): Promise<CredentialsFile> {
	const value = await readJson(configPaths().credentials);
	if (!isRecord(value) || value.version !== 1 || !isRecord(value.servers))
		return structuredClone(EMPTY_CREDENTIALS);
	const servers: CredentialsFile['servers'] = {};
	for (const [url, entry] of Object.entries(value.servers)) {
		if (isRecord(entry) && typeof entry.token === 'string')
			servers[url] = { token: entry.token };
	}
	return { version: 1, servers };
}

async function readDrafts(): Promise<DraftsFile> {
	const value = await readJson(configPaths().drafts);
	if (!isRecord(value) || value.version !== 1 || !isRecord(value.drafts))
		return structuredClone(EMPTY_DRAFTS);
	const drafts: DraftsFile['drafts'] = {};
	for (const [file, entry] of Object.entries(value.drafts)) {
		if (
			!isRecord(entry) ||
			typeof entry.apiUrl !== 'string' ||
			typeof entry.draftId !== 'string'
		)
			continue;
		drafts[file] = {
			apiUrl: entry.apiUrl,
			draftId: entry.draftId,
			...(typeof entry.editToken === 'string'
				? { editToken: entry.editToken }
				: {})
		};
	}
	return { version: 1, drafts };
}

async function readJson(path: string): Promise<unknown> {
	try {
		return JSON.parse(await readFile(path, 'utf8')) as unknown;
	} catch (error) {
		if (isNodeError(error) && error.code === 'ENOENT') return undefined;
		if (error instanceof SyntaxError)
			throw new Error(`${path} contains invalid JSON.`, { cause: error });
		throw error;
	}
}

async function writeJson(
	path: string,
	value: unknown,
	mode: number
): Promise<void> {
	await mkdir(dirname(path), { recursive: true, mode: 0o700 });
	const temporaryPath = `${path}.${process.pid}.tmp`;
	await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, {
		encoding: 'utf8',
		mode
	});
	await rename(temporaryPath, path);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function isNodeError(value: unknown): value is NodeJS.ErrnoException {
	return value instanceof Error && 'code' in value;
}
