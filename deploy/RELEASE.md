# Cymbient Forma — production pilot v0.1

Deployed 2026-10-26, based on [DeepanshuMishraa/sheet](https://github.com/DeepanshuMishraa/sheet) (AGPL-3.0-or-later). Corresponding public source: https://github.com/lightgeist/cymbient-forma

## Live architecture

```text
Team browser -> Cloudflare DNS + HTTPS (forma.aifpd.com)
  -> Cloudflare Tunnel (systemd --user, rack)
    -> http://127.0.0.1:4184
      -> Bun 1.4 hosted web SPA + typed API + SSE + protected MCP
        -> SQLite /srv/atlas/cymbient-forma-release/data/forma.db
```

The Mac is the authoring/deployment workstation. The rack hosts the app and database. We deliberately use Bun as a user service instead of a Docker image: two Docker builds stalled due severe host I/O pressure at final image assembly, while the native Bun build passed.

## Where it runs

- Rack source: /srv/atlas/cymbient-forma-release (GitHub branch main).
- Bun executable: /home/agent/.local/bin/bun (v1.4.0).
- Editor systemd user service: cymbient-forma.service.
- Tunnel systemd user service: cymbient-forma-tunnel.service.
- Frontend bundle: apps/desktop/dist/app.
- Persisted designs: data/forma.db (+ WAL/SHM).
- Credentials: deploy/secrets/forma.env on the rack only, ignored from Git; mode 0600.
- Cloudflare tunnel credential: /srv/atlas/cymbient-forma/deploy/secrets/tunnel.json, kept outside Git.
- Public URL: https://forma.aifpd.com

## Operations

```sh
cd /srv/atlas/cymbient-forma-release
git pull --ff-only
/home/agent/.local/bin/bun install --frozen-lockfile
VITE_FORMA_WEB=true /home/agent/.local/bin/bun run --cwd apps/desktop build:app
XDG_RUNTIME_DIR=/run/user/1005 systemctl --user restart cymbient-forma.service
XDG_RUNTIME_DIR=/run/user/1005 systemctl --user status cymbient-forma.service
journalctl --user -u cymbient-forma.service -n 100 --no-pager
curl https://forma.aifpd.com/ready
```

For a consistent SQLite backup without stopping the app, Python sqlite3.backup() can create a database snapshot from data/forma.db. Verify restoration by reopening a saved file.

## Authentication and team rollout

- Unauthenticated /app returns HTTP 401, while /mcp returns HTTP 404 without an independent Bearer token. /ready is open for health checks.
- Basic Auth username: team. Password is in the rack-only ignored secrets file. Share via a password manager; do not post it in a public repository.
- The current shared gateway is only a limited internal pilot; it is NOT SSO or individual authorization. All authenticated designers use the upstream single local workspace. There are no file-level ACLs, organization identities, or reliable concurrent co-editing semantics.
- Avoid confidential client projects until SSO, membership checks, tenant isolation, and audit trail are complete.

## Evidence

Tested end to end through Chrome against public HTTPS: login, dashboard, create file, reload persisted file, reopen, and second browser. No JS errors reported in this journey. Rack user service restart + SQLite row count confirmed persistence. Public /ready=200 and unauthenticated /app=401 after restart.

See docs/evidence/prod-*.png, docs/evidence/prod-e2e-result.json and recorded .webm screen captures for the tested flows. Note that design editing operations (frame/text insertion) and export workflows remain to be separately validated before wider rollout.

## Figma replacement gap

Not yet at parity: individual accounts/SSO, organizations, team projects, robust real-time co-editing and presence, shared component systems, comments/review/approvals, plugins, vector editing, Figma import, design-to-dev handoff, scalable asset storage, permissions and audit.
