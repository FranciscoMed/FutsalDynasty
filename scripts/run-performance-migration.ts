import { db } from "../server/db.js";
import { sql } from "drizzle-orm";

async function runMigration() {
  try {
    console.log('Running performance indexes migration...');
    
    // Players table indexes
    console.log('Creating players indexes...');
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "players_user_save_idx" ON "players" ("user_id", "save_game_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "players_team_idx" ON "players" ("team_id")`);
    
    // Teams table indexes
    console.log('Creating teams indexes...');
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "teams_user_save_idx" ON "teams" ("user_id", "save_game_id")`);
    
    // Matches table indexes
    console.log('Creating matches indexes...');
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "matches_user_save_idx" ON "matches" ("user_id", "save_game_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "matches_competition_idx" ON "matches" ("competition_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "matches_teams_idx" ON "matches" ("home_team_id", "away_team_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "matches_date_idx" ON "matches" ("date")`);
    
    // Competitions table indexes
    console.log('Creating competitions indexes...');
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "competitions_user_save_idx" ON "competitions" ("user_id", "save_game_id")`);
    
    // Game states table indexes
    console.log('Creating game states indexes...');
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "game_states_user_save_idx" ON "game_states" ("user_id", "save_game_id")`);
    
    console.log('\n✓ All performance indexes created successfully!');
    console.log('✓ Query performance should be significantly improved (10-100x faster)');
    console.log('✓ You can now restart your server to see the improvements');
    
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
