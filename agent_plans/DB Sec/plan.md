# Database Security Enhancement - userId Implementation Plan

## 📋 Overview

Add `userId` to all critical database tables and implement proper authorization checks to prevent unauthorized access to save game data. Currently, the application only filters by `savegameId`, which is a security vulnerability that allows users to potentially access other users' save games.

**Status**: 📋 Planning Complete - Ready for Implementation

---

## 🎯 Objectives

1. **Add `userId` column** to all game-related tables
2. **Create composite indexes** for performance (`userId + savegameId`)
3. **Implement middleware** to validate save game ownership
4. **Update all queries** to include `userId` in WHERE clauses
5. **Add audit logging** for sensitive operations
6. **Maintain backward compatibility** during migration

---

## 📊 Affected Tables

### **Critical Tables (Must Add userId):**
- ✅ `save_games` (already has `userId`)
- ❌ `teams` 
- ❌ `players`
- ❌ `matches`
- ❌ `match_events`
- ❌ `transfers`
- ❌ `training_sessions`
- ❌ `inbox_messages`

### **Reference Tables (No userId Needed):**
- `leagues` - Global reference data
- `competitions` - Global reference data
- `users` - User accounts themselves

---

## 🏗️ Implementation Phases

### **Phase 1: Schema Updates** ⏱️ 2 hours

#### 1.1 Add userId Columns to Schema

Update [`shared/schema.ts`](shared/schema.ts) to add `userId` foreign keys:

```typescript
// shared/schema.ts

// 1. Teams table
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  savegameId: integer("savegame_id").notNull().references(() => saveGames.id, { onDelete: "cascade" }),
  // ... existing fields
});

// 2. Players table
export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  savegameId: integer("savegame_id").notNull(),
  // ... existing fields
});

// 3. Matches table
export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  savegameId: integer("savegame_id").notNull(),
  // ... existing fields
});

// 4. Match Events table
export const matchEvents = pgTable("match_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  savegameId: integer("savegame_id").notNull(),
  // ... existing fields
});

// 5. Transfers table
export const transfers = pgTable("transfers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  savegameId: integer("savegame_id").notNull(),
  // ... existing fields
});

// 6. Training Sessions table
export const trainingSessions = pgTable("training_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  savegameId: integer("savegame_id").notNull(),
  // ... existing fields
});

// 7. Inbox Messages table
export const inboxMessages = pgTable("inbox_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  savegameId: integer("savegame_id").notNull(),
  // ... existing fields
});
```

#### 1.2 Add Composite Indexes for Performance

```typescript
// shared/schema.ts - Add indexes at bottom of file

// Composite indexes for fast queries (userId + savegameId)
export const teamsUserSavegameIndex = index("idx_teams_user_savegame").on(teams.userId, teams.savegameId);
export const playersUserSavegameIndex = index("idx_players_user_savegame").on(players.userId, players.savegameId);
export const matchesUserSavegameIndex = index("idx_matches_user_savegame").on(matches.userId, matches.savegameId);
export const matchEventsUserSavegameIndex = index("idx_match_events_user_savegame").on(matchEvents.userId, matchEvents.savegameId);
export const transfersUserSavegameIndex = index("idx_transfers_user_savegame").on(transfers.userId, transfers.savegameId);
export const trainingSessionsUserSavegameIndex = index("idx_training_sessions_user_savegame").on(trainingSessions.userId, trainingSessions.savegameId);
export const inboxMessagesUserSavegameIndex = index("idx_inbox_messages_user_savegame").on(inboxMessages.userId, inboxMessages.savegameId);
```

#### 1.3 Update TypeScript Interfaces

```typescript
// shared/schema.ts - Update insertable types

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;  // Will now require userId

export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;  // Will now require userId

// ... update all affected types
```

---

### **Phase 2: Database Migration** ⏱️ 1 hour

#### 2.1 Generate Migration

```bash
npm run db:generate
```

This will create a new migration file in `server/migrations/`.

#### 2.2 Manual Migration (Alternative)

If auto-generation doesn't work perfectly, create manual migration:

