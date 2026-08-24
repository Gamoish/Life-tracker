/**
 * Local Postgres (Docker Compose's `db` service, or `localhost`/`127.0.0.1`
 * for host-side scripts hitting the published port) has no TLS listener, so
 * SSL must stay off there. Any other host — Supabase included — is a managed,
 * remote Postgres that requires SSL.
 *
 * `rejectUnauthorized: false` still encrypts the connection; it only skips
 * CA-chain verification. That's the standard trade-off for providers (Supabase
 * among them) that front Postgres with certificates Node's bundled CA list
 * doesn't always validate cleanly.
 *
 * Override the guess with `DATABASE_SSL=true` / `DATABASE_SSL=false` if it's
 * ever wrong for your host.
 */
export function sslConfigFor(connectionString: string): false | { rejectUnauthorized: false } {
  if (process.env.DATABASE_SSL === "true") return { rejectUnauthorized: false };
  if (process.env.DATABASE_SSL === "false") return false;

  const { hostname } = new URL(connectionString);
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "db";
  return isLocal ? false : { rejectUnauthorized: false };
}
