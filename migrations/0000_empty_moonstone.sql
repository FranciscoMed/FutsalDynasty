CREATE TABLE "clubs" (
	"id" serial PRIMARY KEY NOT NULL,
	"save_game_id" integer,
	"name" varchar(255) NOT NULL,
	"stadium" varchar(255) NOT NULL,
	"reputation" integer NOT NULL,
	"budget" integer NOT NULL,
	"wage_budget" integer NOT NULL,
	"training_facility_level" integer DEFAULT 1 NOT NULL,
	"stadium_capacity" integer NOT NULL,
	"youth_academy_level" integer DEFAULT 1 NOT NULL,
	"staff" jsonb NOT NULL,
	"board_objectives" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"save_game_id" integer,
	"name" varchar(255) NOT NULL,
	"type" varchar(20) NOT NULL,
	"season" integer NOT NULL,
	"teams" jsonb NOT NULL,
	"standings" jsonb NOT NULL,
	"current_matchday" integer DEFAULT 0 NOT NULL,
	"total_matchdays" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"save_game_id" integer,
	"date" timestamp NOT NULL,
	"type" varchar(10) NOT NULL,
	"category" varchar(20) NOT NULL,
	"amount" integer NOT NULL,
	"description" varchar(500) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_states" (
	"id" serial PRIMARY KEY NOT NULL,
	"current_date" timestamp NOT NULL,
	"season" integer NOT NULL,
	"current_month" integer NOT NULL,
	"player_team_id" integer NOT NULL,
	"next_match_id" integer,
	"monthly_training_in_progress" boolean DEFAULT true NOT NULL,
	"last_training_report_month" integer NOT NULL,
	"save_game_id" integer
);
--> statement-breakpoint
CREATE TABLE "inbox_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"save_game_id" integer,
	"category" varchar(20) NOT NULL,
	"subject" varchar(500) NOT NULL,
	"body" text NOT NULL,
	"from" varchar(255) NOT NULL,
	"date" timestamp NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"starred" boolean DEFAULT false NOT NULL,
	"priority" varchar(10) NOT NULL,
	"action_link" varchar(500)
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" serial PRIMARY KEY NOT NULL,
	"save_game_id" integer,
	"competition_id" integer NOT NULL,
	"competition_type" varchar(20) NOT NULL,
	"home_team_id" integer NOT NULL,
	"away_team_id" integer NOT NULL,
	"home_score" integer DEFAULT 0 NOT NULL,
	"away_score" integer DEFAULT 0 NOT NULL,
	"date" timestamp NOT NULL,
	"played" boolean DEFAULT false NOT NULL,
	"preparation_status" varchar(20) DEFAULT 'pending',
	"events" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"home_stats" jsonb NOT NULL,
	"away_stats" jsonb NOT NULL,
	"player_ratings" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" serial PRIMARY KEY NOT NULL,
	"save_game_id" integer,
	"name" varchar(255) NOT NULL,
	"age" integer NOT NULL,
	"position" varchar(20) NOT NULL,
	"nationality" varchar(100) NOT NULL,
	"attributes" jsonb NOT NULL,
	"potential" integer NOT NULL,
	"current_ability" integer NOT NULL,
	"form" integer NOT NULL,
	"morale" integer NOT NULL,
	"fitness" integer NOT NULL,
	"condition" integer NOT NULL,
	"injured" boolean DEFAULT false NOT NULL,
	"injury_days_remaining" integer DEFAULT 0 NOT NULL,
	"suspended" boolean DEFAULT false NOT NULL,
	"suspension_matches_remaining" integer DEFAULT 0 NOT NULL,
	"yellow_cards" integer DEFAULT 0 NOT NULL,
	"red_cards" integer DEFAULT 0 NOT NULL,
	"contract" jsonb NOT NULL,
	"value" integer NOT NULL,
	"team_id" integer NOT NULL,
	"training_focus" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "save_games" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"current_date" timestamp NOT NULL,
	"season" integer NOT NULL,
	"player_team_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"save_game_id" integer,
	"name" varchar(255) NOT NULL,
	"abbreviation" varchar(10) NOT NULL,
	"reputation" integer NOT NULL,
	"budget" integer NOT NULL,
	"wage_budget" integer NOT NULL,
	"stadium" varchar(255) NOT NULL,
	"formation" varchar(10) NOT NULL,
	"tactical_preset" varchar(20) NOT NULL,
	"starting_lineup" jsonb NOT NULL,
	"substitutes" jsonb NOT NULL,
	"is_player_team" boolean DEFAULT false NOT NULL,
	"tactics" jsonb
);
--> statement-breakpoint
CREATE TABLE "training_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"save_game_id" integer,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"player_improvements" jsonb NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transfer_offers" (
	"id" serial PRIMARY KEY NOT NULL,
	"save_game_id" integer,
	"player_id" integer NOT NULL,
	"from_team_id" integer NOT NULL,
	"to_team_id" integer NOT NULL,
	"offer_amount" integer NOT NULL,
	"wage_offer" integer NOT NULL,
	"status" varchar(20) NOT NULL,
	"date" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(100) NOT NULL,
	"password" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
