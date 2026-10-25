#!/usr/bin/env python3
"""Consistent, atomic SQLite backups for the Forma user service."""
from __future__ import annotations

import fcntl
import json
import os
import sqlite3
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATABASE = Path(os.environ.get("FORMA_DB_PATH", str(ROOT / "data/forma.db")))
BACKUPS = ROOT / "backups"
RETAIN = 14


def backup() -> None:
    os.umask(0o077)
    BACKUPS.mkdir(mode=0o700, exist_ok=True)
    os.chmod(BACKUPS, 0o700)
    lock_path = BACKUPS / ".backup.lock"
    with lock_path.open("a+b") as lock:
        fcntl.flock(lock.fileno(), fcntl.LOCK_EX)
        if not DATABASE.is_file():
            raise SystemExit("Source database missing: " + str(DATABASE))
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        target = BACKUPS / ("forma-" + stamp + ".sqlite")
        temporary = BACKUPS / (".incomplete-" + stamp + "-" + str(os.getpid()))
        source = None
        dest = None
        try:
            source = sqlite3.connect(DATABASE.resolve().as_uri() + "?mode=ro", uri=True, timeout=30)
            dest = sqlite3.connect(temporary, timeout=30)
            source.backup(dest, pages=512, sleep=0.15)
            result = dest.execute("PRAGMA integrity_check").fetchone()[0]
            if result != "ok":
                raise RuntimeError("Backup integrity failed: " + result)
            designs = dest.execute("SELECT COUNT(*) FROM design").fetchone()[0]
            dest.close()
            dest = None
            source.close()
            source = None
            os.chmod(temporary, 0o600)
            os.replace(temporary, target)
            with target.open("rb") as durable:
                os.fsync(durable.fileno())
            snapshots = sorted(BACKUPS.glob("forma-*.sqlite"), reverse=True)
            for obsolete in snapshots[RETAIN:]:
                obsolete.unlink()
            print(json.dumps({
                "status": "ok",
                "backup": str(target),
                "size_bytes": target.stat().st_size,
                "design_count": designs,
                "integrity": result,
                "retained_snapshots": min(len(snapshots), RETAIN),
            }))
        finally:
            if dest is not None:
                dest.close()
            if source is not None:
                source.close()
            if temporary.exists():
                temporary.unlink()


if __name__ == "__main__":
    backup()