# Deploying the PharmaLink backend to a VPS

Written 2026-08-04, when the backend moved off the dev laptop.

## Why this exists

Until now the backend ran on a Windows dev machine and reached phones through
a Cloudflare **quick** tunnel. That works for one developer testing one phone,
and fails for everything else: the quick-tunnel hostname is regenerated every
time `cloudflared` restarts, and the whole thing dies when the laptop sleeps.
With several phones pointed at it, one laptop lid closing takes down everyone.

This moves the stack to a machine that stays up and gives it a hostname that
does not change.

## What you need

- A VPS with **8 GB RAM** (see sizing below), Ubuntu 22.04 or 24.04.
  Hetzner CPX31 (4 vCPU / 8 GB, ~€14/mo) is the right size.
- SSH access to it.
- Nothing else. No domain required.

### Sizing

Both figures below were measured on the dev machine, 2026-08-04:

| | Total across 15 containers |
|---|---|
| Untuned | **~5.4 GB** |
| With `docker-compose.prod.yml` | **~3.6 GB** |

Untuned, each Java service defaults its max heap to ~25% of *host* RAM, so
fourteen JVMs each sat on hundreds of MB of garbage they had no reason to
collect. `MaxRAMPercentage` makes the heap size off the *container* limit
instead — the setting that actually matters under Docker — and SerialGC drops
the collector overhead that G1 carries for no benefit at this heap size.

Two honest caveats on those numbers:

- The 5.4 GB reading came from containers that had been up ~12 hours; the
  3.6 GB reading is from freshly started ones. Some of the gap is accumulated
  garbage that would never have been collected, which is the point — but a
  fresh *untuned* start would also measure lower than 5.4 GB. Treat the
  improvement as real but not precisely 33%.
- 3.6 GB is idle-ish usage, not the ceiling. The `mem_limit` values sum to
  **~6.3 GB**, and limits are caps, not reservations. Under real load services
  can grow toward their individual caps, and nothing stops the total from
  exceeding what a 4 GB host has.

That second point is why this says 8 GB and not 4 GB. A 4 GB box has 3.6 GB of
containers plus the OS plus Docker itself, and the first build has to compile
14 Spring Boot services — Maven will thrash or get OOM-killed. If you want to
run on 4 GB anyway, tighten every `mem_limit` toward the observed column in
`docker stats` and build the images somewhere else, then pull them.

## First deploy

```bash
# 1. On the VPS — install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && exec su -l $USER

# 2. Get the code
git clone <your-repo-url> pharmalink && cd pharmalink

# 3. Configure secrets — see "Secrets" below, do not skip
cp .env.example .env
nano .env

# 4. Point the gateway at loopback so Caddy is the only public entrypoint
echo 'GATEWAY_PORT_BIND=127.0.0.1:8080' >> .env

# 5. Set the public hostname. No domain? Use your server's IP + .sslip.io,
#    which resolves right back to that IP and satisfies Let's Encrypt.
echo "SITE_ADDRESS=$(curl -s ifconfig.me).sslip.io" >> .env

# 6. Firewall — only 80/443 and SSH should be open
sudo ufw allow OpenSSH && sudo ufw allow 80 && sudo ufw allow 443
sudo ufw --force enable

# 7. Build and start
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

The first build compiles 14 Spring Boot services and takes a while. Watch it
settle with `docker compose ps` — every service should reach `running`, and
Postgres `healthy`.

Then confirm TLS works from anywhere:

```bash
curl -i -X POST https://$(grep SITE_ADDRESS .env | cut -d= -f2)/api/auth/login \
  -H 'Content-Type: application/json' -d '{"email":"x@y.z","password":"nope"}'
```

**HTTP 400 is success here.** It means the gateway answered and rejected bad
credentials. A connection error or 502 means the stack is not up yet.

## Secrets

`.env` is gitignored, so the VPS copy is authoritative. At minimum change:

| Variable | Why |
|---|---|
| `DB_PASSWORD` | Default `pharmalink123` is in the compose file and in git. |
| `JWT_SECRET` | Default is a placeholder committed to the repo. Anyone with the repo can mint valid tokens for your API. |
| `MAIL_USERNAME` / `MAIL_PASSWORD` | Gmail App Password for password-reset mail. |

Generate a real JWT secret: `openssl rand -base64 48`

Also confirm `LOG_RESET_CODE` is unset or `false` — it prints password-reset
codes into the logs, which is a dev-only affordance.

> Note: a Google Maps API key is committed in plaintext in
> `frontend/app.json`, and the old `JWT_SECRET`/`DB_PASSWORD` defaults are in
> git history. Treat all three as compromised and rotate them. Changing
> `.env` does not un-leak what is already in the repo's history.

## Pointing the app at it

Once TLS is confirmed, bake the hostname into the build:

```jsonc
// frontend/eas.json
"preview": {
  "distribution": "internal",
  "env": { "EXPO_PUBLIC_API_BASE_URL": "https://<your-ip>.sslip.io" }
}
```

Then `eas build --platform android --profile preview`.

Phones already carrying an older build don't need reinstalling — open
**Server Settings** from the login screen and paste the new URL. That screen
exists precisely so a backend move doesn't require a rebuild.

## Updating after the first deploy

```bash
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Only changed services rebuild. `restart: unless-stopped` means the stack also
comes back by itself after a reboot.

## Backups

Postgres has no published port by design, so back up through the container:

```bash
docker compose exec -T postgres pg_dumpall -U postgres | gzip > backup-$(date +%F).sql.gz
```

Worth a cron entry. All twelve databases live in one container on one volume —
losing it loses everything, and nothing here replicates it anywhere.

## Troubleshooting

**A service restarts in a loop after deploy.** Its `mem_limit` is too low —
the limits in `docker-compose.prod.yml` come from idle measurements, not load
tests. Check with `docker stats`, raise that service, redeploy.

**Caddy won't get a certificate.** Let's Encrypt's HTTP-01 challenge needs
port 80 reachable from the internet. Check `ufw status` and that your provider's
own firewall allows 80/443. `docker compose logs caddy` states the reason.

**Chat connects locally but not through the VPS.** Chat uses a raw WebSocket
upgrade at `/ws`. Caddy passes it through natively, so suspect the gateway's
`chat-service-ws` route or `CHAT_SERVICE_WS_URL` first.

## Known gaps

- **No CI/CD.** Deploys are a manual `git pull` + `up -d` over SSH.
- **Single host, no redundancy.** The VPS is a single point of failure, as was
  the laptop — just a more reliable one.
- **`sslip.io` is a third-party dependency.** If it's down when a certificate
  renewal is due, renewal fails. A real domain (~$3-10/yr) removes this;
  swapping is a one-line `SITE_ADDRESS` change plus an A record.
- **No log aggregation or alerting.** Nothing tells you a service is down
  except the app failing.
