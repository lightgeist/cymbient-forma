# Cymbient Forma — operations

Canonical public editor: https://forma.aifpd.com  
Corresponding AGPL source: https://github.com/lightgeist/cymbient-forma

## Runtime

- Host: rack llm; run as user agent, not root.
- Checkout: /srv/atlas/cymbient-forma-release
- Managed services: cymbient-forma.service, cymbient-forma-tunnel.service
- Frontend: apps/desktop/dist/app
- Persistent database: data/forma.db (plus SQLite WAL/SHM)
- Auth: Basic username team, private rack file deploy/secrets/forma.env; MCP has a different bearer token.
- Backups: backups/forma-YYYYMMDD-HHMMSS.sqlite; mode 0600, directory 0700, last 14 daily snapshots.
- Backup units: cymbient-forma-backup.service and cymbient-forma-backup.timer

The public gateway is for an internal shared-team pilot. It does not implement SSO, personal identities, team permissions, per-design ACLs, or guaranteed simultaneous multiuser editing. Do not store sensitive third-party client designs until these are implemented and reviewed.

## Check the services

Run on the rack:

~~~bash
export XDG_RUNTIME_DIR=/run/user/1005
export DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1005/bus
systemctl --user status cymbient-forma.service cymbient-forma-tunnel.service
systemctl --user list-timers --all | grep cymbient-forma-backup
curl -fsS https://forma.aifpd.com/ready
~~~

Expected: editor and tunnel active, backup timer enabled, and /ready returns a JSON object with ready=true.

## Backups

Make and validate a consistent snapshot while the editor is running:

~~~bash
cd /srv/atlas/cymbient-forma-release
python3 scripts/backup-forma.py
~~~

The script uses SQLite's online backup API and PRAGMA integrity_check, commits the backup atomically, and deletes older snapshots beyond the 14 most recent. Never copy only the live .db file while SQLite WAL is active.

## Restore

Stop the editor before changing database files; keep the Cloudflare tunnel online:

~~~bash
export XDG_RUNTIME_DIR=/run/user/1005
export DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1005/bus
systemctl --user stop cymbient-forma.service
~~~

Archive the existing data/forma.db, data/forma.db-wal, and data/forma.db-shm together. Verify the chosen snapshot with SQLite PRAGMA integrity_check, then copy it to data/forma.db with owner agent and mode 0600. Retain the archived originals for rollback.

~~~bash
systemctl --user start cymbient-forma.service
curl -fsS https://forma.aifpd.com/ready
~~~

Finish recovery through Chrome using the public URL: sign in, open a saved design, inspect its content, and export HTML/JSON or PNG. Healthy logs are not a substitute for the browser journey.

## Release policy

- Keep deployed source and the public GitHub repository synchronized under AGPL-3.0-or-later.
- Never commit deploy/secrets, production SQLite data, or backup snapshots.
- Validate public login, create, edit, refresh, export, second-browser access, and restart persistence on meaningful changes.
- Check failures using browser errors, Bun logs, public HTTP status, and the last good build before changing code.