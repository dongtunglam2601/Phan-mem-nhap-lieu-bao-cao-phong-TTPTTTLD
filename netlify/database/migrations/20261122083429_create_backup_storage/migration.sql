CREATE TABLE "backup_runs" (
	"id" text PRIMARY KEY,
	"status" text NOT NULL,
	"snapshot_revision" integer NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "backup_snapshots" (
	"id" text PRIMARY KEY,
	"payload" jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
