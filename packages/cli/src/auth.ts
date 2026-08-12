import { spawn } from 'node:child_process';
import { ApiClient } from './api.js';
import { setToken } from './storage.js';

export async function login(api: ApiClient, apiUrl: string): Promise<string> {
	const request = await api.startCliAuth();
	console.log(`Open ${request.verificationUrl}`);
	console.log(`Enter code: ${request.userCode}`);
	if (openBrowser(request.verificationUrlComplete))
		console.log('Opened your browser to finish signing in.');

	const expiresAt = Date.now() + request.expiresIn * 1000;
	while (Date.now() < expiresAt) {
		await delay(request.interval * 1000);
		const result = await api.pollCliAuth(request.deviceCode);
		if (result.status === 'pending') continue;
		if (result.status === 'denied') throw new Error('Sign-in was denied.');
		if (result.status === 'expired')
			throw new Error('The sign-in code expired. Run the command again.');
		await setToken(apiUrl, result.token);
		console.log('Signed in.');
		return result.token;
	}
	throw new Error('The sign-in code expired. Run the command again.');
}

function openBrowser(url: string): boolean {
	const command =
		process.platform === 'darwin'
			? { executable: 'open', args: [url] }
			: process.platform === 'win32'
				? { executable: 'cmd', args: ['/d', '/s', '/c', 'start', '', url] }
				: { executable: 'xdg-open', args: [url] };
	try {
		const child = spawn(command.executable, command.args, {
			detached: true,
			stdio: 'ignore'
		});
		child.on('error', () => undefined);
		child.unref();
		return true;
	} catch {
		return false;
	}
}

function delay(milliseconds: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
