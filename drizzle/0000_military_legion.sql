CREATE TYPE "public"."difficulty" AS ENUM('easy', 'medium', 'hard');--> statement-breakpoint
CREATE TYPE "public"."goal_status" AS ENUM('active', 'done', 'dropped');--> statement-breakpoint
CREATE TYPE "public"."habit_cadence" AS ENUM('daily', 'weekly');--> statement-breakpoint
CREATE TYPE "public"."problem_status" AS ENUM('todo', 'solved', 'revisit');--> statement-breakpoint
CREATE TYPE "public"."progress_source" AS ENUM('manual', 'roadmap');--> statement-breakpoint
CREATE TYPE "public"."topic_kind" AS ENUM('core', 'recommended', 'alternative', 'optional');--> statement-breakpoint
CREATE TYPE "public"."topic_status" AS ENUM('not_started', 'learning', 'done');--> statement-breakpoint
CREATE TABLE "daily_health" (
	"date" date PRIMARY KEY NOT NULL,
	"steps" integer,
	"sleep_hours" real,
	"weight_kg" real
);
--> statement-breakpoint
CREATE TABLE "food_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"item" text NOT NULL,
	"calories" integer,
	"meal" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goal_milestones" (
	"id" serial PRIMARY KEY NOT NULL,
	"goal_id" integer NOT NULL,
	"title" text NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"target_date" date,
	"status" "goal_status" DEFAULT 'active' NOT NULL,
	"progress_source" "progress_source" DEFAULT 'manual' NOT NULL,
	"roadmap_id" integer,
	"manual_progress" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "habit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"habit_id" integer NOT NULL,
	"date" date NOT NULL,
	"done" boolean DEFAULT true NOT NULL,
	CONSTRAINT "habit_logs_habit_date_key" UNIQUE("habit_id","date")
);
--> statement-breakpoint
CREATE TABLE "habits" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"cadence" "habit_cadence" DEFAULT 'daily' NOT NULL,
	"weekly_target" integer,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "problems" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"url" text,
	"difficulty" "difficulty" DEFAULT 'medium' NOT NULL,
	"topic" text DEFAULT '' NOT NULL,
	"status" "problem_status" DEFAULT 'todo' NOT NULL,
	"solved_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "roadmaps" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roadmaps_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "water_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"glasses" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"type" text NOT NULL,
	"duration_min" integer NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "goal_milestones" ADD CONSTRAINT "goal_milestones_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_roadmap_id_roadmaps_id_fk" FOREIGN KEY ("roadmap_id") REFERENCES "public"."roadmaps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habit_logs" ADD CONSTRAINT "habit_logs_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_topics" ADD CONSTRAINT "roadmap_topics_roadmap_id_roadmaps_id_fk" FOREIGN KEY ("roadmap_id") REFERENCES "public"."roadmaps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_topics" ADD CONSTRAINT "roadmap_topics_parent_id_roadmap_topics_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."roadmap_topics"("id") ON DELETE cascade ON UPDATE no action;