import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
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

	it('runs the binary installed from the npm tarball', () => {
		const build = spawnSync('pnpm', ['run', 'build'], {
			cwd: packageDirectory,
			encoding: 'utf8'
		});
		expect(build.status).toBe(0);

		const directory = mkdtempSync(join(tmpdir(), 'pp-bin-test-'));
		try {
			const pack = spawnSync(
				'npm',
				[
					'pack',
					'--dry-run=false',
					'--pack-destination',
					directory,
					'--ignore-scripts'
				],
				{
					cwd: packageDirectory,
					encoding: 'utf8'
				}
			);
			expect(pack.status).toBe(0);

			const tarballs = readdirSync(directory).filter((file) =>
				file.endsWith('.tgz')
			);
			expect(tarballs).toHaveLength(1);
			const tarball = tarballs[0];
			if (!tarball) throw new Error('npm pack did not create a tarball.');

			const installDirectory = join(directory, 'consumer');
			mkdirSync(installDirectory);
			const install = spawnSync(
				'npm',
				[
					'install',
					'--dry-run=false',
					'--offline',
					'--ignore-scripts',
					'--no-audit',
					'--no-fund',
					'--package-lock=false',
					join(directory, tarball)
				],
				{
					cwd: installDirectory,
					encoding: 'utf8'
				}
			);
			expect(install.status).toBe(0);

			const executable = process.platform === 'win32' ? 'pp.cmd' : 'pp';
			const bin = join(installDirectory, 'node_modules', '.bin', executable);
			const result = spawnSync(bin, ['--version'], {
				encoding: 'utf8'
			});

			expect(result.status).toBe(0);
			expect(result.stdout.trim()).toBe(VERSION);
		} finally {
			rmSync(directory, { recursive: true });
		}
	});
});
