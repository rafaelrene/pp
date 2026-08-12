# pp

Publish a self-contained HTML file and get a public URL.

> [!IMPORTANT]
> `pp` is already owned by someone else on npm. The package uses that name to preserve the intended UX, but do not publish or run the registry command until the name is transferred; use the local development command below in the meantime.

```sh
npx pp ./plan.html
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

The site and the unpublished CLI both default to `http://localhost:5173`. Exercise them together with:

```sh
pnpm --filter pp dev -- ./plan.html
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
npx pp ./plan.html                    # publish, or update this file's draft
npx pp ./plan.html --new              # publish it as a separate draft
npx pp ./plan.html --anonymous        # skip sign-in
npx pp auth login
npx pp whoami
npx pp list
```

Run `npx pp --help` for every option. Credentials are stored in `~/.pp/credentials.json`; stable local file-to-draft mappings are stored in `~/.pp/drafts.json`. Both files are created with owner-only permissions.

## Configuration

The web app reads these environment variables:

| Variable           | Required   | Purpose                                                                                                                                                                   |
| ------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ORIGIN`           | Production | Canonical adapter-node origin, used by default for login callbacks and returned links, for example `https://pp.example.com`.                                              |
| `PUBLIC_BASE_URL`  | No         | Explicit public link and callback origin when it should differ from `ORIGIN`.                                                                                             |
| `SESSION_SECRET`   | Production | At least 32 random characters used to sign browser sessions. Generate one with `openssl rand -base64 32`.                                                                 |
| `DATABASE_PATH`    | Production | SQLite file path. It must live on persistent storage, for example `/data/pp.sqlite`.                                                                                      |
| `SHOO_BASE_URL`    | No         | Shoo server; defaults to `https://shoo.dev`.                                                                                                                              |
| `MAX_HTML_BYTES`   | No         | Maximum upload size in bytes; defaults to `524288` (512 KiB).                                                                                                             |
| `BODY_SIZE_LIMIT`  | No         | Adapter request-body ceiling. Keep this above `MAX_HTML_BYTES`; defaults to `2M` in the container.                                                                        |
| `PUBLIC_DRAFT_URL` | No         | Wildcard public draft origin, for example `https://*.plans.example.com`. Configure matching wildcard DNS and TLS. Without it, drafts use paths on the main public origin. |

For local development, `SESSION_SECRET` has a development fallback and the checked-in example values are sufficient.

## Authentication

The CLI uses a browser-based device flow, so no password is typed into the terminal. It opens a short-lived verification URL, you sign in with Shoo and approve the CLI, then the CLI stores the resulting token under `~/.pp`.

Shoo automatically registers an app from its callback origin. No client ID or client secret is needed. In production, set `ORIGIN` (or the `PUBLIC_BASE_URL` override) to the exact public HTTPS origin so the callback is `https://pp.example.com/auth/callback`; changing origins creates a distinct Shoo app identity.

The published CLI should target the hosted service by default. To use another deployment, pass `--api-url https://pp.example.com` or set `PP_API_URL=https://pp.example.com`.

## Production

Build and run the Node adapter output directly:

```sh
pnpm build
HOST=0.0.0.0 PORT=3000 node apps/web/build
```

Or use the included container:

```sh
docker build -t pp .
docker run --rm -p 3000:3000 \
  -e ORIGIN=https://pp.example.com \
  -e SESSION_SECRET="$(openssl rand -base64 32)" \
  -v pp-data:/data \
  pp
```

The Docker image defaults `DATABASE_PATH` to `/data/pp.sqlite`. On Railway or another container host, mount a persistent volume at `/data`, set `ORIGIN` and `SESSION_SECRET`, and route the platform port to the app. Keep this SQLite deployment to one application replica. Local runtime versions remain pinned by mise; the container uses the matching pinned Node and pnpm versions directly.

## Security model

Draft links are intentionally public. Never upload secrets or confidential material. Uploaded HTML is size-limited, rejects active and embedding features such as scripts, event handlers, forms, iframes, and remote CSS URLs, and is served with a restrictive content security policy. Treat uploaded documents as untrusted even with those defenses.
