#!/bin/sh
# One dump run: pg_dump the app database to a timestamped, plain-SQL file in
# /backups (bind-mounted to ./backups on the host — see docker-compose.yml),
# then sweep anything older than 30 days. Runs both on the cron schedule
# (entrypoint.sh installs the crontab) and on demand:
#   docker compose exec backup /backup.sh
set -eu

mkdir -p /backups
STAMP=$(date +%F)
OUT="/backups/backup-${STAMP}.sql"

echo "[$(date -Iseconds)] starting backup -> ${OUT}"
pg_dump -h "${PGHOST}" -U "${PGUSER}" -d "${PGDATABASE}" -f "${OUT}"
echo "[$(date -Iseconds)] backup complete ($(wc -c <"${OUT}") bytes)"

# Keep the last 30 days only — same rule the app itself never applies to its
# own data, but a dump folder left unattended will otherwise grow forever.
find /backups -maxdepth 1 -name 'backup-*.sql' -type f -mtime +30 -print -delete

# Cloud sync is opt-in and NOT wired in here by default — see
# backup/sync-to-cloud.sh and backups/README.md for why (it needs a one-time
# interactive `rclone config` this script can't do for you).
if [ -n "${RCLONE_REMOTE:-}" ] && command -v rclone >/dev/null 2>&1; then
  echo "[$(date -Iseconds)] syncing latest backup to ${RCLONE_REMOTE}"
  rclone copy "${OUT}" "${RCLONE_REMOTE}"
fi
