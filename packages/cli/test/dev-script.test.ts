import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const packageDirectory = fileURLToPath(new URL('..', import.meta.url));

describe('development command', () => {
	it('starts the CLI from TypeScript sources', () => {
		const result = spawnSync('pnpm', ['run', 'dev', '--', '--help'], {
			cwd: packageDirectory,
			encoding: 'utf8'
		});

		expect(result.stderr).not.toContain('ERR_MODULE_NOT_FOUND');
		expect(result.status).toBe(0);
		expect(result.stdout).toContain('pp — publish an HTML file');
	});
});
