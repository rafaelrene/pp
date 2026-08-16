import { describe, expect, it } from 'vitest';
import {
	ApiError,
	parseCliAuthPoll,
	parseCliAuthStart,
	parseDraftList,
	parseUploadResponse
} from '../src/api.js';

describe('API response parsing', () => {
	it('parses a successful upload', () => {
		expect(
			parseUploadResponse({
				draftId: 'draft-1',
				version: 2,
				url: 'https://plans.example/draft-1'
			})
		).toEqual({
			draftId: 'draft-1',
			version: 2,
			url: 'https://plans.example/draft-1'
		});
	});

	it('requires a token when authentication is approved', () => {
		expect(() => parseCliAuthPoll({ status: 'approved' })).toThrow(ApiError);
	});

	it('parses the device authorization contract', () => {
		expect(
			parseCliAuthStart({
				deviceCode: 'device',
				userCode: 'ABCD-1234',
				verificationUri: 'https://plans.example/cli/auth',
				verificationUrlComplete:
					'https://plans.example/cli/auth?user_code=ABCD-1234',
				expiresIn: 600,
				interval: 2
			})
		).toMatchObject({ verificationUrl: 'https://plans.example/cli/auth' });
		expect(parseCliAuthPoll({ error: 'authorization_pending' })).toEqual({
			status: 'pending'
		});
		expect(
			parseCliAuthPoll({ accessToken: 'pp_secret', tokenType: 'Bearer' })
		).toEqual({
			status: 'approved',
			token: 'pp_secret'
		});
	});

	it('accepts a wrapped list response', () => {
		expect(
			parseDraftList({
				drafts: [
					{
						id: 'draft-1',
						title: 'Plan',
						description: null,
						currentVersion: 1,
						versionCount: 1,
						updatedAt: 100,
						createdAt: 100
					}
				]
			})
		).toHaveLength(1);
	});
});
