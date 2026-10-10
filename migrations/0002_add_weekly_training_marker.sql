ALTER TABLE "game_states"
ADD COLUMN IF NOT EXISTS "last_training_week" varchar(10);