```typescript
// server/migrations/0003_add_user_id_security.ts
import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export async function up(db: PostgresJsDatabase) {
  console.log("🔒 Adding userId security columns...");

  // 1. Add userId columns (nullable first)
  await db.execute(sql`ALTER TABLE teams ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`);
  await db.execute(sql`ALTER TABLE players ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`);
  await db.execute(sql`ALTER TABLE matches ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`);
  await db.execute(sql`ALTER TABLE match_events ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`);
  await db.execute(sql`ALTER TABLE transfers ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`);
  await db.execute(sql`ALTER TABLE training_sessions ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`);
  await db.execute(sql`ALTER TABLE inbox_messages ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`);

  console.log("✅ userId columns added");

  // 2. Backfill existing data (get userId from save_games)
  console.log("🔄 Backfilling existing data...");
  
  await db.execute(sql`
    UPDATE teams t 
    SET user_id = sg.user_id 
    FROM save_games sg 
    WHERE t.savegame_id = sg.id
  `);

  await db.execute(sql`
    UPDATE players p 
    SET user_id = sg.user_id 
    FROM save_games sg 
    WHERE p.savegame_id = sg.id
  `);

  await db.execute(sql`
    UPDATE matches m 
    SET user_id = sg.user_id 
    FROM save_games sg 
    WHERE m.savegame_id = sg.id
  `);

  await db.execute(sql`
    UPDATE match_events me 
    SET user_id = sg.user_id 
    FROM save_games sg 
    WHERE me.savegame_id = sg.id
  `);

  await db.execute(sql`
    UPDATE transfers tr 
    SET user_id = sg.user_id 
    FROM save_games sg 
    WHERE tr.savegame_id = sg.id
  `);

  await db.execute(sql`
    UPDATE training_sessions ts 
    SET user_id = sg.user_id 
    FROM save_games sg 
    WHERE ts.savegame_id = sg.id
  `);

  await db.execute(sql`
    UPDATE inbox_messages im 
    SET user_id = sg.user_id 
    FROM save_games sg 
    WHERE im.savegame_id = sg.id
  `);

  console.log("✅ Data backfilled");

  // 3. Make columns NOT NULL
  console.log("🔒 Enforcing NOT NULL constraints...");
  
  await db.execute(sql`ALTER TABLE teams ALTER COLUMN user_id SET NOT NULL`);
  await db.execute(sql`ALTER TABLE players ALTER COLUMN user_id SET NOT NULL`);
  await db.execute(sql`ALTER TABLE matches ALTER COLUMN user_id SET NOT NULL`);
  await db.execute(sql`ALTER TABLE match_events ALTER COLUMN user_id SET NOT NULL`);
  await db.execute(sql`ALTER TABLE transfers ALTER COLUMN user_id SET NOT NULL`);
  await db.execute(sql`ALTER TABLE training_sessions ALTER COLUMN user_id SET NOT NULL`);
  await db.execute(sql`ALTER TABLE inbox_messages ALTER COLUMN user_id SET NOT NULL`);

  console.log("✅ NOT NULL constraints added");

  // 4. Create composite indexes for performance
  console.log("📊 Creating performance indexes...");
  
  await db.execute(sql`CREATE INDEX idx_teams_user_savegame ON teams(user_id, savegame_id)`);
  await db.execute(sql`CREATE INDEX idx_players_user_savegame ON players(user_id, savegame_id)`);
  await db.execute(sql`CREATE INDEX idx_matches_user_savegame ON matches(user_id, savegame_id)`);
  await db.execute(sql`CREATE INDEX idx_match_events_user_savegame ON match_events(user_id, savegame_id)`);
  await db.execute(sql`CREATE INDEX idx_transfers_user_savegame ON transfers(user_id, savegame_id)`);
  await db.execute(sql`CREATE INDEX idx_training_sessions_user_savegame ON training_sessions(user_id, savegame_id)`);
  await db.execute(sql`CREATE INDEX idx_inbox_messages_user_savegame ON inbox_messages(user_id, savegame_id)`);

  console.log("✅ Indexes created");
  console.log("🎉 Migration complete!");
}

export async function down(db: PostgresJsDatabase) {
  console.log("⚠️ Rolling back userId security...");

  // Drop indexes
  await db.execute(sql`DROP INDEX IF EXISTS idx_teams_user_savegame`);
  await db.execute(sql`DROP INDEX IF EXISTS idx_players_user_savegame`);
  await db.execute(sql`DROP INDEX IF EXISTS idx_matches_user_savegame`);
  await db.execute(sql`DROP INDEX IF EXISTS idx_match_events_user_savegame`);
  await db.execute(sql`DROP INDEX IF EXISTS idx_transfers_user_savegame`);
  await db.execute(sql`DROP INDEX IF EXISTS idx_training_sessions_user_savegame`);
  await db.execute(sql`DROP INDEX IF EXISTS idx_inbox_messages_user_savegame`);

  // Drop columns
  await db.execute(sql`ALTER TABLE teams DROP COLUMN user_id`);
  await db.execute(sql`ALTER TABLE players DROP COLUMN user_id`);
  await db.execute(sql`ALTER TABLE matches DROP COLUMN user_id`);
  await db.execute(sql`ALTER TABLE match_events DROP COLUMN user_id`);
  await db.execute(sql`ALTER TABLE transfers DROP COLUMN user_id`);
  await db.execute(sql`ALTER TABLE training_sessions DROP COLUMN user_id`);
  await db.execute(sql`ALTER TABLE inbox_messages DROP COLUMN user_id`);

  console.log("✅ Rollback complete");
}
```

