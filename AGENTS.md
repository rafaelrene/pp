# pp

`pp` is a small service and CLI for publishing a local HTML file and receiving a public URL. The CLI authenticates through a browser using Shoo. Re-uploading the same local file creates a new version at the same URL, and authenticated drafts appear in the web dashboard.

## Core principles

- Prefer the smallest model that makes correct behavior unsurprising. Do not preserve complexity or add machinery for appearance.
- Honor the requested intent in a minimal, realistic way. Pair careful preparation with YAGNI, and propose bold improvements when they remove real complexity.
- Treat uploaded HTML as untrusted while supporting self-contained inline scripts. Keep external scripts, event-handler attributes, forms, iframes, embeds, meta refresh, unsafe URLs, and CSS network URLs forbidden.
- Preserve uploaded HTML bytes exactly when serving drafts. Keep validation and CSP behavior in sync.
- Keep browser sessions `HttpOnly` and keep draft-script connections blocked with `connect-src 'none'`. Inline scripts may use normal same-origin browser storage.
- Authorize anonymous drafts with their edit token. An authenticated update with the correct edit token claims the draft and retires anonymous access.

## Glossary

- Draft: A published HTML document whose stable public URL points to its current version.
- Edit token: The secret that authorizes updates to an anonymous draft until an authenticated user claims it.
- Shoo: The OAuth provider used for browser identity and the CLI pairing flow.
- Version: An immutable upload stored under a draft while the draft URL continues to resolve to the newest upload.

## Code guide

- `apps/web` contains the SvelteKit application, HTTP API, dashboard, authentication, HTML serving, and SQLite persistence.
- `packages/cli` contains the dependency-free TypeScript CLI published as `@rraf/pp` and invoked with `npx @rraf/pp`. Keep it separately publishable.
- `Dockerfile` and `compose.yml` define a single-replica deployment with persistent SQLite storage.
- The stack is SvelteKit, Svelte 5 runes, async Svelte, experimental remote functions, TypeScript, Vite, Valibot, `jose`, `parse5`, and Node's built-in `node:sqlite`.
- The repository uses pnpm workspaces, Vitest, ESLint, Prettier, `svelte-check`, and `@sveltejs/adapter-node`. `mise` pins Node and pnpm.
- Shoo OAuth uses PKCE for browser identity and a short-lived CLI pairing flow.
- Use remote queries and commands for first-party dashboard communication. Keep stable `+server.ts` endpoints for the external CLI API and raw HTML responses.
- Avoid `any`. Prefer inferred types and idiomatic TypeScript. Do not add one-line casting wrappers.
- Use type safety where it helps and write TypeScript in the style expected from an experienced TypeScript developer.
- Use concise comments for behavior and usage, and keep them synchronized with the code.
- When looking up how a function or library works, use the `btca-local` skill.
- If the project does not specify a stack, prefer SvelteKit, Convex, Vite, pnpm, and Tailwind. For more complex apps, prefer Clerk and ArkType.

## Commands

- `mise exec -- pnpm format`: Format the workspace.
- `mise exec -- pnpm lint`: Run workspace linting.
- `mise exec -- pnpm check`: Run TypeScript and Svelte checks.
- `mise exec -- pnpm test`: Run workspace tests.
- `mise exec -- pnpm build`: Build all packages.
- `mise exec -- pnpm dev`: Start the web app for local development.

## Project preferences

- Rene is a senior web developer who prefers ambitious ideas, simple systems, type safety, and YAGNI.
- Be extremely concise. Interview Rene until choices are resolved when a task has material ambiguity.
- Present plans as actions followed by unresolved questions. After implementation, suggest useful next steps.
- Questions are read-only. Answer and offer a change, then wait for approval, even when the change is trivial.
- Call out any conflict with these instructions and get human approval before breaking one.
- Be careful with destructive actions that Rene did not explicitly request.
- Do not spawn agents for work one agent can finish in one pass. When agents work in parallel, assign non-overlapping file ownership first.
- Do not commit or push unless Rene explicitly asks. Inspect history when it helps ground the work.

## Footguns

- Inline `<script>` elements are the only added active-content exception. Reject `<script src>` and keep the CSP permission limited to inline script elements.
- Uploaded scripts run on the draft origin and can use `localStorage` and `sessionStorage`. Do not expose the `HttpOnly` authentication cookie or loosen `connect-src 'none'` without a new security decision.
- Public draft links are unindexable but not private. Never upload secrets or confidential material.
- Production requires a persistent SQLite volume and exactly one app replica.
- Do not commit generated SQLite data, credentials, build output, or environment files.
- Run project commands through the Node and pnpm versions pinned by `mise` in `.mise.toml`.

## Task completion requirements

- After code changes, run formatting, linting, and tests. Run checks and a build when the affected area warrants them.
- Keep tests focused on meaningful behavior. Do not add piles of regression or smoke tests.
- Verify that accepted HTML, validation rules, and the served CSP agree, especially when changing active-content behavior.
- Do not commit or push as part of task completion unless explicitly requested.
