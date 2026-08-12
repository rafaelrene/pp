import type { RequestHandler } from './$types';
import { draftResponse } from '$lib/server/draft-response';

export const GET: RequestHandler = ({ params }) =>
	draftResponse(params.id, Number.parseInt(params.version, 10));
