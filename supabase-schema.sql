-- ============================================================================
-- Supabase schema export — tracker app
--
-- Schema-only export generated from src/db/schema.ts (the Drizzle schema,
-- the single source of truth for this app) via `drizzle-kit export`, which
-- diffs the schema against an empty database state — no live database
-- connection was used or needed to produce this file.
--
-- Paste this entire file into Supabase's SQL Editor and run it once against
-- an empty database. It creates every enum type, table, column, default,
-- constraint, unique constraint, and foreign key this app uses. It assumes
-- the target database is empty and is NOT idempotent — do not re-run it
-- against a database that already has these objects.
--
-- Ordering note: enum types are created first, then every table
-- (alphabetically, with no inline foreign keys), then every foreign key as
-- a separate ALTER TABLE ... ADD CONSTRAINT at the end. Foreign keys are
-- deliberately deferred to the end so table-creation order never has to
-- match the dependency graph — every statement below can run top-to-bottom
-- with no "relation does not exist" errors.
-- ============================================================================

CREATE TYPE "public"."account_type" AS ENUM('cash', 'bank', 'card', 'other');
CREATE TYPE "public"."bill_recurrence" AS ENUM('monthly', 'yearly');
CREATE TYPE "public"."goal_status" AS ENUM('active', 'done', 'dropped');
CREATE TYPE "public"."goal_term" AS ENUM('short', 'long');
CREATE TYPE "public"."habit_color" AS ENUM('accent', 'rose', 'amber', 'green', 'teal', 'blue', 'violet', 'pink');
CREATE TYPE "public"."meal_type" AS ENUM('breakfast', 'lunch', 'dinner', 'snack');
CREATE TYPE "public"."progress_source" AS ENUM('manual', 'roadmap');
CREATE TYPE "public"."task_recurrence" AS ENUM('one_off', 'daily', 'weekly', 'monthly', 'yearly');
CREATE TYPE "public"."topic_kind" AS ENUM('core', 'recommended', 'alternative', 'optional');
CREATE TYPE "public"."topic_status" AS ENUM('not_started', 'learning', 'done');
CREATE TYPE "public"."transaction_type" AS ENUM('income', 'expense');
CREATE TYPE "public"."weight_unit" AS ENUM('kg', 'lbs');
CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "account_type" DEFAULT 'cash' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "app_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"calorie_goal" integer,
	"last_bmi" real,
	"bottle_size_ml" integer DEFAULT 500 NOT NULL,
	"daily_water_goal_ml" integer DEFAULT 2500 NOT NULL,
	"weight_unit" "weight_unit" DEFAULT 'kg' NOT NULL
);

CREATE TABLE "category_budgets" (
	"category_id" integer PRIMARY KEY NOT NULL,
	"monthly_amount" numeric(12, 2) NOT NULL
);

CREATE TABLE "daily_health" (
	"date" date PRIMARY KEY NOT NULL,
	"steps" integer,
	"weight_kg" real
);

CREATE TABLE "emis" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"principal_amount" numeric(12, 2) NOT NULL,
	"emi_amount" numeric(12, 2) NOT NULL,
	"tenure_months" integer NOT NULL,
	"installments_paid" integer DEFAULT 0 NOT NULL,
	"account_id" integer NOT NULL,
	"due_date" date NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "expense_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "transaction_type" NOT NULL,
	CONSTRAINT "expense_categories_name_type_key" UNIQUE("name","type")
);

CREATE TABLE "food_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"item" text NOT NULL,
	"calories" integer,
	"meal" "meal_type",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "goal_contributions" (
	"id" serial PRIMARY KEY NOT NULL,
	"savings_goal_id" integer NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"date" date NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "goal_milestones" (
	"id" serial PRIMARY KEY NOT NULL,
	"goal_id" integer NOT NULL,
	"title" text NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);

CREATE TABLE "goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"target_date" date,
	"status" "goal_status" DEFAULT 'active' NOT NULL,
	"category" text NOT NULL,
	"term" "goal_term" NOT NULL,
	"progress_source" "progress_source" DEFAULT 'manual' NOT NULL,
	"roadmap_id" integer,
	"manual_progress" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "habit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"habit_id" integer NOT NULL,
	"date" date NOT NULL,
	"done" boolean DEFAULT true NOT NULL,
	CONSTRAINT "habit_logs_habit_date_key" UNIQUE("habit_id","date")
);

CREATE TABLE "habits" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"scheduled_days" integer[] NOT NULL,
	"color" "habit_color" DEFAULT 'accent' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "journal_entries" (
	"date" date PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "recurring_bills" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"category_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"recurrence" "bill_recurrence" NOT NULL,
	"due_date" date NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "roadmap_topics" (
	"id" serial PRIMARY KEY NOT NULL,
	"roadmap_id" integer NOT NULL,
	"parent_id" integer,
	"title" text NOT NULL,
	"kind" "topic_kind" DEFAULT 'core' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"resource_link" text,
	"status" "topic_status" DEFAULT 'not_started' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roadmap_topics_parent_title_key" UNIQUE NULLS NOT DISTINCT("roadmap_id","parent_id","title")
);

CREATE TABLE "roadmaps" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roadmaps_slug_unique" UNIQUE("slug")
);

CREATE TABLE "savings_goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"target_amount" numeric(12, 2) NOT NULL,
	"target_date" date,
	"account_id" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "sleep_logs" (
	"date" date PRIMARY KEY NOT NULL,
	"bed_time" time NOT NULL,
	"wake_time" time NOT NULL,
	"duration_min" integer NOT NULL
);

CREATE TABLE "task_completions" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"date" date NOT NULL,
	"done" boolean DEFAULT true NOT NULL,
	CONSTRAINT "task_completions_task_date_key" UNIQUE("task_id","date")
);

CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"category" text,
	"recurrence" "task_recurrence" DEFAULT 'one_off' NOT NULL,
	"due_date" date NOT NULL,
	"scheduled_days" integer[],
	"completed_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "transaction_type" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"category_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"date" date NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "water_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"amount_ml" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "workouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"type" text NOT NULL,
	"duration_min" integer NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "category_budgets" ADD CONSTRAINT "category_budgets_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "emis" ADD CONSTRAINT "emis_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_savings_goal_id_savings_goals_id_fk" FOREIGN KEY ("savings_goal_id") REFERENCES "public"."savings_goals"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "goal_milestones" ADD CONSTRAINT "goal_milestones_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "goals" ADD CONSTRAINT "goals_roadmap_id_roadmaps_id_fk" FOREIGN KEY ("roadmap_id") REFERENCES "public"."roadmaps"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "habit_logs" ADD CONSTRAINT "habit_logs_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "recurring_bills" ADD CONSTRAINT "recurring_bills_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "recurring_bills" ADD CONSTRAINT "recurring_bills_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "roadmap_topics" ADD CONSTRAINT "roadmap_topics_roadmap_id_roadmaps_id_fk" FOREIGN KEY ("roadmap_id") REFERENCES "public"."roadmaps"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "roadmap_topics" ADD CONSTRAINT "roadmap_topics_parent_id_roadmap_topics_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."roadmap_topics"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "task_completions" ADD CONSTRAINT "task_completions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;
