#!/bin/sh
# OPTIONAL, not run automatically — see backups/README.md.
#
# Uploads only the newest backup (not all 30 days, to stay well inside any
# free-tier quota). Requires a one-time interactive `rclone config` to
# authorize a Google Drive/Dropbox/etc remote — something this script
# deliberately does NOT attempt on its own, since OAuth needs a real browser
# login only you can complete.
#
# Once that's done:
#   docker compose exec backup sh /sync-to-cloud.sh <remote-name>
# or wire it into the daily cron yourself by adding a second line to
# /etc/crontabs/root inside the container (see entrypoint.sh).
set -eu

REMOTE="${1:-${RCLONE_REMOTE:-}}"
if [ -z "${REMOTE}" ]; then
  echo "Usage: sync-to-cloud.sh <rclone-remote>:<path>   (e.g. gdrive:tracker-backups)" >&2
  exit 1
fi
if ! command -v rclone >/dev/null 2>&1; then
  echo "rclone is not installed in this image. Install it (apk add rclone in backup/Dockerfile)" \
       "and run 'rclone config' inside the container once to authorize a remote first." >&2
  exit 1
fi

# `ls -t`, not `find -printf` — busybox's `find` (this image's shell) doesn't
# support GNU's `-printf` extension.
LATEST=$(ls -t /backups/backup-*.sql 2>/dev/null | head -1)
if [ -z "${LATEST}" ]; then
  echo "No backup files found in /backups yet." >&2
  exit 1
fi

echo "[$(date -Iseconds)] syncing ${LATEST} -> ${REMOTE}"
rclone copy "${LATEST}" "${REMOTE}"
