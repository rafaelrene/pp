import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { getDatabasePath, isAllowedEmail } from './config';
import { randomToken, sha256 } from './crypto';

type DatabaseGlobal = typeof globalThis & { __ppDatabase?: DatabaseSync };

export type Account = {
	id: string;
	name: string;
	email: string | null;
	pictureUrl: string | null;
};

export type ApiIdentity = {
	keyId: string;
	accountId: string;
	accountName: string;
};

export type DraftSummary = {
	id: string;
	title: string;
	description: string | null;
	currentVersion: number;
	versionCount: number;
	updatedAt: number;
	createdAt: number;
};

export type DraftVersion = {
	draftId: string;
	version: number;
	html: string;
	createdAt: number;
};

export type UploadMetadata = {
	cliVersion?: string;
	fileSha256?: string;
	gitBranch?: string;
	gitCommit?: string;
	gitSubject?: string;
	gitDirty?: boolean;
	ciUrl?: string;
	ciActor?: string;
};

export type SaveDraftInput = {
	html: string;
	filename: string;
	description?: string;
	draftId?: string;
	editToken?: string;
	identity: ApiIdentity | null;
	metadata: UploadMetadata;
};

export type SavedDraft = {
	draftId: string;
	version: number;
	editToken?: string;
	created: boolean;
};

const globalDatabase = globalThis as DatabaseGlobal;
export const database = (globalDatabase.__ppDatabase ??= openDatabase());

export function findOrCreateShooAccount(input: {
	subject: string;
	name: string | null;
	email: string | null;
	pictureUrl: string | null;
}): Account {
	const now = Date.now();
	const existing = getRow(
		`SELECT a.id, a.name, a.email, a.picture_url
		 FROM identities i JOIN accounts a ON a.id = i.account_id
		 WHERE i.provider = 'shoo' AND i.subject = ?`,
		[input.subject]
	);

	if (existing) {
		const id = requiredString(existing, 'id');
		const name = input.name || input.email || requiredString(existing, 'name');
		database
			.prepare(
				'UPDATE accounts SET name = ?, email = ?, picture_url = ?, updated_at = ? WHERE id = ?'
			)
			.run(name, input.email, input.pictureUrl, now, id);
		database
			.prepare(
				'UPDATE identities SET last_login_at = ? WHERE provider = ? AND subject = ?'
			)
			.run(now, 'shoo', input.subject);
		return { id, name, email: input.email, pictureUrl: input.pictureUrl };
	}

	const id = `acct_${randomToken(12)}`;
	const name = input.name || input.email || 'Shoo user';
	transaction(() => {
		database
			.prepare(
				'INSERT INTO accounts (id, name, email, picture_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
			)
			.run(id, name, input.email, input.pictureUrl, now, now);
		database
			.prepare(
				'INSERT INTO identities (provider, subject, account_id, created_at, last_login_at) VALUES (?, ?, ?, ?, ?)'
			)
			.run('shoo', input.subject, id, now, now);
	});
	return { id, name, email: input.email, pictureUrl: input.pictureUrl };
}

export function createCliAuthRequest(): {
	deviceCode: string;
	userCode: string;
	expiresIn: number;
	interval: number;
} {
	const expiresIn = 10 * 60;
	const interval = 2;
	const now = Date.now();
	database
		.prepare('DELETE FROM cli_auth_requests WHERE expires_at < ?')
		.run(now);

	for (let attempt = 0; attempt < 5; attempt += 1) {
		const deviceCode = randomToken(32);
		const userCode = createUserCode();
		try {
			database
				.prepare(
					'INSERT INTO cli_auth_requests (device_code_hash, user_code, expires_at, created_at) VALUES (?, ?, ?, ?)'
				)
				.run(
					sha256(deviceCode),
					normalizeUserCode(userCode),
					now + expiresIn * 1000,
					now
				);
			return { deviceCode, userCode, expiresIn, interval };
		} catch (error) {
			if (attempt === 4) throw error;
		}
	}
	throw new Error('Could not allocate a CLI authorization code.');
}

export function getCliAuthRequest(
	userCode: string
): { status: 'pending' | 'approved' } | null {
	const row = getRow(
		'SELECT api_token, expires_at FROM cli_auth_requests WHERE user_code = ?',
		[normalizeUserCode(userCode)]
	);
	if (!row || requiredNumber(row, 'expires_at') < Date.now()) return null;
	return { status: typeof row.api_token === 'string' ? 'approved' : 'pending' };
}

