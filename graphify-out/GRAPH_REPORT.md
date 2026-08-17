# Graph Report - tracker  (2026-08-16)

## Corpus Check
- Corpus is ~22,355 words - fits in a single context window. You may not need a graph.

## Summary
- 400 nodes · 706 edges · 21 communities (20 shown, 1 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.77)
- Token cost: 9,800 input · 6,400 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `Db` - 11 edges
3. `today()` - 11 edges
4. `scripts` - 10 edges
5. `GoalCard()` - 10 edges
6. `computeRoadmapProgress()` - 10 edges
7. `revalidateAll()` - 9 edges
8. `PageHeader()` - 7 edges
9. `EmptyState()` - 7 edges
10. `formatShort()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `DATABASE_URL uses the compose service name` --conceptually_related_to--> `pool`  [INFERRED]
  docker-compose.yml → scripts/migrate.ts
- `Deleting a roadmap does not delete goals` --conceptually_related_to--> `computeGoalProgress()`  [INFERRED]
  README.md → src/lib/goal-progress.ts
- `APP_TIMEZONE (server-side definition of "today")` --conceptually_related_to--> `IMPORTANT: `today` is always passed in. Callers resolve it with`  [INFERRED]
  README.md → src/lib/habit-streak.ts
- `Idempotent roadmap seed preserves progress` --references--> `roadmapTopics`  [INFERRED]
  README.md → src/db/schema.ts
- `Unchecked today does not break a streak` --rationale_for--> `currentStreak()`  [EXTRACTED]
  README.md → src/lib/habit-streak.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Docker Compose runtime stack** — docker_compose_web, docker_compose_db, docker_compose_pgdata, docker_compose_healthcheck_gate, docker_compose_database_url [EXTRACTED 1.00]
- **Single-password login and session gate flow** — src_app_login_actions, src_lib_password, src_lib_session, src_middleware_middleware, readme_app_password [EXTRACTED 1.00]
- **Pure DB-free progress rule modules** — src_lib_roadmap_progress, src_lib_goal_progress, src_lib_habit_streak, readme_optimistic_client_recompute [EXTRACTED 1.00]

## Communities (21 total, 1 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (42): Only leaf core/recommended topics count, Pure DB-free progress modules re-run client-side, roadmap-queries is the single DB path for a roadmap %, GoalsPage(), addGroup(), addRoadmap(), addTopic(), cycleTopicStatus() (+34 more)

### Community 1 - "Community 1"
Cohesion: 0.11
Nodes (30): APP_TIMEZONE (server-side definition of "today"), addHabit(), FormState, parseWeeklyTarget(), revalidateAll(), setHabitActive(), toggleHabit(), updateHabit() (+22 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (26): DailyHealth, difficulty, FoodLog, foodLogs, Goal, GoalMilestone, goalStatus, Habit (+18 more)

### Community 3 - "Community 3"
Cohesion: 0.12
Nodes (33): Goal progress precedence: roadmap > milestones > manual, Deleting a roadmap does not delete goals, addGoal(), addMilestone(), deleteGoal(), deleteMilestone(), FormState, revalidateAll() (+25 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (21): APP_PASSWORD and SESSION_SECRET are required at startup, nextConfig, NOTE: the PWA wrapper (@ducanh2912/next-pwa) gets added here in the final, APP_PASSWORD (single-password auth), Constant-time password comparison, Middleware session gate (except /login and PWA files), Next 15 over Next 16 (webpack keeps the PWA), SESSION_SECRET (HS256 session signing) (+13 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (28): drizzle-orm, jose, dependencies, drizzle-orm, jose, next, pg, react (+20 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (26): dom, dom.iterable, ES2022, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+18 more)

### Community 7 - "Community 7"
Cohesion: 0.14
Nodes (21): addProblem(), deleteProblem(), DIFFICULTIES, Difficulty, FormState, ProblemStatus, revalidateAll(), setProblemStatus() (+13 more)

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (23): dotenv, drizzle-kit, devDependencies, dotenv, drizzle-kit, @playwright/test, tailwindcss, @tailwindcss/postcss (+15 more)

### Community 9 - "Community 9"
Cohesion: 0.19
Nodes (9): cleanup(), istToday(), sql(), weekStartOf(), addProblem(), card(), createHabit(), habitRow() (+1 more)

### Community 10 - "Community 10"
Cohesion: 0.18
Nodes (13): seed:roadmaps, Idempotent roadmap seed preserves progress, db, linkOf(), pool, SEED_DIR, seedFile(), SeedGroup (+5 more)

### Community 11 - "Community 11"
Cohesion: 0.18
Nodes (4): Habits has no bottom-nav tab, BottomNav(), svg, TABS

### Community 12 - "Community 12"
Cohesion: 0.29
Nodes (10): Phase 1 scope and deferred phases, Tracker (self-hosted life-management PWA), CalorieEntry, DayInput, DaySummary, DurationEntry, safe(), summarizeDay() (+2 more)

### Community 13 - "Community 13"
Cohesion: 0.33
Nodes (11): Unchecked today does not break a streak, addDays(), weekBounds(), asSet(), currentStreak(), HabitCadence, HabitSummary, longestStreak() (+3 more)

### Community 14 - "Community 14"
Cohesion: 0.24
Nodes (9): DATABASE_URL uses the compose service name, db service (postgres:17-alpine), web waits on db service_healthy, pgdata volume, web service (Next.js app container), COOKIE_SECURE defaults to false, Postgres published on 5433, not 5432, E2E suite runs against the live containers (+1 more)

### Community 15 - "Community 15"
Cohesion: 0.33
Nodes (5): createGoal(), goalCard(), goalPercent(), milestoneToggle(), removeGoal()

## Knowledge Gaps
- **116 isolated node(s):** `nextConfig`, `name`, `version`, `private`, `type` (+111 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `scripts` connect `Community 5` to `Community 10`?**
  _High betweenness centrality (0.179) - this node is a cross-community bridge._
- **Why does `Explicit SQL migrations, never auto-pushed` connect `Community 5` to `Community 2`?**
  _High betweenness centrality (0.148) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `version` to the rest of the system?**
  _116 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.11282051282051282 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05668016194331984 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.1166429587482219 - nodes in this community are weakly interconnected._