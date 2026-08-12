import type { Session } from '$lib/server/session';

declare global {
	namespace App {
		interface Error {
			message: string;
		}
		interface Locals {
			session: Session | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