export function approveCliAuthRequest(
	userCode: string,
	account: Account
): void {
	const normalizedCode = normalizeUserCode(userCode);
	const now = Date.now();
	const apiToken = `pp_${randomToken(32)}`;
	const keyId = `key_${randomToken(12)}`;

	transaction(() => {
		const request = getRow(
			'SELECT api_token, expires_at FROM cli_auth_requests WHERE user_code = ?',
			[normalizedCode]
		);
		if (!request || requiredNumber(request, 'expires_at') < now) {
			throw new CliAuthError('This authorization code is invalid or expired.');
		}
		if (typeof request.api_token === 'string') return;

		database
			.prepare(
				'INSERT INTO api_keys (id, account_id, name, key_hash, created_at) VALUES (?, ?, ?, ?, ?)'
			)
			.run(keyId, account.id, 'pp CLI', sha256(apiToken), now);
		database
			.prepare(
				'UPDATE cli_auth_requests SET api_token = ?, account_id = ?, approved_at = ? WHERE user_code = ?'
			)
			.run(apiToken, account.id, now, normalizedCode);
	});
}

export function denyCliAuthRequest(userCode: string): void {
	database
		.prepare(
			'UPDATE cli_auth_requests SET denied_at = ? WHERE user_code = ? AND api_token IS NULL'
		)
		.run(Date.now(), normalizeUserCode(userCode));
}

export function pollCliAuthRequest(
	deviceCode: string
):
	| { status: 'pending' }
	| { status: 'denied' }
	| { status: 'expired' }
	| { status: 'approved'; token: string } {
	return transaction(() => {
		const hash = sha256(deviceCode);
		const row = getRow(
			'SELECT api_token, denied_at, expires_at FROM cli_auth_requests WHERE device_code_hash = ?',
			[hash]
		);
		if (!row) return { status: 'expired' };
		if (requiredNumber(row, 'expires_at') < Date.now()) {
			database
				.prepare('DELETE FROM cli_auth_requests WHERE device_code_hash = ?')
				.run(hash);
			return { status: 'expired' };
		}
		if (typeof row.denied_at === 'number') return { status: 'denied' };
		if (typeof row.api_token !== 'string') return { status: 'pending' };

		const token = row.api_token;
		database
			.prepare('DELETE FROM cli_auth_requests WHERE device_code_hash = ?')
			.run(hash);
		return { status: 'approved', token };
	});
}

export function authenticateApiKey(
	authorization: string | null
): ApiIdentity | null {
	if (!authorization?.startsWith('Bearer ')) return null;
	const token = authorization.slice('Bearer '.length).trim();
	if (!token) return null;

	const row = getRow(
		`SELECT k.id AS key_id, k.account_id, a.name AS account_name, a.email
		 FROM api_keys k JOIN accounts a ON a.id = k.account_id
		 WHERE k.key_hash = ? AND k.revoked_at IS NULL`,
		[sha256(token)]
	);
	if (!row || !isAllowedEmail(optionalString(row, 'email'))) return null;
	const keyId = requiredString(row, 'key_id');
	database
		.prepare('UPDATE api_keys SET last_used_at = ? WHERE id = ?')
		.run(Date.now(), keyId);
	return {
		keyId,
		accountId: requiredString(row, 'account_id'),
		accountName: requiredString(row, 'account_name')
	};
}

export function saveDraft(input: SaveDraftInput): SavedDraft {
	const now = Date.now();
	const title = titleFromFilename(input.filename);
	if (!input.draftId) {
		const draftId = createDraftId();
		const editToken = input.identity ? undefined : `ppe_${randomToken(24)}`;
		transaction(() => {
			database
				.prepare(
					`INSERT INTO drafts
					 (id, account_id, edit_token_hash, title, description, current_version, created_at, updated_at)
					 VALUES (?, ?, ?, ?, ?, 1, ?, ?)`
				)
				.run(
					draftId,
					input.identity?.accountId ?? null,
					editToken ? sha256(editToken) : null,
					title,
					input.description ?? null,
					now,
					now
				);
			insertDraftVersion(draftId, 1, input, now);
		});
		return { draftId, version: 1, editToken, created: true };
	}

	const draftId = input.draftId;
	return transaction(() => {
		const draft = getRow(
			'SELECT account_id, edit_token_hash, current_version FROM drafts WHERE id = ? AND deleted_at IS NULL',
			[draftId]
		);
		if (!draft) throw new DraftAccessError('Draft not found.', 404);
		authorizeDraftUpdate(draft, input);

		const currentOwnerId = optionalString(draft, 'account_id');
		const claimedAccountId =
			currentOwnerId ?? input.identity?.accountId ?? null;
		const editTokenHash =
			!currentOwnerId && input.identity
				? null
				: optionalString(draft, 'edit_token_hash');
		const nextVersion = requiredNumber(draft, 'current_version') + 1;
		database
			.prepare(
				`UPDATE drafts SET account_id = ?, edit_token_hash = ?, title = ?,
				 description = COALESCE(?, description), current_version = ?, updated_at = ?
				 WHERE id = ?`
			)
			.run(
				claimedAccountId,
				editTokenHash,
				title,
				input.description ?? null,
				nextVersion,
				now,
				draftId
			);
		insertDraftVersion(draftId, nextVersion, input, now);
		return { draftId, version: nextVersion, created: false };
	});
}

