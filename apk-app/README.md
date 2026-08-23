# Tracker — Habits (APK)

A standalone, offline-only Android app. This is a **separate app from the
existing web Tracker** at the repo root — different stack, different
database, no shared code at runtime, no network calls, no auth. It lives in
this folder specifically so the web app (Next.js + Postgres + Docker) is
never touched by anything here.

**Scope of this step:** one module, Habits — add a habit, check it off, see a
correct streak, with everything stored on-device in SQLite. Every other
module (Goals, Roadmaps, Health, Tasks, Expenses, EMIs, Savings, Journal,
Settings) follows later, one at a time, once this pattern is proven.

## Stack

- **Next.js, static export** (`output: "export"` in `next.config.mjs`) — no
  server, no API routes, no middleware. Capacitor just loads the exported
  `out/` folder as local files in a WebView.
- **Capacitor**, Android platform only for now.
- **SQLite** via `@capacitor-community/sqlite`, wired to **Drizzle's SQLite
  dialect** (`drizzle-orm/sqlite-core`) through Drizzle's generic
  `sqlite-proxy` driver — there's no first-party Drizzle driver for this
  plugin, so `src/db/client.ts` is a ~30-line adapter: Drizzle hands it a SQL
  string, it runs that against the plugin's native connection, and hands
  rows back.
- No auth of any kind. Nothing to log into — data never leaves the device.

## Prerequisites

- **Node.js** 20+ (developed against Node 26 / npm 11).
- **Android Studio** (current stable) with the Android SDK installed through
  it. During setup, Android Studio installs:
  - The Android SDK (API level 36 — this project's `compileSdk`/`targetSdk`)
  - A bundled JDK (JBR) — **use this**, not an arbitrary system JDK. Gradle
    for Android is picky about JDK versions; Android Studio's bundled one is
    the version its own Gradle Plugin (`8.13.0` here) was tested against.
- That's it — no Postgres, no Docker, no `.env` file. This app has no server.

## First-time setup

```bash
cd apk-app
npm install
```

## Running on an emulator (fastest inner loop)

You do **not** need Android Studio open for day-to-day UI work — plain
`next dev` runs the Habits screen in a normal browser tab, backed by a WASM
SQLite fallback (`jeep-sqlite`) so the exact same data layer code runs
without a device at all:

```bash
npm run dev
# open http://localhost:3000
```

This is genuinely useful for iterating on the UI, but it is **not** what
ships — it's a dev convenience. The real target is the native path below.

To run the actual Android app:

1. Build the static export and copy it into the native project:
   ```bash
   npm run cap:sync
   ```
   (This runs `next build` — producing `out/` — then `npx cap sync android`,
   which copies `out/` into `android/app/src/main/assets/public` and
   refreshes native plugin wiring. Re-run this after any change to `src/`.)

2. Open the native project in Android Studio:
   ```bash
   npx cap open android
   ```
   (Or open the `android/` folder directly from Android Studio's "Open"
   dialog.) Let Gradle sync finish — first sync downloads dependencies and
   can take a few minutes.

3. Create an emulator if you don't have one: **Tools → Device Manager → Create
   Device** in Android Studio, pick any recent phone profile, any API 30+
   system image.

4. Press **Run** (▶) in Android Studio, targeting that emulator.

## Building a debug APK from the command line

Once Android Studio has synced the project at least once (so the SDK path is
resolved into `android/local.properties`):

```bash
cd android
./gradlew assembleDebug
```

The APK lands at `android/app/build/outputs/apk/debug/app-debug.apk`. Install
it on a device over USB (with USB debugging enabled) via:

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

## Project layout

```
apk-app/
  src/
    app/                 Next.js app router — layout.tsx, globals.css, page.tsx (the one Habits screen)
    components/          Trimmed, adapted copy of the web app's ui.tsx / icons.tsx
    db/
      schema.ts          Drizzle SQLite schema — habits, habit_logs
      init.ts             Raw CREATE TABLE statements, run once per connection
      client.ts           The sqlite-proxy <-> @capacitor-community/sqlite adapter
    lib/
      date.ts             Device-local-time date helpers (no server timezone)
      habit-streak.ts      Ported streak math, pure + DB-free
      habit-streak.test.ts Ported unit tests
      habit-color.ts       The habit identity-color palette
    features/habits/
      queries.ts           listHabitsWithLogs() — plain async function, no server
      actions.ts            add/update/toggle/archive/delete — plain async functions
      HabitCheckList.tsx, HabitManager.tsx, DayPicker.tsx, HabitColorPicker.tsx
  android/                Capacitor's generated native project (checked in; build/ output is gitignored)
  capacitor.config.ts
  next.config.mjs         output: "export"
```

## Data model (this step)

Ported from the web app's **current** (weekday-scheduled) habits schema, not
the older daily/weekly-count version — same `scheduledDays` model (ISO
weekdays 1–7, "daily" is just all seven picked), re-expressed for SQLite:

- `habits` — `id, name, scheduled_days (JSON array of 1–7), color, active,
  created_at`. Postgres had a native `integer[]` for `scheduled_days`; SQLite
  has no array type, so it's a JSON text column instead (`{ mode: "json" }`
  in Drizzle), same values.
