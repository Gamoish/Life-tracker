# Tracker

A single-user, self-hosted personal life-management PWA. Habits, DSA practice,
learning roadmaps, goals, and a manual health log — all keyed off "today".

Runs entirely on your own machine against your own Postgres. No accounts, no
cloud, no third-party sync.

## Stack

| Piece     | Choice                                            |
| --------- | ------------------------------------------------- |
| Framework | Next.js 15 (App Router) + TypeScript              |
| Database  | PostgreSQL 17                                     |
| ORM       | Drizzle ORM + drizzle-kit (explicit SQL migrations) |
| Styling   | Tailwind CSS v4                                   |
| PWA       | `@ducanh2912/next-pwa`                            |
| Runtime   | Docker Compose (`web` + `db`)                     |

> **Why Next 15 and not 16?** `@ducanh2912/next-pwa` is a webpack plugin. Next 16
> builds with Turbopack by default, which would skip it silently and ship no
> service worker. Next 15 keeps webpack as the default build path.

## First run

**1. Create your `.env`**

```bash
cp .env.example .env
```

Then edit two values that actually matter:

- `APP_PASSWORD` — the single password you type on the login page.
- `APP_TIMEZONE` — your IANA zone (`Asia/Kolkata`, `Europe/London`, …). This
  decides what "today" means for every habit, health and DSA log. Leave it at
  `UTC` and a 11pm entry may land on the wrong day.

Generate a strong `SESSION_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**2. Build and start the stack**

```bash
docker compose up --build -d
```

Postgres comes up first; `web` waits on its healthcheck before starting.

**3. Apply migrations**

```bash
docker compose exec web npm run db:migrate
```

**4. Seed the roadmaps**

```bash
docker compose exec web npm run seed:roadmaps
```

Open <http://localhost:3000>.

## Auth

There is no `users` table. One password lives in `APP_PASSWORD`; the login page
checks it and sets a signed, httpOnly session cookie (HS256 via `jose`, 30-day
expiry). `src/middleware.ts` gates every route except `/login` and the PWA files
— the service worker and manifest stay public, or installing the app breaks.

Two details worth knowing:

- **`COOKIE_SECURE` defaults to `false`.** You'll open this over plain
  `http://` on your LAN from your phone, and a `Secure` cookie would never be
  sent. Set it to `true` only once you put the app behind HTTPS.
- **The password comparison is constant-time** (`node:crypto.timingSafeEqual`
  over SHA-256 digests of both sides, so buffer lengths always match).

Tap **Lock** on the Today screen to clear the session.

## Day-to-day

```bash
docker compose up -d          # start
docker compose down           # stop (data survives in the pgdata volume)
docker compose logs -f web    # tail app logs
docker compose ps             # service + health status
```

To wipe the database and start clean:

```bash
docker compose down -v        # -v also drops the pgdata volume
```

## Changing the schema

Migrations are explicit files, never auto-pushed. After editing
`src/db/schema.ts`:

```bash
npm run db:generate                          # writes drizzle/NNNN_*.sql
docker compose up --build -d                 # rebuild the image with it
docker compose exec web npm run db:migrate   # apply it
```

`db:generate` only diffs the schema against the migration journal — it never
touches a live database, so it's safe to run with nothing else up.

## Adding a roadmap

Drop a JSON file into `seeds/roadmaps/` and re-run the seed. Shape:

```json
{
  "slug": "backend",
  "name": "Backend",
  "groups": [
    {
      "title": "Internet",
      "topics": [
        { "title": "How does the internet work?" },
        { "title": "What is HTTP?" }
      ]
    },
    {
      "title": "Pick a Language",
      "topics": [
        { "title": "Go", "kind": "recommended" },
        { "title": "Rust", "kind": "alternative" }
      ]
    }
  ]
}
```

`kind` is one of `core` (default), `recommended`, `alternative`, `optional`.

The seed is **idempotent** — it upserts on `(roadmap, parent, title)` and
deliberately does not touch `status`, so re-running it after editing a JSON file
refreshes the structure without wiping progress you've already made. You can
also add roadmaps and topics from inside the app; both write to the same tables.

## Running scripts from the host instead of the container

The `db` service publishes port **5433** (not 5432 — this machine already runs a
native PostgreSQL service on 5432, and colliding there makes host-side tools
connect to the wrong server and fail with a confusing auth error). `.env`'s
`DATABASE_URL` already points at `localhost:5433`:

```bash
npm run db:studio     # drizzle-kit studio, browse the data
npm run db:migrate
npm run seed:roadmaps
```

Change the published port with `DB_PORT` in `.env`.

## Tests

The pure modules have their own unit tests, and the browser tests run against
the **already-running** containers, not a separate dev server:

```bash
npm run test:unit                 # pure libs (health, heatmap) — no DB needed

docker compose up --build -d
npx playwright install chromium   # first time only
npm run e2e
```

The suite creates and deletes its own data and restores any seeded topic it
changes, so it is safe to re-run against your real database.

## Layout

