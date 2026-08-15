import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const directory = mkdtempSync(join(tmpdir(), 'pp-database-test-'));
process.env.DATABASE_PATH = join(directory, 'pp.sqlite');

const databaseModule = await import('#lib/server/database.js');

afterAll(() => {
	databaseModule.database.close();
	rmSync(directory, { recursive: true, force: true });
});

describe('draft ownership', () => {
	it('claims an anonymous draft and permanently deletes every version', () => {
		const anonymousDraft = databaseModule.saveDraft({
			html: '<h1>Anonymous</h1>',
			filename: 'plan.html',
			identity: null,
			metadata: {}
		});
		expect(anonymousDraft.editToken).toBeDefined();

		const account = databaseModule.findOrCreateShooAccount({
			subject: 'test-subject',
			name: 'Test user',
			email: 'test@example.com',
			pictureUrl: null
		});
		const authRequest = databaseModule.createCliAuthRequest();
		databaseModule.approveCliAuthRequest(authRequest.userCode, account);
		const poll = databaseModule.pollCliAuthRequest(authRequest.deviceCode);
		if (poll.status !== 'approved')
			throw new Error('Expected an approved CLI token.');
		const identity = databaseModule.authenticateApiKey(`Bearer ${poll.token}`);
		expect(identity).not.toBeNull();

		databaseModule.saveDraft({
			draftId: anonymousDraft.draftId,
			editToken: anonymousDraft.editToken,
			html: '<h1>Authenticated update</h1>',
			filename: 'plan.html',
			identity,
			metadata: {}
		});

		expect(databaseModule.listAccountDrafts(account.id)).toContainEqual(
			expect.objectContaining({ id: anonymousDraft.draftId, currentVersion: 2 })
		);

		expect(() =>
			databaseModule.saveDraft({
				draftId: anonymousDraft.draftId,
				editToken: anonymousDraft.editToken,
				html: '<h1>Old anonymous token</h1>',
				filename: 'plan.html',
				identity: null,
				metadata: {}
			})
		).toThrow('Draft not found.');

		expect(
			databaseModule.deleteAccountDraft(anonymousDraft.draftId, account.id)
		).toBe(true);
		expect(
			databaseModule.database
				.prepare('SELECT COUNT(*) AS count FROM drafts WHERE id = ?')
				.get(anonymousDraft.draftId)
		).toEqual({ count: 0 });
		expect(
			databaseModule.database
				.prepare(
					'SELECT COUNT(*) AS count FROM draft_versions WHERE draft_id = ?'
				)
				.get(anonymousDraft.draftId)
		).toEqual({ count: 0 });
	});
});
