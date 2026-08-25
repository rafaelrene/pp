# pp

Publish a self-contained HTML file and get a public URL.

```sh
npx @rraf/pp ./plan.html
```

Running the command for the first time opens a browser for Shoo sign-in. Running it again for the same local file publishes a new version at the same URL.

## Develop

[mise](https://mise.jdx.dev/) pins Node and pnpm for the repository:

```sh
mise trust
mise install
pnpm install
cp .env.example .env
pnpm dev
```

The CLI defaults to `https://plans.rafr.dev`. Exercise it against the local site with:

```sh
pnpm --filter @rraf/pp dev -- ./plan.html --api-url http://localhost:5173
```

Useful workspace commands:

```sh
pnpm format
pnpm lint
pnpm check
pnpm test
pnpm build
```

## CLI

```sh
npx @rraf/pp ./plan.html       # publish, or update this file's draft
npx @rraf/pp ./plan.html --new # publish it as a separate draft
npx @rraf/pp auth login
npx @rraf/pp whoami
npx @rraf/pp list
```

Run `npx @rraf/pp --help` for every option. Credentials are stored in `~/.pp/credentials.json`; stable local file-to-draft mappings are stored in `~/.pp/drafts.json`. Both files are created with owner-only permissions.

## Release the CLI

CLI releases use conventional squash-merge titles. Release Please considers
only commits that touch `packages/cli`.

| Pull request title                                    | Version change before 1.0 |
| ----------------------------------------------------- | ------------------------- |
| `feat(cli): add JSON output`                          | Minor                     |
| `fix(cli): handle an empty file`                      | Patch                     |
| `perf(cli): reduce startup time`                      | Patch                     |
| `feat(cli)!: change authentication`                   | Minor                     |
| `docs`, `chore`, `refactor`, `test`, `build`, or `ci` | None unless breaking      |

To publish:

1. Merge the normal CLI pull request after CI passes.
2. Review the draft release pull request that Release Please creates or updates.
3. Click **Ready for review** to start CI, then squash-merge after it passes.
4. The release workflow creates `vX.Y.Z` and publishes the same version to npm.

Several CLI pull requests can accumulate in one release pull request. To publish
`1.0.0`, include `Release-As: 1.0.0` in the normal pull request body.

If npm publishing fails after GitHub creates the release, rerun only the failed
`Publish to npm` job. If a broken version reaches npm, deprecate it and publish a
patch rather than trying to reuse or unpublish the version.

The npm package must trust the GitHub Actions workflow `release.yml` for the
`rafaelrene/pp` repository, with no environment and `npm publish` allowed. npm
publishes through OIDC, so GitHub must not store an npm token.

## Configuration

The web app reads these environment variables:

| Variable                  | Required   | Purpose                                                                                                                                                                   |
| ------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ORIGIN`                  | Production | Canonical adapter-node origin used for login callbacks and returned links, for example `https://plans.rafr.dev`.                                                          |
| `SESSION_SECRET`          | Production | At least 32 random characters used to sign browser sessions. Generate one with `openssl rand -base64 32`.                                                                 |
| `DATABASE_PATH`           | Production | Absolute SQLite path on persistent storage, for example `/data/pp.sqlite`.                                                                                                |
| `ALLOWED_EMAILS`          | Production | Comma-separated Shoo email allowlist. Existing sessions and API keys are checked against it on every request.                                                             |
| `ALLOW_ANONYMOUS_UPLOADS` | No         | Defaults to enabled in development and disabled in production.                                                                                                            |
| `SHOO_BASE_URL`           | No         | Shoo server; defaults to `https://shoo.dev`.                                                                                                                              |
| `MAX_HTML_BYTES`          | No         | Maximum upload size in bytes; defaults to `524288` (512 KiB).                                                                                                             |
| `BODY_SIZE_LIMIT`         | No         | Adapter request-body ceiling. Keep this above `MAX_HTML_BYTES`; defaults to `2M` in the container.                                                                        |
| `PUBLIC_DRAFT_URL`        | No         | Wildcard public draft origin, for example `https://*.plans.example.com`. Configure matching wildcard DNS and TLS. Without it, drafts use paths on the main public origin. |

For local development, `SESSION_SECRET` has a development fallback and the checked-in example values are sufficient.

## Authentication

The CLI uses a browser-based device flow, so no password is typed into the terminal. It opens a short-lived verification URL, you sign in with Shoo and approve the CLI, then the CLI stores the resulting token under `~/.pp`.

Shoo automatically registers an app from its callback origin. No client ID or client secret is needed. In production, set `ORIGIN` to the exact public HTTPS origin so the callback is `https://plans.rafr.dev/auth/callback`; changing origins creates a distinct Shoo app identity.

The published CLI should target the hosted service by default. To target this deployment explicitly, pass `--api-url https://plans.rafr.dev` or set `PP_API_URL=https://plans.rafr.dev`.

## Deploy

The production topology is one Docker Compose replica on a Debian VM, with
SQLite in a persistent Docker volume and HTTPS terminated by Nginx Proxy Manager
in a separate LXC. Follow [DEPLOYMENT.md](./DEPLOYMENT.md) for the complete
runbook.

## Security model

Draft links are intentionally public but marked as unindexable. Never upload secrets or confidential material. Uploaded HTML is size-limited, rejects active and embedding features such as scripts, event handlers, forms, iframes, and remote CSS URLs, and is served with a restrictive content security policy. Treat uploaded documents as untrusted even with those defenses.