```
drizzle/                  generated SQL migrations + journal
e2e/                      Playwright specs (run against the live containers)
seeds/roadmaps/           one JSON file per roadmap
scripts/                  migrate.ts, seed-roadmaps.ts
src/
  app/
    globals.css           design tokens (the single source of colour)
    fonts.ts              display / body / mono, self-hosted via next/font
    (app)/layout.tsx      one tree: sidebar on md+, tab bar on mobile
  components/             shared UI kit (ui.tsx), Sidebar, Heatmap, Toast
  db/                     schema.ts, lazy drizzle client
  lib/                    date helpers, auth, progress math, heatmap
  middleware.ts           session gate on every route except /login
```

The shell is **one** tree driven by breakpoints, not two. The sidebar is
`hidden md:flex` and the tab bar `md:hidden` — `display: none` on each side of
the breakpoint, which also keeps the hidden one out of the accessibility tree,
so the two navs never expose duplicate links at the same time.

## Design system

Dark only — there is no light theme and no toggle.

Everything visual comes from semantic tokens defined once in
`src/app/globals.css`. Components say `bg-surface`, `text-muted`,
`border-line`, never a hex or a stock Tailwind colour, so the whole palette is
swappable from that one block. Tailwind v4 is CSS-first: there is **no
`tailwind.config.js`**, and `@theme inline` is what makes the utilities resolve
through a runtime `var()` rather than baking the value in.

> **Naming trap:** a `--color-x` token also claims `text-x`. Never name one
> after a font size — `--color-base` silently turned every `text-base` into a
> colour, which is why the page background is called `canvas`.

Status colour is picked **once** and reused across every module, so "done" is
the same green in Roadmaps, Habits, Goals and DSA:

| Token   | Hue    | Means                                    |
| ------- | ------ | ---------------------------------------- |
| `accent`| orange | interactive: active nav, fills, progress |
| `done`  | green  | done · solved · easy                     |
| `wip`   | blue   | learning · revisit · medium              |
| `warn`  | rose   | hard · overdue · destructive             |
| `idle`  | grey   | not_started · todo · dropped             |

Modules map their own enum onto a tone with the tables exported from
`src/components/ui.tsx` (`DIFFICULTY_TONE`, `PROBLEM_STATUS_TONE`,
`TOPIC_STATUS_TONE`, `GOAL_STATUS_TONE`) rather than choosing colours
themselves.

Three type roles via `next/font` (`src/app/fonts.ts`): Space Grotesk for
headings, Inter for body, and **JetBrains Mono for every number** — counts,
streaks, tallies, dates.

`src/components/ui.tsx` holds the shared kit and is deliberately hook-free, so
it renders from server and client components alike. Anything with state of its
own (`Toast.tsx`) lives in its own `"use client"` file.

## How progress is calculated

Two pure, DB-free modules own all the maths, so both can be reasoned about and
tested in isolation:

- **`src/lib/roadmap-progress.ts`** — a roadmap's %. Counts only *leaf* topics
  whose kind is `core` or `recommended`. `alternative` is pick-one (you'll learn
  React, not also Vue and Angular), so counting alternatives would cap the bar
  below 100% forever; `optional` is excluded for the same reason. A zero
  denominator yields `null`, rendered "—", which is a different statement from
  0%.
- **`src/lib/goal-progress.ts`** — a goal's %. Precedence: a roadmap-linked goal
  uses its roadmap's %; otherwise milestones win whenever any exist; otherwise
  the manual slider. Reaching 100% never auto-completes a goal — status is
  always an explicit choice.
- **`src/lib/habit-streak.ts`** — habit streaks. An **unchecked today does not
  break a streak**: the day isn't over, so counting starts from yesterday and
  only a *past* missed day ends the run. Weekly habits get no multi-week streak
  in Phase 1 — they report "3 / 5 this week" over a **Monday-start** week.
- **`src/lib/heatmap.ts`** — the consistency grid on Habits. Takes one date
  string *per event* (habit check-offs and `problems.solved_at` concatenated),
  so it doesn't care where activity came from. Columns are Monday-start; days
  after today are `null`, not empty — an unlived day is not a missed one. Levels
  are relative to the window's busiest day, with a floor so a quiet fortnight
  can't paint itself at full intensity.

All of them take dates as `YYYY-MM-DD` strings and are re-run client-side for
optimistic updates, so a mid-flight tap can never display a number the server
would disagree with.

`src/lib/roadmap-queries.ts` is the **single** DB path for a roadmap
percentage. The Roadmaps page and any goal tracking that roadmap both read
through it, so the two screens cannot disagree.

Deleting a roadmap does not delete goals: `goals.roadmap_id` is
`ON DELETE SET NULL`, and such a goal falls back to manual progress and says so.

## Timezone

`APP_TIMEZONE` (Asia/Kolkata) decides what "today" means for every date-keyed
log. It is resolved **server-side** and passed down — never read from the
browser's clock, or an 11pm check-off would land on the wrong day.

## Scope

Built so far: **Roadmaps** · **Goals** · **Habits** · **DSA** (plus login and
the app shell).

Habits deliberately has **no bottom-nav tab** — the bar stays at five
(Today · Roadmaps · DSA · Goals · Health). `/habits` is the management screen;
the daily check-off list (`HabitCheckList`) is a self-contained component that
the Today dashboard will embed next pass.

Still to come in Phase 1: Today dashboard, Health, and the PWA
manifest/service worker.

Later phases, which the schema already leaves room for: plain task list,
money/spending, projects, learning calendar, analytics, and an Open Food Facts
food database.
