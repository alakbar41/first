CREATE TABLE "candidates" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"student_id" text NOT NULL,
	"faculty" text NOT NULL,
	"position" text NOT NULL,
	"status" text DEFAULT 'inactive' NOT NULL,
	"picture_url" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "candidates_student_id_unique" UNIQUE("student_id")
);
--> statement-breakpoint
CREATE TABLE "election_candidates" (
	"id" serial PRIMARY KEY NOT NULL,
	"election_start_time" timestamp NOT NULL,
	"candidate_student_id" text NOT NULL,
	"running_mate_student_id" text,
	"composite_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "elections" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"position" text NOT NULL,
	"description" text NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"eligible_faculties" text[] NOT NULL,
	"status" text DEFAULT 'upcoming' NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "elections_start_time_unique" UNIQUE("start_time")
);
--> statement-breakpoint
CREATE TABLE "pending_users" (
	"email" text PRIMARY KEY NOT NULL,
	"password" text NOT NULL,
	"faculty" text NOT NULL,
	"otp" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"type" text DEFAULT 'registration' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"faculty" text NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "voting_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"election_start_time" timestamp NOT NULL,
	"token" text NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "voting_tokens_token_unique" UNIQUE("token")
);
