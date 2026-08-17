CREATE TYPE "public"."bill_recurrence" AS ENUM('monthly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."meal_type" AS ENUM('breakfast', 'lunch', 'dinner', 'snack');--> statement-breakpoint
CREATE TABLE "app_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"calorie_goal" integer
);
--> statement-breakpoint
CREATE TABLE "category_budgets" (
	"category_id" integer PRIMARY KEY NOT NULL,
	"monthly_amount" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"date" date PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "sleep_logs" (
	"date" date PRIMARY KEY NOT NULL,
	"bed_time" time NOT NULL,
	"wake_time" time NOT NULL,
	"duration_min" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "food_logs" ALTER COLUMN "meal" SET DATA TYPE "public"."meal_type" USING "meal"::"public"."meal_type";--> statement-breakpoint
ALTER TABLE "category_budgets" ADD CONSTRAINT "category_budgets_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_bills" ADD CONSTRAINT "recurring_bills_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_bills" ADD CONSTRAINT "recurring_bills_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_health" DROP COLUMN "sleep_hours";