export function getDraftVersion(
	draftId: string,
	version?: number
): DraftVersion | null {
	const row = version
		? getRow(
				`SELECT v.draft_id, v.version_number, v.html, v.created_at
				 FROM draft_versions v JOIN drafts d ON d.id = v.draft_id
				 WHERE v.draft_id = ? AND v.version_number = ? AND d.deleted_at IS NULL AND d.disabled_at IS NULL`,
				[draftId, version]
			)
		: getRow(
				`SELECT v.draft_id, v.version_number, v.html, v.created_at
				 FROM draft_versions v JOIN drafts d ON d.id = v.draft_id
				 WHERE v.draft_id = ? AND v.version_number = d.current_version
				 AND d.deleted_at IS NULL AND d.disabled_at IS NULL`,
				[draftId]
			);
	if (!row) return null;
	return {
		draftId: requiredString(row, 'draft_id'),
		version: requiredNumber(row, 'version_number'),
		html: requiredString(row, 'html'),
		createdAt: requiredNumber(row, 'created_at')
	};
}

export function listAccountDrafts(accountId: string): DraftSummary[] {
	return database
		.prepare(
			`SELECT d.id, d.title, d.description, d.current_version, d.created_at, d.updated_at,
			 COUNT(v.id) AS version_count
			 FROM drafts d LEFT JOIN draft_versions v ON v.draft_id = d.id
			 WHERE d.account_id = ? AND d.deleted_at IS NULL
			 GROUP BY d.id ORDER BY d.updated_at DESC`
		)
		.all(accountId)
		.map((row) => ({
			id: requiredString(row, 'id'),
			title: requiredString(row, 'title'),
			description: optionalString(row, 'description'),
			currentVersion: requiredNumber(row, 'current_version'),
			versionCount: requiredNumber(row, 'version_count'),
			updatedAt: requiredNumber(row, 'updated_at'),
			createdAt: requiredNumber(row, 'created_at')
		}));
}

export function deleteAccountDraft(
	draftId: string,
	accountId: string
): boolean {
	return transaction(() => {
		database
			.prepare(
				`DELETE FROM draft_versions WHERE draft_id IN
				 (SELECT id FROM drafts WHERE id = ? AND account_id = ?)`
			)
			.run(draftId, accountId);
		const result = database
			.prepare('DELETE FROM drafts WHERE id = ? AND account_id = ?')
			.run(draftId, accountId);
		return result.changes === 1;
	});
}

export function checkDatabase(): void {
	database.prepare('SELECT 1').get();
}

export function getAccount(accountId: string): Account | null {
	const row = getRow(
		'SELECT id, name, email, picture_url FROM accounts WHERE id = ?',
		[accountId]
	);
	if (!row) return null;
	return {
		id: requiredString(row, 'id'),
		name: requiredString(row, 'name'),
		email: optionalString(row, 'email'),
		pictureUrl: optionalString(row, 'picture_url')
	};
}

export class CliAuthError extends Error {}

export class DraftAccessError extends Error {
	constructor(
		message: string,
		readonly status: 401 | 403 | 404
	) {
		super(message);
	}
}

