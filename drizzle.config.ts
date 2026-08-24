import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { sslConfigFor } from "./src/db/ssl";

// drizzle-kit's postgresql `dbCredentials` type doesn't accept `ssl` alongside
// a plain `url` — only alongside the decomposed host/port/user/password/database
// form — so DATABASE_URL is parsed into pieces here rather than passed through
// as-is. This is what lets `drizzle-kit push`/`generate`/`studio` pick up SSL
// automatically for a remote database (e.g. Supabase) the same way the app and
// migration scripts do, without requiring `?sslmode=require` to be typed into
// the pasted connection string by hand.
const connectionString =
  process.env.DATABASE_URL ?? "postgres://tracker:tracker@localhost:5432/tracker";
const url = new URL(connectionString);

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    host: url.hostname,
    port: url.port ? Number(url.port) : 5432,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    ssl: sslConfigFor(connectionString),
  },
  strict: true,
  verbose: true,
});