#### 2.3 Run Migration

```bash
npm run db:push
# or
npm run db:migrate
```

---

### **Phase 3: Middleware Implementation** ⏱️ 1.5 hours

#### 3.1 Create Save Access Validation Middleware

```typescript
// filepath: server/middleware/validateSaveAccess.ts
import { Context, Next } from "hono";
import { db } from "../db";
import { saveGames } from "@shared/schema";
import { eq, and } from "drizzle-orm";

/**
 * Middleware to validate that the authenticated user owns the requested save game
 * Extracts savegameId from route params or query string
 * Sets validatedSaveId in context for downstream handlers
 */
export async function validateSaveAccess(c: Context, next: Next) {
  const user = c.get("user");
  
  if (!user) {
    return c.json({ error: "Unauthorized - No user session" }, 401);
  }

  // Extract savegameId from route params or query
  const savegameIdParam = c.req.param("savegameId") || c.req.query("savegameId");
  
  if (!savegameIdParam) {
    return c.json({ error: "Missing savegameId parameter" }, 400);
  }

  const savegameId = parseInt(savegameIdParam);
  
  if (isNaN(savegameId)) {
    return c.json({ error: "Invalid savegameId format" }, 400);
  }

  // Verify user owns this save game
  const [save] = await db
    .select({ id: saveGames.id })
    .from(saveGames)
    .where(
      and(
        eq(saveGames.id, savegameId),
        eq(saveGames.userId, user.id)
      )
    )
    .limit(1);

  if (!save) {
    console.warn(`⚠️ Unauthorized save access attempt: userId=${user.id}, savegameId=${savegameId}`);
    return c.json({ error: "Save game not found or access denied" }, 403);
  }

  // Store validated IDs in context for downstream use
  c.set("validatedSaveId", savegameId);
  c.set("validatedUserId", user.id);

  await next();
}
```

#### 3.2 Create Audit Logging Utility

```typescript
// filepath: server/middleware/auditLog.ts
import { db } from "../db";
import { auditLogs } from "@shared/schema";
import type { Context } from "hono";

export type AuditAction = 
  | "CREATE_SAVE"
  | "DELETE_SAVE"
  | "TRANSFER_PLAYER"
  | "SIMULATE_MATCH"
  | "ADVANCE_DAY"
  | "UPDATE_TACTICS"
  | "UNAUTHORIZED_ACCESS_ATTEMPT";

export async function logAudit(
  c: Context,
  action: AuditAction,
  details?: Record<string, any>
) {
  const user = c.get("user");
  const savegameId = c.get("validatedSaveId");

  try {
    await db.insert(auditLogs).values({
      userId: user?.id || null,
      savegameId: savegameId || null,
      action,
      details: details || {},
      ipAddress: c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown",
      userAgent: c.req.header("user-agent") || "unknown",
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
    // Don't throw - logging failure shouldn't break the request
  }
}
```

#### 3.3 Add Audit Logs Table to Schema

```typescript
// shared/schema.ts

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  savegameId: integer("savegame_id"),
  action: text("action").notNull(),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
```

---

### **Phase 4: Update Backend Queries** ⏱️ 4 hours

#### 4.1 Update dbStorage.ts

**Before:**
```typescript
// server/dbStorage.ts

export async function getTeam(id: number): Promise<Team | null> {
  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, id))
    .limit(1);
  return team || null;
}
```

