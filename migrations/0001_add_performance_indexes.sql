-- Add performance indexes to critical tables
-- These indexes will dramatically improve query performance for common operations

-- Players table indexes
CREATE INDEX IF NOT EXISTS "players_user_save_idx" ON "players" ("user_id", "save_game_id");
CREATE INDEX IF NOT EXISTS "players_team_idx" ON "players" ("team_id");

-- Teams table indexes
CREATE INDEX IF NOT EXISTS "teams_user_save_idx" ON "teams" ("user_id", "save_game_id");

-- Matches table indexes
CREATE INDEX IF NOT EXISTS "matches_user_save_idx" ON "matches" ("user_id", "save_game_id");
CREATE INDEX IF NOT EXISTS "matches_competition_idx" ON "matches" ("competition_id");
CREATE INDEX IF NOT EXISTS "matches_teams_idx" ON "matches" ("home_team_id", "away_team_id");
CREATE INDEX IF NOT EXISTS "matches_date_idx" ON "matches" ("date");

-- Competitions table indexes
CREATE INDEX IF NOT EXISTS "competitions_user_save_idx" ON "competitions" ("user_id", "save_game_id");

-- Game states table indexes
CREATE INDEX IF NOT EXISTS "game_states_user_save_idx" ON "game_states" ("user_id", "save_game_id");
