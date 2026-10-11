ALTER TABLE "matches"
ADD COLUMN IF NOT EXISTS "preparation" jsonb;
