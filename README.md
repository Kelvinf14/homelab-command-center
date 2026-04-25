# HomeLab Command Center

A Dockerized, single-pane command center for Unraid home labs. It merges the everyday value of Beszel, Tracearr, Speedtest Tracker, Uptime Kuma, and Docker monitoring into one modern dashboard.

The app is read-only by default, stores persistent data in SQLite under `/app/data`, and keeps all secrets on the server side.

## Features

- Overview dashboard with health score, status summaries, incidents, and a prioritized needs-attention panel
- Docker container inventory from `/var/run/docker.sock`
- Container preferences: monitored, ignored, critical, or optional
- Flexible warning and alert handling: ignore, mute, or resolve
- Native uptime checks with latency and history
- Beszel-style server metrics page with mock data until configured
- Speedtest Tracker-style speed page with placeholder data until configured
- Tracearr-inspired media pipeline page with placeholder provider data
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

## Docker Compose

```bash
docker compose up -d --build
```

The compose file maps:

- `8095:3000`
- `../data:/app/data`
- `/var/run/docker.sock:/var/run/docker.sock:ro`

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

Port mapping:

```text
Container Port: 3000
Host Port: 8095
Protocol: TCP
```

Path mappings:

```text
Container Path: /app/data
Host Path: /mnt/user/appdata/homelab-command-center/data
Access Mode: Read/Write

Container Path: /var/run/docker.sock
Host Path: /var/run/docker.sock
Access Mode: Read Only
```

Environment variables:

```env
TZ=Asia/Jakarta
ENABLE_ACTIONS=false
DATABASE_PATH=/app/data/app.db
```

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
