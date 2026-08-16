import { readFileSync } from 'node:fs';

export const VERSION = readPackageVersion();

function readPackageVersion(): string {
	const packageJson: unknown = JSON.parse(
		readFileSync(new URL('../package.json', import.meta.url), 'utf8')
	);
	if (
		typeof packageJson !== 'object' ||
		packageJson === null ||
		!('version' in packageJson) ||
		typeof packageJson.version !== 'string'
	) {
		throw new Error('The pp package version is missing or invalid.');
	}
	return packageJson.version;
}
