import { describe, expect, it } from 'vitest';
import { parseArgs, UsageError } from '../src/args.js';

describe('parseArgs', () => {
	it('uses a bare filename as the upload command', () => {
		expect(parseArgs(['plan.html'], {})).toEqual({
			command: 'upload',
			file: 'plan.html',
			anonymous: false,
			newDraft: false,
			apiUrl: 'http://localhost:5173'
		});
	});

	it('accepts upload options', () => {
		expect(
			parseArgs(
				[
					'upload',
					'--description',
					'First pass',
					'--api-url=https://plans.example/',
					'--anonymous',
					'plan.html'
				],
				{}
			)
		).toEqual({
			command: 'upload',
			file: 'plan.html',
			anonymous: true,
			newDraft: false,
			description: 'First pass',
			apiUrl: 'https://plans.example'
		});
	});

	it('ignores the separator forwarded by pnpm scripts', () => {
		expect(parseArgs(['--', 'plan.html', '--anonymous'], {})).toEqual({
			command: 'upload',
			file: 'plan.html',
			anonymous: true,
			newDraft: false,
			apiUrl: 'http://localhost:5173'
		});
	});

	it('accepts list JSON output', () => {
		expect(
			parseArgs(['list', '--json'], { PP_API_URL: 'https://plans.example' })
		).toEqual({
			command: 'list',
			json: true,
			apiUrl: 'https://plans.example'
		});
	});

	it('rejects contradictory draft selection', () => {
		expect(() =>
			parseArgs(['plan.html', '--new', '--draft', 'abc'], {})
		).toThrow(UsageError);
	});
});
