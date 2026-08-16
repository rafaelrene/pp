import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { VERSION } from '../src/version.js';

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

	it('runs through an installed bin symlink', () => {
		const build = spawnSync('pnpm', ['run', 'build'], {
			cwd: packageDirectory,
			encoding: 'utf8'
		});
		expect(build.status).toBe(0);

		const directory = mkdtempSync(join(tmpdir(), 'pp-bin-test-'));
		try {
			const bin = join(directory, 'pp');
			symlinkSync(join(packageDirectory, 'dist/index.js'), bin);
			const result = spawnSync(process.execPath, [bin, '--version'], {
				encoding: 'utf8'
			});

			expect(result.status).toBe(0);
			expect(result.stdout.trim()).toBe(VERSION);
		} finally {
			rmSync(directory, { recursive: true });
		}
	});
});
