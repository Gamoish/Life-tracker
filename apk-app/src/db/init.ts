/**
 * Raw DDL, run once per connection via `SQLiteDBConnection.execute()`.
 *
 * There's no migration runner here — this is a single-user, on-device
 * database with no prior versions to migrate from, so "create if missing" on
 * every app start is sufficient. If the schema needs to change later, add a
 * `user_version` PRAGMA check and real migration steps at that point rather
 * than up front.
 */
export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS habits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  scheduled_days TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'accent',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS habit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 1,
  UNIQUE (habit_id, date)
);
`;