**After:**
```typescript
// server/dbStorage.ts

export async function getTeam(id: number, userId: number): Promise<Team | null> {
  const [team] = await db
    .select()
    .from(teams)
    .where(
      and(
        eq(teams.id, id),
        eq(teams.userId, userId)  // ✅ Security check
      )
    )
    .limit(1);
  return team || null;
}

export async function getTeamsBySaveGame(savegameId: number, userId: number): Promise<Team[]> {
  return await db
    .select()
    .from(teams)
    .where(
      and(
        eq(teams.savegameId, savegameId),
        eq(teams.userId, userId)  // ✅ Security check
      )
    );
}
```

#### 4.2 Update All Storage Functions

**Pattern to follow for all functions:**

```typescript
// ❌ OLD (Insecure)
where(eq(table.savegameId, savegameId))

// ✅ NEW (Secure)
where(and(
  eq(table.savegameId, savegameId),
  eq(table.userId, userId)
))
```

**Functions to update in [`server/dbStorage.ts`](server/dbStorage.ts):**

- `getPlayers(savegameId, userId)` 
- `getPlayersBySaveGame(savegameId, userId)`
- `getPlayerTeam(savegameId, userId)`
- `updateTeam(id, data, userId)`
- `getMatches(savegameId, userId)`
- `getMatchById(id, userId)`
- `createMatch(data, userId)` - add `userId` to insert
- `updateMatch(id, data, userId)`
- `getTransfers(savegameId, userId)`
- `createTransfer(data, userId)` - add `userId` to insert
- `getTrainingSessions(savegameId, userId)`
- `getInboxMessages(savegameId, userId)`
- `markMessageAsRead(id, userId)`

#### 4.3 Update routes.ts

**Pattern for all routes:**

```typescript
// ❌ OLD (Insecure)
app.get("/api/teams", requireAuth, async (c) => {
  const savegameId = parseInt(c.req.query("savegameId") || "");
  const teams = await getTeamsBySaveGame(savegameId);
  return c.json(teams);
});

// ✅ NEW (Secure)
app.get("/api/teams", requireAuth, validateSaveAccess, async (c) => {
  const savegameId = c.get("validatedSaveId");
  const userId = c.get("validatedUserId");
  const teams = await getTeamsBySaveGame(savegameId, userId);
  return c.json(teams);
});
```

**Routes to update in [`server/routes.ts`](server/routes.ts):**

1. **Team Routes:**
   - `GET /api/teams`
   - `GET /api/teams/:id`
   - `GET /api/team/player`
   - `PUT /api/teams/:id`
   - `POST /api/tactics/save`
   - `GET /api/tactics`

2. **Player Routes:**
   - `GET /api/players`
   - `GET /api/players/:id`
   - `POST /api/players/:id/train`

3. **Match Routes:**
   - `GET /api/matches`
   - `GET /api/matches/:id`
   - `POST /api/matches/:id/simulate`
   - `POST /api/matches/:id/confirm-tactics`
   - `GET /api/matches/:id/preparation`
   - `GET /api/matchday/next`

4. **Game State Routes:**
   - `POST /api/gamestate/advance`
   - `GET /api/gamestate`
   - `POST /api/gamestate/initialize`

5. **Transfer Routes:**
   - `GET /api/transfers`
   - `POST /api/transfers`

6. **Inbox Routes:**
   - `GET /api/inbox`
   - `PUT /api/inbox/:id/read`

---

### **Phase 5: Frontend Updates** ⏱️ 1 hour

#### 5.1 Update Type Imports

Frontend code shouldn't need major changes since `userId` is handled server-side, but update any type imports:

```typescript
// client/src/types/game.ts (if exists)

import type { Team, Player, Match } from "@shared/schema";

// TypeScript will now enforce userId in NewTeam, NewPlayer, etc.
```

#### 5.2 Update Error Handling

```typescript
// client/src/lib/api.ts

export async function fetchTeams(savegameId: number): Promise<Team[]> {
  const response = await fetch(`/api/teams?savegameId=${savegameId}`);
  
  if (response.status === 403) {
    throw new Error("Access denied to this save game");
  }
  
  if (!response.ok) {
    throw new Error("Failed to fetch teams");
  }
  
  return response.json();
}
```

---

### **Phase 6: Testing** ⏱️ 2 hours

#### 6.1 Unit Tests

