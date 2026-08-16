import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { run } from '../src/index.js';

const previousConfigDirectory = process.env.PP_CONFIG_DIR;
let configDirectory: string | undefined;
let server: Server | undefined;

afterEach(async () => {
	vi.restoreAllMocks();
	const runningServer = server;
	if (runningServer?.listening) {
		await new Promise<void>((resolve, reject) =>
			runningServer.close((error) => (error ? reject(error) : resolve()))
		);
	}
	server = undefined;
	if (configDirectory) await rm(configDirectory, { recursive: true });
	configDirectory = undefined;
	if (previousConfigDirectory === undefined) delete process.env.PP_CONFIG_DIR;
	else process.env.PP_CONFIG_DIR = previousConfigDirectory;
});

describe('upload', () => {
	it('replaces a remembered draft that no longer exists', async () => {
		const requests: Record<string, unknown>[] = [];
		let apiUrl = '';
		server = createServer(async (request, response) => {
			const chunks: Buffer[] = [];
			for await (const chunk of request) chunks.push(Buffer.from(chunk));
			const body: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
			if (!isRecord(body)) throw new Error('Expected an upload body.');
			requests.push(body);

			response.setHeader('content-type', 'application/json');
			if (body.draftId) {
				response.statusCode = 404;
				response.end(JSON.stringify({ error: 'Draft not found.' }));
				return;
			}
			response.statusCode = 201;
			response.end(
				JSON.stringify({
					draftId: 'newdraft1234',
					version: 1,
					url: `${apiUrl}/d/newdraft1234`
				})
			);
		});
		await listen(server);
		const address = server.address();
		if (!address || typeof address === 'string')
			throw new Error('Expected a TCP server address.');
		apiUrl = `http://127.0.0.1:${address.port}`;

		configDirectory = await mkdtemp(join(tmpdir(), 'pp-cli-upload-'));
		process.env.PP_CONFIG_DIR = configDirectory;
		const file = join(configDirectory, 'plan.html');
		await writeFile(file, '<h1>Plan</h1>');
		await writeFile(
			join(configDirectory, 'drafts.json'),
			JSON.stringify({
				version: 1,
				drafts: {
					[file]: {
						apiUrl,
						draftId: 'olddraft1234'
					}
				}
			})
		);
		await writeFile(
			join(configDirectory, 'credentials.json'),
			JSON.stringify({
				version: 1,
				servers: { [apiUrl]: { token: 'api-token' } }
			})
		);
		vi.spyOn(console, 'log').mockImplementation(() => undefined);

		await run([file, '--api-url', apiUrl]);

		expect(requests).toHaveLength(2);
		expect(requests[0]).toMatchObject({
			draftId: 'olddraft1234'
		});
		expect(requests[0]).not.toHaveProperty('editToken');
		expect(requests[1]).not.toHaveProperty('draftId');
		expect(
			JSON.parse(await readFile(join(configDirectory, 'drafts.json'), 'utf8'))
		).toEqual({
			version: 1,
			drafts: { [file]: { apiUrl, draftId: 'newdraft1234' } }
		});
	});
});

async function listen(server: Server): Promise<void> {
	await new Promise<void>((resolve, reject) => {
		server.once('error', reject);
		server.listen(0, '127.0.0.1', resolve);
	});
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}
