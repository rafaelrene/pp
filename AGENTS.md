# pp

`pp` is a small service and CLI for publishing a local HTML file and receiving a public URL. The CLI authenticates through a browser using Shoo. Re-uploading the same local file creates a new version at the same URL, and authenticated drafts appear in the web dashboard.

## Repository

- `apps/web` — SvelteKit application, HTTP API, dashboard, authentication, HTML serving, and SQLite persistence.
- `packages/cli` — dependency-free TypeScript CLI published as `@rraf/pp` and invoked with `npx @rraf/pp`.
- `Dockerfile` and `compose.yml` — single-replica container deployment with persistent SQLite storage.

## Technologies

- SvelteKit, Svelte 5 runes, async Svelte, and experimental remote functions.
- TypeScript, Vite, Valibot, `jose`, and `parse5`.
- Node's built-in `node:sqlite`; production requires a persistent volume and one app replica.
- Shoo OAuth with PKCE for browser identity and a short-lived CLI pairing flow.
- pnpm workspaces with Node and pnpm managed by `mise` through `.mise.toml`.
- Vitest, ESLint, Prettier, `svelte-check`, and `@sveltejs/adapter-node`.

## Project conventions

- Run project commands through the runtimes pinned by `mise`, for example `mise exec -- pnpm test`.
- Use remote queries and commands for first-party dashboard communication. Keep stable `+server.ts` endpoints for the external CLI API and raw HTML responses.
- Keep the CLI dependency-free and separately publishable.
- Treat uploaded HTML as untrusted. Preserve exact uploaded bytes when serving drafts and keep the validation policy and restrictive CSP in sync.
- Anonymous drafts are authorized by their edit token. An authenticated update with the correct edit token claims the draft and retires anonymous access.
- Do not commit generated SQLite data, credentials, build output, or environment files.

## General preferences

Rene is a senior web developer who likes ambitious ideas, simple systems, and software that feels obvious. Do not preserve complexity just because it already exists or introduce machinery because it looks architecturally impressive. Understand the real constraint, then prefer the smallest model that makes correct behavior unsurprising.

- Be extremely concise.
- Interview Rene deeply until shared understanding is reached when choices are genuinely unresolved.
- Honor the intent in a minimal and realistic fashion.
- If a rule here fights the task, call it out clearly and get human sign-off before breaking it.

## Plans

- Present plans as actions followed by unresolved questions.
- After implementing the current plan, suggest useful possible next steps.

## Coding

- Keep things simple. Channel both “measure twice, cut once” and YAGNI unless explicitly instructed otherwise.
- Use type safety where it helps.
- Propose bold ideas when they can meaningfully improve the work.
- Be careful with destructive actions that were not explicitly requested.
- After code changes, run format, lint, and tests.
- Tests should be focused. Do not create piles of regression or smoke-test slop.
- Use concise comments to clarify behavior and usage, not to narrate every line.
- Keep comments synchronized with the implementation.
- When looking up how a function or library works, use the `btca-local` skill.

### TypeScript

- `any` is the enemy.
- Prefer inferred types so systems adapt to change without duplicated annotations everywhere.
- Write idiomatic TypeScript, not TypeScript shaped like Python.
- Avoid one-line functions that exist only to cast a value.
- Write TypeScript in a way Matt Pocock would be proud of.
- When the project does not already specify a stack, prefer SvelteKit, Convex, Vite, pnpm, and Tailwind.
- For more complex apps, prefer Clerk and ArkType.

## Questions are read-only

- A question asks for an answer, not a change. If a message opens with “How hard would it be,” “What are your thoughts,” “Why does,” “Should we,” “Is it possible,” “Can X do Y,” or otherwise asks rather than instructs, answer it without editing files.
- Even when the answer is obvious and the change is trivial, answer first, offer the change, and wait for approval.

## Match ceremony to the task

- Do not spawn a sub-agent or multi-agent panel for work one agent can finish in one pass. Delegate for breadth or adversarial review, not ordinary tasks.
- When multiple agents work in parallel, state file ownership up front so their changes cannot collide.

## Git

- Do not commit or push unless explicitly instructed.
- Inspect commits, history, and changes when useful for grounding the work.
