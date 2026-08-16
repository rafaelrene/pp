# @rraf/pp

Publish an HTML file and get a public URL.

```sh
npx @rraf/pp ./plan.html
```

The first upload opens a browser for a quick sign-in. Credentials and local draft mappings are stored in `~/.pp`.

Run the same command again to publish a new version at the same URL:

```sh
npx @rraf/pp ./plan.html
```

Use `--new` to start a separate draft. The CLI publishes to
`https://plans.rafr.dev`; set `PP_API_URL` or pass `--api-url` to use another
deployment.

```sh
npx @rraf/pp auth login
npx @rraf/pp whoami
npx @rraf/pp list
npx @rraf/pp auth logout
```
