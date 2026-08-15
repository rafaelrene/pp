import { describe, expect, it, vi } from 'vitest';

const checkDatabase = vi.hoisted(() => vi.fn());

vi.mock('#lib/server/database.js', () => ({ checkDatabase }));

import { GET } from '../src/routes/healthz/+server';

describe('GET /healthz', () => {
	it('checks SQLite before reporting healthy', async () => {
		const response = await GET({} as Parameters<typeof GET>[0]);

		expect(checkDatabase).toHaveBeenCalledOnce();
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
	});
});
