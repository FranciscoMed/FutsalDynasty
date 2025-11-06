/**
 * Migration Script: Add userId Security
 * 
 * This script adds userId columns to all game-related tables for proper
 * data isolation and security. It also creates composite indexes for performance.
 * 
 * Steps:
 * 1. Add userId columns (nullable first)
 * 2. Backfill existing data from save_games
 * 3. Make columns NOT NULL
 * 4. Add foreign key constraints
 * 5. Create composite indexes
 * 6. Create audit_logs table
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const client = neon(process.env.DATABASE_URL);
const db = drizzle(client);

async function migrate() {
  console.log("🔒 Starting userId security migration...\n");

  try {
    // Step 1: Add userId columns (nullable first to allow backfill)
    console.log("📝 Step 1: Adding userId columns...");
    
    await db.execute(sql`ALTER TABLE teams ADD COLUMN IF NOT EXISTS user_id INTEGER`);
    await db.execute(sql`ALTER TABLE players ADD COLUMN IF NOT EXISTS user_id INTEGER`);
    await db.execute(sql`ALTER TABLE matches ADD COLUMN IF NOT EXISTS user_id INTEGER`);
    await db.execute(sql`ALTER TABLE competitions ADD COLUMN IF NOT EXISTS user_id INTEGER`);
    await db.execute(sql`ALTER TABLE transfer_offers ADD COLUMN IF NOT EXISTS user_id INTEGER`);
    await db.execute(sql`ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS user_id INTEGER`);
    await db.execute(sql`ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS user_id INTEGER`);
    await db.execute(sql`ALTER TABLE clubs ADD COLUMN IF NOT EXISTS user_id INTEGER`);
    await db.execute(sql`ALTER TABLE game_states ADD COLUMN IF NOT EXISTS user_id INTEGER`);
    await db.execute(sql`ALTER TABLE training_reports ADD COLUMN IF NOT EXISTS user_id INTEGER`);
    
    console.log("✅ userId columns added\n");

    // Step 2: Clean up orphaned records (records without save_game_id)
    console.log("🧹 Step 2: Cleaning up orphaned records...");
    
    // Delete orphaned records (these are likely old seed data or test data)
    console.log("  🗑️  Deleting records without save_game_id...");
    await db.execute(sql`DELETE FROM teams WHERE save_game_id IS NULL`);
    await db.execute(sql`DELETE FROM players WHERE save_game_id IS NULL`);
    await db.execute(sql`DELETE FROM matches WHERE save_game_id IS NULL`);
    await db.execute(sql`DELETE FROM competitions WHERE save_game_id IS NULL`);
    await db.execute(sql`DELETE FROM transfer_offers WHERE save_game_id IS NULL`);
    await db.execute(sql`DELETE FROM inbox_messages WHERE save_game_id IS NULL`);
    await db.execute(sql`DELETE FROM financial_transactions WHERE save_game_id IS NULL`);
    await db.execute(sql`DELETE FROM clubs WHERE save_game_id IS NULL`);
    await db.execute(sql`DELETE FROM game_states WHERE save_game_id IS NULL`);
    await db.execute(sql`DELETE FROM training_reports WHERE save_game_id IS NULL`);
    
    console.log("✅ Orphaned records cleaned up\n");

    // Step 3: Backfill existing data (get userId from save_games)
    console.log("🔄 Step 3: Backfilling existing data...");
    
    await db.execute(sql`
      UPDATE teams t 
      SET user_id = sg.user_id 
      FROM save_games sg 
      WHERE t.save_game_id = sg.id AND t.user_id IS NULL
    `);
    console.log("  ✓ Teams backfilled");

    await db.execute(sql`
      UPDATE players p 
      SET user_id = sg.user_id 
      FROM save_games sg 
      WHERE p.save_game_id = sg.id AND p.user_id IS NULL
    `);
    console.log("  ✓ Players backfilled");

    await db.execute(sql`
      UPDATE matches m 
      SET user_id = sg.user_id 
      FROM save_games sg 
      WHERE m.save_game_id = sg.id AND m.user_id IS NULL
    `);
    console.log("  ✓ Matches backfilled");

    await db.execute(sql`
      UPDATE competitions c 
      SET user_id = sg.user_id 
      FROM save_games sg 
      WHERE c.save_game_id = sg.id AND c.user_id IS NULL
    `);
    console.log("  ✓ Competitions backfilled");

    await db.execute(sql`
      UPDATE transfer_offers tr 
      SET user_id = sg.user_id 
      FROM save_games sg 
      WHERE tr.save_game_id = sg.id AND tr.user_id IS NULL
    `);
    console.log("  ✓ Transfer offers backfilled");

    await db.execute(sql`
      UPDATE inbox_messages im 
      SET user_id = sg.user_id 
      FROM save_games sg 
      WHERE im.save_game_id = sg.id AND im.user_id IS NULL
    `);
    console.log("  ✓ Inbox messages backfilled");

    await db.execute(sql`
      UPDATE financial_transactions ft 
      SET user_id = sg.user_id 
      FROM save_games sg 
      WHERE ft.save_game_id = sg.id AND ft.user_id IS NULL
    `);
    console.log("  ✓ Financial transactions backfilled");

    await db.execute(sql`
      UPDATE clubs c 
      SET user_id = sg.user_id 
      FROM save_games sg 
      WHERE c.save_game_id = sg.id AND c.user_id IS NULL
    `);
    console.log("  ✓ Clubs backfilled");

    await db.execute(sql`
      UPDATE game_states gs 
      SET user_id = sg.user_id 
      FROM save_games sg 
      WHERE gs.save_game_id = sg.id AND gs.user_id IS NULL
    `);
    console.log("  ✓ Game states backfilled");

    await db.execute(sql`
      UPDATE training_reports tr 
      SET user_id = sg.user_id 
      FROM save_games sg 
      WHERE tr.save_game_id = sg.id AND tr.user_id IS NULL
    `);
    console.log("  ✓ Training reports backfilled");
    
    console.log("✅ Data backfill complete\n");

    // Step 4: Make columns NOT NULL
    console.log("🔒 Step 4: Enforcing NOT NULL constraints...");
    
    await db.execute(sql`ALTER TABLE teams ALTER COLUMN user_id SET NOT NULL`);
    await db.execute(sql`ALTER TABLE players ALTER COLUMN user_id SET NOT NULL`);
    await db.execute(sql`ALTER TABLE matches ALTER COLUMN user_id SET NOT NULL`);
    await db.execute(sql`ALTER TABLE competitions ALTER COLUMN user_id SET NOT NULL`);
    await db.execute(sql`ALTER TABLE transfer_offers ALTER COLUMN user_id SET NOT NULL`);
    await db.execute(sql`ALTER TABLE inbox_messages ALTER COLUMN user_id SET NOT NULL`);
    await db.execute(sql`ALTER TABLE financial_transactions ALTER COLUMN user_id SET NOT NULL`);
    await db.execute(sql`ALTER TABLE clubs ALTER COLUMN user_id SET NOT NULL`);
    await db.execute(sql`ALTER TABLE game_states ALTER COLUMN user_id SET NOT NULL`);
    await db.execute(sql`ALTER TABLE training_reports ALTER COLUMN user_id SET NOT NULL`);
    
    console.log("✅ NOT NULL constraints added\n");

    // Step 5: Add foreign key constraints
    console.log("🔗 Step 5: Adding foreign key constraints...");
    
    await db.execute(sql`ALTER TABLE teams ADD CONSTRAINT teams_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`);
    await db.execute(sql`ALTER TABLE players ADD CONSTRAINT players_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`);
    await db.execute(sql`ALTER TABLE matches ADD CONSTRAINT matches_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`);
    await db.execute(sql`ALTER TABLE competitions ADD CONSTRAINT competitions_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`);
    await db.execute(sql`ALTER TABLE transfer_offers ADD CONSTRAINT transfer_offers_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`);
    await db.execute(sql`ALTER TABLE inbox_messages ADD CONSTRAINT inbox_messages_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`);
    await db.execute(sql`ALTER TABLE financial_transactions ADD CONSTRAINT financial_transactions_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`);
    await db.execute(sql`ALTER TABLE clubs ADD CONSTRAINT clubs_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`);
    await db.execute(sql`ALTER TABLE game_states ADD CONSTRAINT game_states_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`);
    await db.execute(sql`ALTER TABLE training_reports ADD CONSTRAINT training_reports_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`);
    
    console.log("✅ Foreign key constraints added\n");

    // Step 6: Also add foreign keys for save_game_id while we're at it
    console.log("🔗 Step 6: Adding save_game_id foreign key constraints...");
    
    await db.execute(sql`ALTER TABLE teams ADD CONSTRAINT teams_save_game_id_fk FOREIGN KEY (save_game_id) REFERENCES save_games(id) ON DELETE CASCADE`);
    await db.execute(sql`ALTER TABLE players ADD CONSTRAINT players_save_game_id_fk FOREIGN KEY (save_game_id) REFERENCES save_games(id) ON DELETE CASCADE`);
    await db.execute(sql`ALTER TABLE matches ADD CONSTRAINT matches_save_game_id_fk FOREIGN KEY (save_game_id) REFERENCES save_games(id) ON DELETE CASCADE`);
    await db.execute(sql`ALTER TABLE competitions ADD CONSTRAINT competitions_save_game_id_fk FOREIGN KEY (save_game_id) REFERENCES save_games(id) ON DELETE CASCADE`);
    await db.execute(sql`ALTER TABLE transfer_offers ADD CONSTRAINT transfer_offers_save_game_id_fk FOREIGN KEY (save_game_id) REFERENCES save_games(id) ON DELETE CASCADE`);
    await db.execute(sql`ALTER TABLE inbox_messages ADD CONSTRAINT inbox_messages_save_game_id_fk FOREIGN KEY (save_game_id) REFERENCES save_games(id) ON DELETE CASCADE`);
    await db.execute(sql`ALTER TABLE financial_transactions ADD CONSTRAINT financial_transactions_save_game_id_fk FOREIGN KEY (save_game_id) REFERENCES save_games(id) ON DELETE CASCADE`);
    await db.execute(sql`ALTER TABLE clubs ADD CONSTRAINT clubs_save_game_id_fk FOREIGN KEY (save_game_id) REFERENCES save_games(id) ON DELETE CASCADE`);
    await db.execute(sql`ALTER TABLE game_states ADD CONSTRAINT game_states_save_game_id_fk FOREIGN KEY (save_game_id) REFERENCES save_games(id) ON DELETE CASCADE`);
    await db.execute(sql`ALTER TABLE training_reports ADD CONSTRAINT training_reports_save_game_id_fk FOREIGN KEY (save_game_id) REFERENCES save_games(id) ON DELETE CASCADE`);
    
    console.log("✅ save_game_id foreign key constraints added\n");

    // Step 7: Create composite indexes for performance
    console.log("📊 Step 7: Creating performance indexes...");
    
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_teams_user_savegame ON teams(user_id, save_game_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_players_user_savegame ON players(user_id, save_game_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_matches_user_savegame ON matches(user_id, save_game_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_competitions_user_savegame ON competitions(user_id, save_game_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_transfer_offers_user_savegame ON transfer_offers(user_id, save_game_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_inbox_messages_user_savegame ON inbox_messages(user_id, save_game_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_financial_transactions_user_savegame ON financial_transactions(user_id, save_game_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_clubs_user_savegame ON clubs(user_id, save_game_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_game_states_user_savegame ON game_states(user_id, save_game_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_training_reports_user_savegame ON training_reports(user_id, save_game_id)`);
    
    console.log("✅ Composite indexes created\n");

    // Step 8: Create audit_logs table
    console.log("📋 Step 8: Creating audit_logs table...");
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        save_game_id INTEGER,
        action TEXT NOT NULL,
        details JSONB,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    console.log("✅ audit_logs table created\n");

    console.log("🎉 Migration complete! All tables now have userId security.\n");
    console.log("Summary:");
    console.log("  ✓ 10 tables updated with userId columns");
    console.log("  ✓ All existing data backfilled");
    console.log("  ✓ NOT NULL constraints enforced");
    console.log("  ✓ Foreign key constraints added");
    console.log("  ✓ 10 composite indexes created");
    console.log("  ✓ audit_logs table created");

  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    throw error;
  }
}

// Run migration
migrate()
  .then(() => {
    console.log("\n✨ Migration completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Migration failed:", error);
    process.exit(1);
  });
