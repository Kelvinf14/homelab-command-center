# HomeLab Command Center

A Dockerized, single-pane command center for Unraid home labs. It merges the everyday value of Beszel, Tracearr, Speedtest Tracker, Uptime Kuma, and Docker monitoring into one modern dashboard.

The app is read-only by default, stores persistent data in SQLite under `/app/data`, and keeps all secrets on the server side.

HomeLab Command Center does not ship with demo mode. Unconfigured providers show `Not configured`; configured providers that cannot be reached show `Unavailable` with the connection error.

## Features

- Overview dashboard with health score, status summaries, incidents, and a prioritized needs-attention panel
- Docker container inventory from `/var/run/docker.sock`
- Container preferences: monitored, ignored, critical, or optional
- Flexible warning and alert handling: ignore, mute, or resolve
- Native uptime checks with expected status code, timeout, interval, latency, and SQLite history
- Real Docker status, restart count, healthcheck, ports, labels, network mode, and resource stats where the Docker socket allows it
- Real media integrations for Radarr, Sonarr, Prowlarr, SABnzbd, Transmission, and Plex
- Integration settings for Beszel, Uptime Kuma, Speedtest Tracker, and Tracearr without fake fallback data
- Modular provider architecture for Docker, Beszel, uptime, speedtest, Tracearr, Arr apps, SABnzbd, Transmission, and Plex
- Docker and Docker Compose deployment for Unraid

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

For local development, the app stores SQLite data in `.data/app.db` unless `DATABASE_PATH` is set. If you copy `.env.example` locally, set `DATABASE_PATH=.data/app.db`.

## Environment

Copy the example file and edit it:

```bash
cp .env.example .env
```

Defaults:

```env
TZ=Asia/Jakarta
ENABLE_ACTIONS=false
DATABASE_PATH=/app/data/app.db
```

`ENABLE_ACTIONS=false` keeps Docker control actions disabled. Restart buttons only work when `ENABLE_ACTIONS=true`.

Provider URLs, API keys, tokens, and credentials are configured in the Settings page and stored in SQLite at `DATABASE_PATH`. They are not exposed through the frontend API.

## Docker Compose

```bash
docker compose up -d --build
```

The compose file maps:

- `8095:3000`
- `../data:/app/data`
- `/var/run/docker.sock:/var/run/docker.sock:ro`

The image runs as root by default so it can read Unraid's `root:docker` Docker socket without privileged mode. The socket should still be mounted read-only unless you intentionally enable control actions.

## GitHub Container Registry

Pushing to `main` builds the Dockerfile from the repository root and publishes:

```bash
ghcr.io/kelvinf14/homelab-command-center:latest
ghcr.io/kelvinf14/homelab-command-center:<git-commit-sha>
```

The workflow lives at `.github/workflows/docker-publish.yml` and uses GitHub Actions package write permissions for GHCR.

## Unraid Install

Create a private GitHub repository named `homelab-command-center`, push this source code, then run these commands on Unraid:

```bash
mkdir -p /mnt/user/appdata/homelab-command-center
cd /mnt/user/appdata/homelab-command-center
git clone https://github.com/YOUR_USERNAME/homelab-command-center.git source
cd source
cp .env.example .env
mkdir -p ../data
docker compose up -d --build
```

Persistent data should live at:

```bash
/mnt/user/appdata/homelab-command-center/data
```

Source should live at:

```bash
/mnt/user/appdata/homelab-command-center/source
```

## Unraid GUI Install

After the GitHub Actions workflow publishes the image, add it through the Unraid Docker UI with these fields:

```text
Name: HomeLab Command Center
Repository: ghcr.io/kelvinf14/homelab-command-center:latest
WebUI: http://[IP]:[PORT:3000]
```

Extra Parameters:

```text
--user 0:0
```

The image already runs as root by default, but this is useful if Unraid or a template overrides the user and Docker socket reads fail.

Port mapping:

```text
Host 8095 -> Container 3000 TCP
Container Port: 3000
Host Port: 8095
Protocol: TCP
```

Path mappings:

```text
Container Path: /app/data
Host Path: /mnt/user/appdata/homelab-command-center/data
Access Mode: Read/Write
Host /mnt/user/appdata/homelab-command-center/data -> Container /app/data RW

Container Path: /var/run/docker.sock
Host Path: /var/run/docker.sock
Access Mode: Read Only
Host /var/run/docker.sock -> Container /var/run/docker.sock RO
```

Environment variables:

```env
TZ=Asia/Jakarta
ENABLE_ACTIONS=false
DATABASE_PATH=/app/data/app.db
```

Do not enable Privileged mode for normal use. Docker socket access only needs the read-only socket path mapping above.

## Provider Setup

Open Settings after the container starts and add the integrations you actually use:

- Radarr and Radarr-4K: base URL, API key, display name
- Sonarr: base URL and API key
- Prowlarr: base URL and API key
- SABnzbd: base URL and API key
- Transmission: base URL plus username/password when required
- Plex: base URL and token
- Native uptime checks: name, URL, expected status code, timeout, interval, enabled/disabled
- Beszel, Speedtest Tracker, Uptime Kuma, and Tracearr: configure when their API details are available

No provider shows made-up data. Empty pages mean the provider is not configured or did not return usable data.

## Update From GitHub

```bash
cd /mnt/user/appdata/homelab-command-center/source
git pull
docker compose up -d --build
```

## Backup

Back up this directory:

```bash
/mnt/user/appdata/homelab-command-center/data
```

Do not store the SQLite database inside the git repo. The app can be rebuilt safely without deleting user data because the database lives outside the source directory.

## Security Notes

- Keep the GitHub repository private.
- Do not commit `.env`, API keys, SQLite databases, or `node_modules`.
- Docker socket is mounted read-only by default.
- Control actions are disabled unless `ENABLE_ACTIONS=true`.
- The app assumes LAN or reverse-proxy access, not public internet exposure.

## Troubleshooting

### `connect EACCES /var/run/docker.sock`

This means the container process cannot read the mounted Docker socket. On Unraid the socket is usually:

```bash
/var/run/docker.sock
```

owned by `root:docker`. The image runs as root by default and does not require privileged mode. Confirm the Unraid template has:

```text
Host Path: /var/run/docker.sock
Container Path: /var/run/docker.sock
Access Mode: Read Only
```

If the error still appears, add this to Unraid Docker template Extra Parameters:

```text
--user 0:0
```

Then apply the template and restart the container.