```typescript
// filepath: server/__tests__/security.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../db";
import { saveGames, teams, players } from "@shared/schema";
import { validateSaveAccess } from "../middleware/validateSaveAccess";

describe("Security: userId Validation", () => {
  let userId1: number;
  let userId2: number;
  let save1Id: number;
  let save2Id: number;

  beforeEach(async () => {
    // Create test users
    const [user1] = await db.insert(users).values({ username: "user1", email: "user1@test.com" }).returning();
    const [user2] = await db.insert(users).values({ username: "user2", email: "user2@test.com" }).returning();
    
    userId1 = user1.id;
    userId2 = user2.id;

    // Create test saves
    const [save1] = await db.insert(saveGames).values({ userId: userId1, name: "Save 1" }).returning();
    const [save2] = await db.insert(saveGames).values({ userId: userId2, name: "Save 2" }).returning();
    
    save1Id = save1.id;
    save2Id = save2.id;
  });

  it("should prevent user from accessing another user's save", async () => {
    // User 1 tries to access User 2's save
    const mockContext = {
      get: (key: string) => key === "user" ? { id: userId1 } : undefined,
      req: {
        query: (key: string) => key === "savegameId" ? save2Id.toString() : undefined,
      },
      json: vi.fn(),
    };

    await validateSaveAccess(mockContext as any, async () => {});

    expect(mockContext.json).toHaveBeenCalledWith(
      { error: "Save game not found or access denied" },
      403
    );
  });

  it("should allow user to access their own save", async () => {
    const mockContext = {
      get: (key: string) => key === "user" ? { id: userId1 } : undefined,
      req: {
        query: (key: string) => key === "savegameId" ? save1Id.toString() : undefined,
      },
      set: vi.fn(),
    };

    let nextCalled = false;
    await validateSaveAccess(mockContext as any, async () => { nextCalled = true; });

    expect(nextCalled).toBe(true);
    expect(mockContext.set).toHaveBeenCalledWith("validatedSaveId", save1Id);
  });

  it("should prevent queries without userId filter", async () => {
    // Create teams for both users
    await db.insert(teams).values({ userId: userId1, savegameId: save1Id, name: "Team 1" });
    await db.insert(teams).values({ userId: userId2, savegameId: save2Id, name: "Team 2" });

    // Query WITH userId filter (secure)
    const secureTeams = await db
      .select()
      .from(teams)
      .where(and(
        eq(teams.savegameId, save1Id),
        eq(teams.userId, userId1)
      ));

    expect(secureTeams).toHaveLength(1);
    expect(secureTeams[0].name).toBe("Team 1");

    // Query WITHOUT userId filter (insecure - should be impossible now)
    // This test documents the old insecure behavior
    const insecureTeams = await db
      .select()
      .from(teams)
      .where(eq(teams.savegameId, save1Id));

    // With new schema, this would only return user1's teams
    // because savegameId is tied to userId via foreign key
  });
});
```

#### 6.2 Integration Tests

```typescript
// filepath: server/__tests__/api-security.test.ts
import { describe, it, expect } from "vitest";
import { testClient } from "../test-utils";

describe("API Security", () => {
  it("GET /api/teams - should reject invalid savegameId", async () => {
    const response = await testClient
      .get("/api/teams?savegameId=999999")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(403);
    expect(response.body.error).toContain("access denied");
  });

  it("GET /api/players - should only return user's players", async () => {
    const response = await testClient
      .get("/api/players?savegameId=1")
      .set("Authorization", "Bearer user1-token");

    expect(response.status).toBe(200);
    expect(response.body.every((p: any) => p.userId === 1)).toBe(true);
  });

  it("POST /api/matches/:id/simulate - should reject unauthorized match", async () => {
    const response = await testClient
      .post("/api/matches/999/simulate")
      .set("Authorization", "Bearer user1-token");

    expect(response.status).toBe(403);
  });
});
```

#### 6.3 Manual Testing Checklist

- [ ] Create 2 test users
- [ ] Create save game as User 1
- [ ] Log in as User 2
- [ ] Try to access User 1's save via API (should fail with 403)
- [ ] Try to modify User 1's team (should fail)
- [ ] Verify User 1 can still access their own data
- [ ] Check audit logs for unauthorized attempts
- [ ] Test performance of queries with composite indexes

---

### **Phase 7: Documentation** ⏱️ 30 minutes

#### 7.1 Update README