function openDatabase(): DatabaseSync {
	const path = resolve(getDatabasePath());
	mkdirSync(dirname(path), { recursive: true });
	const db = new DatabaseSync(path);
	db.exec(
		'PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;'
	);
	db.exec(`
		CREATE TABLE IF NOT EXISTS accounts (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			email TEXT,
			picture_url TEXT,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);
		CREATE TABLE IF NOT EXISTS identities (
			provider TEXT NOT NULL,
			subject TEXT NOT NULL,
			account_id TEXT NOT NULL REFERENCES accounts(id),
			created_at INTEGER NOT NULL,
			last_login_at INTEGER NOT NULL,
			PRIMARY KEY (provider, subject)
		);
		CREATE TABLE IF NOT EXISTS api_keys (
			id TEXT PRIMARY KEY,
			account_id TEXT NOT NULL REFERENCES accounts(id),
			name TEXT NOT NULL,
			key_hash TEXT NOT NULL UNIQUE,
			created_at INTEGER NOT NULL,
			last_used_at INTEGER,
			revoked_at INTEGER
		);
		CREATE TABLE IF NOT EXISTS cli_auth_requests (
			device_code_hash TEXT PRIMARY KEY,
			user_code TEXT NOT NULL UNIQUE,
			account_id TEXT REFERENCES accounts(id),
			api_token TEXT,
			created_at INTEGER NOT NULL,
			expires_at INTEGER NOT NULL,
			approved_at INTEGER,
			denied_at INTEGER
		);
		CREATE TABLE IF NOT EXISTS drafts (
			id TEXT PRIMARY KEY,
			account_id TEXT REFERENCES accounts(id),
			edit_token_hash TEXT,
			title TEXT NOT NULL,
			description TEXT,
			current_version INTEGER NOT NULL,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL,
			deleted_at INTEGER,
			disabled_at INTEGER
		);
		CREATE TABLE IF NOT EXISTS draft_versions (
			id TEXT PRIMARY KEY,
			draft_id TEXT NOT NULL REFERENCES drafts(id),
			version_number INTEGER NOT NULL,
			html TEXT NOT NULL,
			content_hash TEXT NOT NULL,
			file_size INTEGER NOT NULL,
			created_at INTEGER NOT NULL,
			created_by_api_key_id TEXT REFERENCES api_keys(id),
			original_filename TEXT NOT NULL,
			metadata_json TEXT NOT NULL,
			UNIQUE (draft_id, version_number)
		);
		CREATE INDEX IF NOT EXISTS drafts_account_id_idx ON drafts(account_id);
		CREATE INDEX IF NOT EXISTS draft_versions_draft_id_idx ON draft_versions(draft_id);
	`);
	return db;
}

function insertDraftVersion(
	draftId: string,
	version: number,
	input: SaveDraftInput,
	now: number
): void {
	database
		.prepare(
			`INSERT INTO draft_versions
			 (id, draft_id, version_number, html, content_hash, file_size, created_at,
			 created_by_api_key_id, original_filename, metadata_json)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.run(
			`version_${randomToken(12)}`,
			draftId,
			version,
			input.html,
			sha256(input.html),
			Buffer.byteLength(input.html, 'utf8'),
			now,
			input.identity?.keyId ?? null,
			input.filename,
			JSON.stringify(input.metadata)
		);
}

function authorizeDraftUpdate(
	row: Record<string, unknown>,
	input: SaveDraftInput
): void {
	const ownerId = optionalString(row, 'account_id');
	if (ownerId) {
		if (input.identity?.accountId !== ownerId)
			throw new DraftAccessError('Draft not found.', 404);
		return;
	}
	const expected = optionalString(row, 'edit_token_hash');
	if (!expected || !input.editToken || sha256(input.editToken) !== expected) {
		throw new DraftAccessError(
			'This anonymous draft needs its edit token.',
			403
		);
	}
}

function transaction<T>(work: () => T): T {
	database.exec('BEGIN IMMEDIATE');
	try {
		const value = work();
		database.exec('COMMIT');
		return value;
	} catch (error) {
		database.exec('ROLLBACK');
		throw error;
	}
}

function getRow(
	sql: string,
	params: SQLInputValue[]
): Record<string, unknown> | undefined {
	return database.prepare(sql).get(...params);
}

function requiredString(row: Record<string, unknown>, key: string): string {
	const value = row[key];
	if (typeof value !== 'string')
		throw new Error(`Database column ${key} is not a string.`);
	return value;
}

function optionalString(
	row: Record<string, unknown>,
	key: string
): string | null {
	const value = row[key];
	if (value === null || value === undefined) return null;
	if (typeof value !== 'string')
		throw new Error(`Database column ${key} is not a string.`);
	return value;
}

function requiredNumber(row: Record<string, unknown>, key: string): number {
	const value = row[key];
	if (typeof value !== 'number')
		throw new Error(`Database column ${key} is not a number.`);
	return value;
}

function titleFromFilename(filename: string): string {
	const title = filename
		.replace(/\.html?$/i, '')
		.replace(/[-_]+/g, ' ')
		.trim();
	return title || 'Untitled draft';
}

function createDraftId(): string {
	const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
	const bytes = Buffer.from(randomToken(18), 'base64url');
	return [...bytes.subarray(0, 12)]
		.map((byte) => alphabet[byte % alphabet.length])
		.join('');
}

function createUserCode(): string {
	const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
	const bytes = Buffer.from(randomToken(12), 'base64url');
	const code = [...bytes.subarray(0, 8)]
		.map((byte) => alphabet[byte % alphabet.length])
		.join('');
	return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export function normalizeUserCode(value: string): string {
	return value.trim().replaceAll('-', '').toUpperCase();
}
