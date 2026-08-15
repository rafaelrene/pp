import type { RequestHandler } from './$types';
import { draftResponse } from '#lib/server/draft-response.js';

export const GET: RequestHandler = ({ params }) => draftResponse(params.id);
