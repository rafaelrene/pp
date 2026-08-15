# Deploy `pp`

This runbook deploys one `pp` replica to a Debian VM. Nginx Proxy Manager (NPM)
runs in a separate LXC and terminates HTTPS for `plans.rafr.dev`. SQLite lives in
the persistent `pp-data` Docker volume.

Replace the example app VM address (`192.168.1.50`) with its actual static LAN
address. Port 3000 will be reachable from that LAN; this setup intentionally does
not add host firewall rules.

## 1. Install Docker on the app VM

Install Git, Docker Engine, Buildx, and the Compose plugin from Docker's official
Debian repository:

```sh
sudo apt update
sudo apt install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

sudo tee /etc/apt/sources.list.d/docker.sources >/dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/debian
Suites: $(. /etc/os-release && echo "$VERSION_CODENAME")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo docker run --rm hello-world
sudo docker compose version
```

These commands follow Docker's [Debian installation guide](https://docs.docker.com/engine/install/debian/).

## 2. Clone and configure `pp`

Clone the repository into a durable location and enter it:

```sh
cd /opt
sudo git clone YOUR_REPOSITORY_URL pp
sudo chown -R "$(id -un):$(id -gn)" /opt/pp
cd /opt/pp
```

Create the production environment file and generate a session secret:

```sh
cp .env.production.example .env.production
openssl rand -base64 32
chmod 600 .env.production
```

Edit `.env.production`. It should contain:

```dotenv
ORIGIN=https://plans.rafr.dev
SESSION_SECRET=PASTE_THE_GENERATED_SECRET
DATABASE_PATH=/data/pp.sqlite
SHOO_BASE_URL=https://shoo.dev
ALLOWED_EMAILS=skreciprodukcia@gmail.com
ALLOW_ANONYMOUS_UPLOADS=false
MAX_HTML_BYTES=524288
BODY_SIZE_LIMIT=2M
PP_BIND_ADDRESS=192.168.1.50
```

`PP_BIND_ADDRESS` must be the app VM's actual LAN address. Do not use the NPM
LXC address.

## 3. Start the app

Validate the Compose model without printing its resolved secrets, then build and
start it:

```sh
sudo docker compose --env-file .env.production config --quiet
sudo docker compose --env-file .env.production up -d --build
sudo docker compose --env-file .env.production ps
```

Verify the app directly from the VM, using its actual LAN address:

```sh
curl --fail --show-error http://192.168.1.50:3000/healthz
```

The expected response is `{"ok":true}`. If it fails, inspect startup output:

```sh
sudo docker compose --env-file .env.production logs --tail=100 web
```

## 4. Configure Nginx Proxy Manager

Ensure public DNS for `plans.rafr.dev` reaches the NPM LXC, then add a Proxy Host:

- Domain name: `plans.rafr.dev`
- Scheme: `http`
- Forward hostname/IP: the app VM's LAN address
- Forward port: `3000`
- Cache assets: off
- Block common exploits: on
- WebSocket support: off

In the Proxy Host's **Advanced** field, set the proxy request ceiling above the
app's 512 KiB HTML limit:

```nginx
client_max_body_size 2m;
```

On the **SSL** tab, request a Let's Encrypt certificate and enable **Force SSL**.
Save the host, then verify the public route:

```sh
curl --fail --show-error https://plans.rafr.dev/healthz
```

## 5. Verify the release

1. Open `https://plans.rafr.dev`.
2. Sign in as `skreciprodukcia@gmail.com` and confirm the dashboard loads.
3. Confirm another Shoo account is rejected.
4. Pair the local CLI using `--api-url https://plans.rafr.dev`.
5. Publish an HTML file twice and confirm the URL stays stable while its version increments.
6. Delete the draft in the dashboard and confirm its public and versioned URLs return 404.
7. Confirm an anonymous upload returns HTTP 401.

## Deploy an update

From `/opt/pp` on the app VM:

```sh
git pull --ff-only
sudo docker compose --env-file .env.production up -d --build
sudo docker compose --env-file .env.production ps
curl --fail --show-error https://plans.rafr.dev/healthz
```

The named `pp-data` volume survives container replacement. Keep exactly one app
replica; SQLite is the entire persistence model.
