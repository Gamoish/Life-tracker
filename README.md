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

Then edit the one value that actually matters:

- `APP_TIMEZONE` — your IANA zone (`Asia/Kolkata`, `Europe/London`, …). This
  decides what "today" means for every habit, health and DSA log. Leave it at
  `UTC` and a 11pm entry may land on the wrong day.

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

## Deploying to Vercel + Supabase

The app also runs on Vercel (hosting) + Supabase (managed Postgres) instead of
self-hosted Docker Postgres — the same code, same `DATABASE_URL`-driven
connection, just pointed at a different database. Docker Compose keeps working
for local dev either way; this is an additional target, not a replacement.

**1. Create a Supabase project and grab the connection string**

In the Supabase dashboard: **Project Settings → Database → Connection string**.
Use the pooled **"Transaction" mode** connection string (port `6543`, host
starting `aws-0-…pooler.supabase.com`), not the direct connection (port
`5432`). Vercel runs your app as short-lived serverless functions that can
open many connections at once; the direct connection has a low connection
cap and exhausts fast under concurrent requests, while the pooler
(Supavisor) is built exactly for this. Copy it — it looks like:

```
postgresql://postgres.xxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-<region>.pooler.supabase.com:6543/postgres
```

**2. Push the schema to Supabase**

With that connection string as `DATABASE_URL` (either export it inline, or
temporarily set it in your local `.env`):

```bash
DATABASE_URL="postgresql://postgres.xxxx:...@aws-0-<region>.pooler.supabase.com:6543/postgres" npx drizzle-kit push
```

SSL is picked up automatically — `drizzle.config.ts` reads `DATABASE_URL` and
enables it for any non-local host, so no `?sslmode=require` needs to be typed
into the string by hand. This creates every table from `src/db/schema.ts`
directly (no migration history needed for a first push to a fresh database).
If you'd rather apply the tracked migration files instead, run
`DATABASE_URL="..." npm run db:migrate`. Optionally seed the roadmaps the same
way: `DATABASE_URL="..." npm run seed:roadmaps`.

**3. Push the repo to GitHub** (if it isn't already on a remote)

```bash
git push -u origin main
```

**4. Import into Vercel**

[vercel.com/new](https://vercel.com/new) → import the GitHub repo. Vercel
detects Next.js automatically — no build command or output directory changes
needed. Before deploying, add every variable from `.env.example` marked
`[Vercel]` under **Project Settings → Environment Variables**:

| Variable         | Value                                                             |
| ---------------- | ------------------------------------------------------------------ |
| `DATABASE_URL`   | The Supabase pooled connection string from step 1                |
| `APP_TIMEZONE`   | Your IANA zone, e.g. `Asia/Kolkata`                               |

`DATABASE_SSL` does not need to be set — it's only an escape hatch for when
the automatic local-vs-remote SSL detection guesses wrong.

**5. Deploy**

Trigger the deploy from the Vercel import screen (or `git push` again later
for subsequent deploys). Every push to the connected branch redeploys
automatically.

**6. (Optional) Attach a custom domain**

**Project Settings → Domains** in the Vercel dashboard.

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
  lib/                    date helpers, progress math, heatmap
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

Built so far: **Roadmaps** · **Goals** · **Habits** · **DSA** (plus the app
shell).

Habits deliberately has **no bottom-nav tab** — the bar stays at five
(Today · Roadmaps · DSA · Goals · Health). `/habits` is the management screen;
the daily check-off list (`HabitCheckList`) is a self-contained component that
the Today dashboard will embed next pass.

Still to come in Phase 1: Today dashboard, Health, and the PWA
manifest/service worker.

Later phases, which the schema already leaves room for: plain task list,
money/spending, projects, learning calendar, analytics, and an Open Food Facts
food database.