- `habit_logs` — `id, habit_id, date, done`, unique on `(habit_id, date)`.
  Toggling a day is the same single `INSERT ... ON CONFLICT DO UPDATE SET
  done = NOT done` the web app uses — never read-then-write.

No migration runner: `db/init.ts` just does `CREATE TABLE IF NOT EXISTS` on
every connection open. Fine for a single-user on-device DB with no prior
version to migrate from; if the schema changes later, add a `user_version`
PRAGMA check and real migration steps at that point.

## Timezone

The web app resolves "today" in a fixed `APP_TIMEZONE` (Asia/Kolkata) because
one server serves every request. This app has no server — `today()` in
`src/lib/date.ts` just reads the device's own local clock. The streak math
itself (`habit-streak.ts`) is untouched; only where `today` comes from
changed.

## A note on the web dev fallback (`jeep-sqlite`)

`@capacitor-community/sqlite` talks to a real native SQLite file on Android.
In a plain browser (no native shell), it falls back to `jeep-sqlite`, a web
component backed by a WASM build of SQLite (`sql.js`) with IndexedDB
persistence. Two things worth knowing if you touch this:

- **`sql.js` is pinned to `1.11.0`** via `overrides` in `package.json`, and
  `public/assets/sql-wasm.wasm` is that exact version's compiled binary,
  copied from `node_modules/sql.js/dist/sql-wasm.wasm`. The newer `1.14.x`
  that npm resolves by default ships a WASM binary with an incompatible
  import table against jeep-sqlite `2.8.0`'s bundled glue code (a hard
  `LinkError` at runtime, not silent breakage) — if you ever bump either
  package, re-check this pairing and re-copy the wasm file if you do.
- **Writes on web need an explicit flush.** The native plugin writes straight
  to a file; the WASM path keeps its DB in memory and only persists to
  IndexedDB when told to. `src/db/client.ts` calls
  `sqliteConnection.saveToStore(...)` after every write, gated to
  `Capacitor.getPlatform() === "web"` — the native path doesn't need it and
  doesn't have the method called on it.

None of this affects the Android build: the WASM file is inert dead weight
in the shipped APK's assets (~640 KB) since native Android never touches
`jeep-sqlite`. Worth trimming later (e.g. excluding `public/assets/` from
`next build`'s output for the Capacitor copy step) but harmless for now.

## Verification status

- **Unit tests**: `npm run test:unit` — all 16 ported `habit-streak` tests
  pass standalone in this project.
- **Static export build**: `npm run build` succeeds cleanly (typecheck +
  export).
- **Functional correctness**: verified end-to-end against a running `next
  dev` session driven by a real browser (Chromium via Playwright, used only
  as an ad hoc manual-verification tool for this session — not part of the
  project's dependencies or checked in) — add habit, due-today filtering by
  scheduled weekday, check-off, correct streak count, persistence across a
  full page reload, archive/restore, delete, all with zero console or
  network errors, airplane-mode-equivalent (no network calls at all — the
  web fallback's only "network" traffic is the same-origin WASM file fetch,
  which doesn't exist on the native path).
- **Capacitor**: `npx cap add android` and `npx cap sync android` both
  succeed and correctly detect the `@capacitor-community/sqlite` plugin.
- **Native Android build**: NOT verified in the environment this was built
  in — no Android SDK is installed there, and its network egress to
  `services.gradle.org` (where the Gradle wrapper fetches its distribution
  from) is blocked. `./gradlew help` was run to confirm the wrapper itself
  is correctly configured — it got as far as attempting that download before
  timing out, which is an environment boundary, not a project problem. This
  step — `npm run cap:sync`, open in Android Studio, run on an emulator or
  device — needs to happen on a machine with Android Studio installed, per
  the setup instructions above.
