# Database backups

Daily `pg_dump` snapshots of the app's Postgres database, taken automatically
by the `backup` service in `docker-compose.yml`.

## Where they live, and the file format

- `backups/backup-YYYY-MM-DD.sql` — one per day, plain SQL (`pg_dump`'s
  default text format, not the custom/compressed one), directly readable and
  restorable with `psql`.
- Only the last **30 days** are kept — `backup.sh` deletes anything older
  every time it runs.
- This folder is gitignored (see `.gitignore`) — dumps contain your personal
  habit, health, and financial data and must never be committed.

## How the schedule works

The `backup` service is its own container (`backup/Dockerfile`, built off the
same `postgres:17-alpine` image `db` runs, so `pg_dump`'s version always
matches the server). Busybox `crond` inside it runs `backup.sh` once a day at
`BACKUP_HOUR` (`.env`, default `2`, interpreted in `APP_TIMEZONE`). It only
backs up while your laptop and Docker are actually running — a day it's off
at 2 AM is a day with no dump for that date, same as any laptop-based cron
would behave.

Run one manually any time (e.g. right before a risky migration):

```sh
docker compose exec backup /backup.sh
```

## Restoring from a backup

**Recommended: restore into a fresh/empty database**, not on top of the live
one — `psql` will error on every already-existing table otherwise. To restore
into the running container's database via Docker (no local `psql` needed):

```sh
# 1. Stop the app so it isn't writing while you restore.
docker compose stop web

# 2. Drop and recreate the database, then load the dump.
docker compose exec db dropdb -U tracker tracker
docker compose exec db createdb -U tracker tracker
docker compose exec -T db psql -U tracker -d tracker < backups/backup-2026-08-17.sql

# 3. Bring the app back up.
docker compose start web
```

If you have `psql` installed on the host instead, you can point it at the
published port (5433 by default, see `DB_PORT` in `.env`) the same way:

```sh
psql -h localhost -p 5433 -U tracker -d tracker -f backups/backup-2026-08-17.sql
```

### Testing a restore without touching your real data

Restore into a throwaway database first if you want to confirm a dump isn't
corrupt before trusting it:

```sh
docker compose exec db createdb -U tracker tracker_restore_test
docker compose exec -T db psql -U tracker -d tracker_restore_test < backups/backup-2026-08-17.sql
docker compose exec db psql -U tracker -d tracker_restore_test -c "select count(*) from habits;"
docker compose exec db dropdb -U tracker tracker_restore_test
```

## Cloud sync (optional, off by default)

`backup.sh` has a hook for syncing the *latest* backup only (not all 30 days,
to stay inside any free-tier quota) to a cloud remote via
[rclone](https://rclone.org/), but it's inactive until you set it up — rclone
needs a one-time **interactive** OAuth login in a real browser
(`rclone config`) that nothing running unattended in this container can do
for you. To turn it on:

1. Install `rclone` in `backup/Dockerfile` (`RUN apk add --no-cache rclone`)
   and rebuild: `docker compose up --build -d backup`.
2. Authorize a remote once: `docker compose exec backup rclone config` and
   follow the prompts (Google Drive, Dropbox, etc. are all supported).
3. Set `RCLONE_REMOTE=<remote-name>:<path>` in `.env` (e.g.
   `gdrive:tracker-backups`) and restart: `docker compose up -d backup`.
   From then on, every daily run also uploads that day's file.
4. Or run it by hand any time without wiring it into the daily job:
   `docker compose exec backup sh /sync-to-cloud.sh <remote>:<path>`.

To download a backup back from the cloud, use `rclone copy` in the other
direction: `rclone copy gdrive:tracker-backups/backup-2026-08-17.sql .`
