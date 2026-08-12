# pp

Publish an HTML file and get a public URL.

> The `pp` name is already registered on npm. This package is a local placeholder until the name is transferred or replaced.

```sh
npx pp ./plan.html
```

The first upload opens a browser for a quick sign-in. Credentials and local draft mappings are stored in `~/.pp`.

Run the same command again to publish a new version at the same URL:

```sh
npx pp ./plan.html
```

Use `--new` to start a separate draft, or `--anonymous` to publish without an account. During local development the CLI uses `http://localhost:5173`; set `PP_API_URL` or pass `--api-url` for a deployed server.

```sh
npx pp auth login
npx pp whoami
npx pp list
npx pp auth logout
```
