import { describe, expect, it } from 'vitest';
import { signValue, verifyValue } from '#lib/server/crypto.js';

describe('signed values', () => {
	it('round-trips an unexpired payload', () => {
		const token = signValue({ accountId: 'acct_123' }, 'test-secret', 60);
		expect(verifyValue(token, 'test-secret')).toMatchObject({
			accountId: 'acct_123'
		});
	});

	it('rejects tampering and expiry', () => {
		const token = signValue({ accountId: 'acct_123' }, 'test-secret', 60);
		expect(verifyValue(`${token}x`, 'test-secret')).toBeNull();
		expect(
			verifyValue(signValue({ ok: true }, 'test-secret', -1), 'test-secret')
		).toBeNull();
	});
});
