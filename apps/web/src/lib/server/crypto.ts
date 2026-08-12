import {
	createHash,
	createHmac,
	randomBytes,
	timingSafeEqual
} from 'node:crypto';

export function randomToken(bytes = 32): string {
	return randomBytes(bytes).toString('base64url');
}

export function sha256(value: string): string {
	return createHash('sha256').update(value).digest('hex');
}

export function signValue(
	payload: Record<string, unknown>,
	secret: string,
	ttlSeconds: number
): string {
	const body = Buffer.from(
		JSON.stringify({
			...payload,
			exp: Math.floor(Date.now() / 1000) + ttlSeconds
		})
	).toString('base64url');
	return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
}

export function verifyValue(
	value: string,
	secret: string
): Record<string, unknown> | null {
	const [body, signature, extra] = value.split('.');
	if (!body || !signature || extra) return null;

	const expected = createHmac('sha256', secret)
		.update(body)
		.digest('base64url');
	const actualBytes = Buffer.from(signature);
	const expectedBytes = Buffer.from(expected);
	if (
		actualBytes.length !== expectedBytes.length ||
		!timingSafeEqual(actualBytes, expectedBytes)
	) {
		return null;
	}

	try {
		const parsed: unknown = JSON.parse(
			Buffer.from(body, 'base64url').toString('utf8')
		);
		if (!isRecord(parsed) || typeof parsed.exp !== 'number') return null;
		return parsed.exp >= Math.floor(Date.now() / 1000) ? parsed : null;
	} catch {
		return null;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}
