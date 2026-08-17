# Built on the *same* postgres image the `db` service runs — its `pg_dump`
# is guaranteed to match the server's version, and busybox's crond (already
# in Alpine) covers the "run this on a schedule" need without pulling in a
# Node scheduler dependency for the main app. `tzdata` is what lets
# `BACKUP_HOUR` mean *your* local hour rather than always UTC.
FROM postgres:17-alpine

RUN apk add --no-cache tzdata

COPY backup.sh entrypoint.sh sync-to-cloud.sh /
RUN chmod +x /backup.sh /entrypoint.sh /sync-to-cloud.sh

ENTRYPOINT ["/entrypoint.sh"]
