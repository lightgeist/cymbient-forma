# Cymbient Forma — team pilot

Adapted from [Sheet](https://github.com/DeepanshuMishraa/sheet) under AGPL-3.0-or-later. This is a working browser design editor, not yet feature-equivalent to Figma.

## Architecture

```text
Cloudflare DNS/TLS -> Cloudflare Tunnel -> rack loopback :4184
  -> Bun server (React/Vite web editor + oRPC/MCP + SSE)
    -> persistent Docker SQLite volume
```

## Production deploy

- Run from /srv/atlas/cymbient-forma on the rack.
- Create the ignored file `deploy/secrets/forma.env` with strong, separate `FORMA_TEAM_PASSWORD` (20+ characters) and `FORMA_MCP_TOKEN` (32+ characters). File mode 600.
- `docker compose -f deploy/docker-compose.yml up -d --build`
- Check unauthenticated /app 401; authenticated /app 200; unauthenticated /mcp 404; /ready 200.
- Tunnel credentials/configuration are kept outside Git and the Cloudflare Tunnel uses forma.aifpd.com.
- Connect users through HTTPS only. Basic username is `team`. Password is the rack secret; avoid publishing credentials.

## Safety and limitations

The team credential is a coarse perimeter. **There are no individual accounts, SSO, per-file ACLs, organizational workspaces, or named real-time cursors.** Every authorized user currently edits the single upstream `local` database. Do not invite external clients or store sensitive client designs until identity and permissions are implemented and verified. MCP requires a separate bearer token, and host-specific agent install routes are blocked.

The app can create/edit structured web-native designs with history, drafts, exports, and agents. It is not currently a full substitute for Figma's multiplayer, shared component libraries, plugins, Figma import, vector/pen tooling, approvals, teams and dev handoff. Decide replacement only after real team workflows pass.

## Operation and backup

- `docker compose -f deploy/docker-compose.yml logs --tail 100 forma`
- SQLite persists in Docker volume `cymbient-forma_forma-data`.
- Back up with SQLite online backup or stop container before copying the db and WAL. Reopen a created design after container restart to verify recovery.
- Source access in app sidebar points to https://github.com/lightgeist/cymbient-forma. Keep public repository current for AGPL compliance.