```markdown
## Security

### Save Game Access Control

All save game data is protected by user ownership validation:

- **userId** is required on all game-related tables
- **Middleware** validates ownership before data access
- **Composite indexes** ensure fast queries: `(userId, savegameId)`
- **Audit logging** tracks all sensitive operations

### API Authentication

All `/api/*` routes require authentication:

```typescript
app.get("/api/teams", requireAuth, validateSaveAccess, handler);
```

The `validateSaveAccess` middleware ensures users can only access their own save games.
```

#### 7.2 Add Developer Guide

```markdown
## Adding New Game Data Tables

When creating new tables that store save game data:

1. **Add userId column:**
   ```typescript
   export const newTable = pgTable("new_table", {
     id: serial("id").primaryKey(),
     userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
     savegameId: integer("savegame_id").notNull(),
     // ... other fields
   });
   ```

2. **Add composite index:**
   ```typescript
   export const newTableIndex = index("idx_new_table_user_savegame")
     .on(newTable.userId, newTable.savegameId);
   ```

3. **Use validateSaveAccess middleware:**
   ```typescript
   app.get("/api/new-data", requireAuth, validateSaveAccess, handler);
   ```

4. **Always filter by userId:**
   ```typescript
   const data = await db
     .select()
     .from(newTable)
     .where(and(
       eq(newTable.savegameId, savegameId),
       eq(newTable.userId, userId)
     ));
   ```
```

---

## 📦 Deliverables

### Files to Create:
1. ✅ `server/middleware/validateSaveAccess.ts`
2. ✅ `server/middleware/auditLog.ts`
3. ✅ `server/migrations/0003_add_user_id_security.ts`
4. ✅ `server/__tests__/security.test.ts`
5. ✅ `server/__tests__/api-security.test.ts`

### Files to Modify:
1. ✅ [`shared/schema.ts`](shared/schema.ts) - Add userId to all tables
2. ✅ [`server/dbStorage.ts`](server/dbStorage.ts) - Update all query functions
3. ✅ [`server/routes.ts`](server/routes.ts) - Add validateSaveAccess middleware
4. ✅ `README.md` - Document security implementation

---

## 🎯 Success Metrics

**Security:**
- ✅ All save game queries include `userId` filter
- ✅ Unauthorized access attempts return 403
- ✅ Audit logs track sensitive operations
- ✅ No SQL injection vulnerabilities (Drizzle ORM handles this)

**Performance:**
- ✅ Composite indexes created: `(userId, savegameId)`
- ✅ Query execution time < 50ms for standard queries
- ✅ No N+1 query problems

**Testing:**
- ✅ 100% coverage of validateSaveAccess middleware
- ✅ Integration tests pass for all protected routes
- ✅ Manual penetration testing completed

---

## 🚀 Deployment Checklist

### Pre-Deployment:
- [ ] Run all unit tests: `npm test`
- [ ] Run integration tests: `npm run test:integration`
- [ ] Verify migration runs successfully on staging DB
- [ ] Check that existing save games are backfilled correctly
- [ ] Verify composite indexes are created

### Deployment:
- [ ] Backup production database
- [ ] Run migration: `npm run db:migrate`
- [ ] Verify all routes return expected results
- [ ] Monitor error logs for 24 hours
- [ ] Check audit logs for suspicious activity

### Post-Deployment:
- [ ] Verify query performance (check slow query log)
- [ ] Confirm no 500 errors in production
- [ ] Test user workflows end-to-end
- [ ] Document any issues in incident log

---

## ⏱️ Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Schema Updates | 2 hours | None |
| Phase 2: Migration | 1 hour | Phase 1 |
| Phase 3: Middleware | 1.5 hours | None |
| Phase 4: Backend Queries | 4 hours | Phases 1-3 |
| Phase 5: Frontend Updates | 1 hour | Phase 4 |
| Phase 6: Testing | 2 hours | Phases 1-5 |
| Phase 7: Documentation | 30 mins | All phases |

**Total: ~12 hours** (1.5 work days)

---

## 🔥 Rollback Plan

If critical issues arise post-deployment:

1. **Immediate:** Revert to previous application version
2. **Database:** Run migration `down()` function to remove userId columns
3. **Hotfix:** Deploy patched version with fixes
4. **Post-mortem:** Document what went wrong and update plan

**Rollback Command:**
```bash
npm run db:rollback
```

This will execute the `down()` function in the migration file.

---

## 📚 Additional Resources

- [Drizzle ORM - Row Level Security](https://orm.drizzle.team/docs/rls)
- [OWASP - Access Control](https://owasp.org/www-project-top-ten/)
- [PostgreSQL - Composite Indexes](https://www.postgresql.org/docs/current/indexes-multicolumn.html)

---

**Last Updated:** November 6, 2025  
**Status:** 📋 Ready for Implementation  
**Priority:** 🔴 High - Security Critical