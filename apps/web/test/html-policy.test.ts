import { describe, expect, it } from 'vitest';
import { validateHtml } from '#lib/server/html-policy.js';

describe('HTML upload policy', () => {
	it('accepts a self-contained static document', () => {
		expect(
			validateHtml(`<!doctype html><html><head><style>body { color: #222 }</style></head>
			<body><h1>Plan</h1><img src="data:image/svg+xml,%3Csvg/%3E" alt=""></body></html>`)
		).toEqual({ ok: true });
	});

	it.each([
		['scripts', '<script>alert(1)</script>'],
		['event handlers', '<button onclick="alert(1)">Open</button>'],
		['forms', '<form action="https://example.com"><input></form>'],
		['embedded pages', '<iframe src="https://example.com"></iframe>'],
		[
			'meta redirects',
			'<meta http-equiv="refresh" content="0; url=https://example.com">'
		],
		[
			'CSS requests',
			'<style>body { background: url(https://example.com/x) }</style>'
		]
	])('rejects %s', (_, html) => {
		const result = validateHtml(html);
		expect(result.ok).toBe(false);
	});
});
