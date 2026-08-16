export const DEFAULT_API_URL = 'https://plans.rafr.dev';

type CommonOptions = {
	apiUrl: string;
};

export type CliArguments =
	| ({
			command: 'upload';
			file: string;
			newDraft: boolean;
			draftId?: string;
			description?: string;
	  } & CommonOptions)
	| ({
			command: 'auth-login' | 'auth-logout' | 'whoami';
			json: boolean;
	  } & CommonOptions)
	| ({ command: 'list'; json: boolean } & CommonOptions)
	| { command: 'help' }
	| { command: 'version' };

export class UsageError extends Error {}

export function parseArgs(
	argv: readonly string[],
	environment = process.env
): CliArguments {
	const tokens = [...argv];
	// pnpm preserves the conventional argument separator when forwarding to a script.
	if (tokens[0] === '--') tokens.shift();
	if (tokens.length === 0 || tokens.includes('--help') || tokens.includes('-h'))
		return { command: 'help' };
	if (
		tokens.length === 1 &&
		(tokens[0] === '--version' || tokens[0] === '-v')
	) {
		return { command: 'version' };
	}

	const apiUrl =
		readOption(tokens, '--api-url') ??
		environment.PP_API_URL ??
		DEFAULT_API_URL;
	const first = tokens[0];

	if (first === 'auth') {
		const action = tokens[1];
		if (action !== 'login' && action !== 'logout')
			throw new UsageError('Usage: pp auth <login|logout>');
		tokens.splice(0, 2);
		assertNoArguments(tokens);
		return {
			command: `auth-${action}`,
			apiUrl: normalizeApiUrl(apiUrl),
			json: false
		};
	}

	if (first === 'whoami') {
		tokens.shift();
		const json = takeFlag(tokens, '--json');
		assertNoArguments(tokens);
		return { command: 'whoami', apiUrl: normalizeApiUrl(apiUrl), json };
	}

	if (first === 'list') {
		tokens.shift();
		const json = takeFlag(tokens, '--json');
		assertNoArguments(tokens);
		return { command: 'list', apiUrl: normalizeApiUrl(apiUrl), json };
	}

	if (first === 'upload') tokens.shift();
	const newDraft = takeFlag(tokens, '--new');
	const draftId = readOption(tokens, '--draft');
	const description = readOption(tokens, '--description');
	if (newDraft && draftId)
		throw new UsageError('--new and --draft cannot be used together.');
	if (tokens.length !== 1 || !tokens[0] || tokens[0].startsWith('-')) {
		throw new UsageError('Usage: pp [upload] <file> [options]');
	}

	return {
		command: 'upload',
		file: tokens[0],
		newDraft,
		...(draftId ? { draftId } : {}),
		...(description !== undefined ? { description } : {}),
		apiUrl: normalizeApiUrl(apiUrl)
	};
}

function takeFlag(tokens: string[], flag: string): boolean {
	const indexes = tokens.flatMap((token, index) =>
		token === flag ? [index] : []
	);
	if (indexes.length > 1)
		throw new UsageError(`${flag} can only be provided once.`);
	if (indexes.length === 0) return false;
	tokens.splice(indexes[0]!, 1);
	return true;
}

function readOption(tokens: string[], option: string): string | undefined {
	let value: string | undefined;
	for (let index = 0; index < tokens.length; index += 1) {
		const token = tokens[index]!;
		if (token === option || token.startsWith(`${option}=`)) {
			if (value !== undefined)
				throw new UsageError(`${option} can only be provided once.`);
			const inlineValue = token.startsWith(`${option}=`)
				? token.slice(option.length + 1)
				: undefined;
			const nextValue = inlineValue ?? tokens[index + 1];
			if (
				!nextValue ||
				(inlineValue === undefined && nextValue.startsWith('-'))
			) {
				throw new UsageError(`${option} requires a value.`);
			}
			value = nextValue;
			tokens.splice(index, inlineValue === undefined ? 2 : 1);
			index -= 1;
		}
	}
	return value;
}

function assertNoArguments(tokens: readonly string[]): void {
	if (tokens.length > 0)
		throw new UsageError(`Unexpected argument: ${tokens[0]}`);
}

function normalizeApiUrl(value: string): string {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new UsageError(`Invalid API URL: ${value}`);
	}
	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		throw new UsageError('The API URL must use http or https.');
	}
	url.pathname = url.pathname.replace(/\/+$/, '');
	url.search = '';
	url.hash = '';
	return url.toString().replace(/\/$/, '');
}

export const help = `pp — publish an HTML file

Usage:
  pp <file> [options]
  pp upload <file> [options]
  pp auth login [--api-url <url>]
  pp auth logout [--api-url <url>]
  pp whoami [--json] [--api-url <url>]
  pp list [--json] [--api-url <url>]

Upload options:
  --new                 Start a new draft for this file
  --draft <id>          Upload a new version of a specific draft
  --description <text>  Describe the draft
  --api-url <url>       Use a different pp server (or set PP_API_URL)

Examples:
  pp ./plan.html
  pp upload ./plan.html --description "Checkout redesign"
  pp ./plan.html --new
`;
