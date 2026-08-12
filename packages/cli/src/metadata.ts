import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { dirname } from 'node:path';
import type { UploadMetadata } from './types.js';

export function collectMetadata(
	file: string,
	html: string,
	cliVersion: string
): UploadMetadata {
	const git = gitMetadata(dirname(file));
	return {
		cliVersion,
		fileSha256: createHash('sha256').update(html).digest('hex'),
		...git,
		...ciMetadata(process.env)
	};
}

function gitMetadata(cwd: string): Partial<UploadMetadata> {
	if (!git(['rev-parse', '--is-inside-work-tree'], cwd)) return {};
	const gitBranch = git(['branch', '--show-current'], cwd);
	const gitCommit = git(['rev-parse', 'HEAD'], cwd);
	const gitSubject = git(['log', '-1', '--pretty=%s'], cwd);
	const status = git(['status', '--porcelain'], cwd, false);
	return {
		...(gitBranch ? { gitBranch } : {}),
		...(gitCommit ? { gitCommit } : {}),
		...(gitSubject ? { gitSubject } : {}),
		...(status !== undefined ? { gitDirty: status.length > 0 } : {})
	};
}

function git(
	args: string[],
	cwd: string,
	requireOutput = true
): string | undefined {
	const result = spawnSync('git', args, {
		cwd,
		encoding: 'utf8',
		timeout: 2_000
	});
	if (result.status !== 0 || result.error) return undefined;
	const value = result.stdout.trim();
	return value || (requireOutput ? undefined : '');
}

function ciMetadata(environment: NodeJS.ProcessEnv): Partial<UploadMetadata> {
	const githubUrl =
		environment.GITHUB_SERVER_URL &&
		environment.GITHUB_REPOSITORY &&
		environment.GITHUB_RUN_ID
			? `${environment.GITHUB_SERVER_URL}/${environment.GITHUB_REPOSITORY}/actions/runs/${environment.GITHUB_RUN_ID}`
			: undefined;
	const ciUrl =
		environment.CI_PIPELINE_URL ??
		environment.CIRCLE_BUILD_URL ??
		environment.BUILD_URL ??
		githubUrl;
	const ciActor =
		environment.GITHUB_ACTOR ??
		environment.GITLAB_USER_LOGIN ??
		environment.CIRCLE_USERNAME ??
		environment.BUILD_USER_ID;
	return {
		...(ciUrl ? { ciUrl } : {}),
		...(ciActor ? { ciActor } : {})
	};
}
