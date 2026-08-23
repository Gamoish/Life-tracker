"use client";

import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from "@capacitor-community/sqlite";
import { Capacitor } from "@capacitor/core";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { CREATE_TABLES_SQL } from "./init";
import * as schema from "./schema";

/**
 * Wires Drizzle's generic SQLite "proxy" driver (`drizzle-orm/sqlite-proxy`)
 * to `@capacitor-community/sqlite`. There's no first-party Drizzle driver for
 * this plugin, so the proxy driver — a callback that takes a SQL string +
 * params and returns rows — is the intended integration point for any SQLite
 * backend Drizzle doesn't ship a dedicated driver for.
 *
 * On a device this plugin talks to a real native SQLite file. In a plain
 * browser (`next dev`, no native shell) it falls back to `jeep-sqlite`, a web
 * component backed by a WASM build of SQLite + IndexedDB persistence — purely
 * so this app is developable without an Android emulator running. The APK
 * itself never touches that path; `Capacitor.getPlatform()` is `"android"`
 * there, not `"web"`.
 */

const DB_NAME = "tracker";

let sqliteConnection: SQLiteConnection | null = null;
let dbConnection: SQLiteDBConnection | null = null;
let readyPromise: Promise<SQLiteDBConnection> | null = null;

async function ensureWebStore(): Promise<void> {
  if (Capacitor.getPlatform() !== "web") return;

  if (!customElements.get("jeep-sqlite")) {
    // Registered lazily rather than imported at module scope, so this branch
    // — and the WASM it pulls in — never loads on native, where it's unused.
    await import("jeep-sqlite/loader").then(({ defineCustomElements }) => defineCustomElements(window));
  }

  if (!document.querySelector("jeep-sqlite")) {
    document.body.appendChild(document.createElement("jeep-sqlite"));
  }

  await customElements.whenDefined("jeep-sqlite");
  await CapacitorSQLite.initWebStore();
}

async function connect(): Promise<SQLiteDBConnection> {
  await ensureWebStore();

  if (!sqliteConnection) sqliteConnection = new SQLiteConnection(CapacitorSQLite);

  const isConn = (await sqliteConnection.isConnection(DB_NAME, false)).result;
  const conn = isConn
    ? await sqliteConnection.retrieveConnection(DB_NAME, false)
    : await sqliteConnection.createConnection(DB_NAME, false, "no-encryption", 1, false);

  await conn.open();
  await conn.execute(CREATE_TABLES_SQL);
  return conn;
}

/** Lazily opens (once) and returns the single shared on-device connection. */
function getConnection(): Promise<SQLiteDBConnection> {
  if (!readyPromise) readyPromise = connect();
  return readyPromise;
}

/** Row objects from the plugin -> positional value arrays Drizzle expects. */
function toPositional(row: Record<string, unknown>): unknown[] {
  return Object.values(row);
}

type ProxyMethod = "run" | "all" | "values" | "get";

async function proxy(sql: string, params: unknown[], method: ProxyMethod): Promise<{ rows: any }> {
  const conn = await getConnection();

  if (method === "run") {
    await conn.run(sql, params, false);
    // Web only: the native plugin writes straight through to a real SQLite
    // file, but the web fallback keeps its DB in memory (sql.js/WASM) and
    // only persists to IndexedDB when explicitly told to — without this,
    // every write here would vanish on reload.
    if (Capacitor.getPlatform() === "web" && sqliteConnection) {
      await sqliteConnection.saveToStore(DB_NAME);
    }
    return { rows: [] };
  }

  const result = await conn.query(sql, params);
  const values = result.values ?? [];

  if (method === "get") {
    const first = values[0] as Record<string, unknown> | undefined;
    return { rows: first ? toPositional(first) : undefined };
  }

  return { rows: values.map((row: Record<string, unknown>) => toPositional(row)) };
}

export const db = drizzle(proxy, { schema });

/** Call once on app start so the first real query isn't what pays for connection setup. */
export function initDatabase(): Promise<void> {
  return getConnection().then(() => undefined);
}
