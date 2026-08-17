#!/bin/sh
# Installs a one-line crontab from $BACKUP_HOUR and hands off to busybox
# crond in the foreground — that's what keeps this container alive (`docker
# compose restart: unless-stopped` then keeps IT alive across laptop
# reboots), rather than a Node scheduler living inside the web app process,
# which would only back anything up while `next start` happened to be running.
set -eu

HOUR="${BACKUP_HOUR:-2}"
mkdir -p /backups

echo "${HOUR} * * * * /backup.sh >> /proc/1/fd/1 2>&1" >/etc/crontabs/root
chmod 600 /etc/crontabs/root

echo "[$(date -Iseconds)] backup service starting — daily dump scheduled for ${HOUR}:00 ${TZ:-UTC}"
echo "[$(date -Iseconds)] run one now with: docker compose exec backup /backup.sh"

exec crond -f -l 8
