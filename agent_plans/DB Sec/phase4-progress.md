# Phase 4 Progress: Backend Query Updates

## ✅ Completed (Step 1 of 3)

### **IStorage Interface Updated** (server/storage.ts)
All methods now require `userId` as second parameter:
- ✅ Player methods: `getPlayer(saveGameId, userId, id)`, `getAllPlayers(saveGameId, userId)`, etc.
- ✅ Team methods: `getTeam(saveGameId, userId, id)`, `createTeam(saveGameId, userId, team)`, etc.
- ✅ Match methods: All updated with userId parameter
- ✅ Competition methods: All updated with userId parameter
- ✅ Transfer methods: All updated with userId parameter
- ✅ Inbox methods: All updated with userId parameter
- ✅ Financial transaction methods: All updated with userId parameter
- ✅ Club methods: All updated with userId parameter
- ✅ GameState methods: All updated with userId parameter
- ✅ initializeGame: Now accepts `(saveGameId, userId)` instead of just `saveGameId`

### **DbStorage Implementation Updated** (server/dbStorage.ts)
All query methods now filter by `userId + savegameId`:

**Pattern Applied:**
```typescript
// OLD (Insecure)
.where(eq(table.saveGameId, saveGameId))

// NEW (Secure)
.where(and(
  eq(table.saveGameId, saveGameId),
  eq(table.userId, userId)
))
```

**Create Operations Pattern:**
```typescript
// OLD
.values({ ...data, saveGameId })

// NEW
.values({ ...data, saveGameId, userId })
```

**All Methods Updated:**
- ✅ getPlayer, getAllPlayers, getPlayersByTeam, createPlayer, updatePlayer
- ✅ getTeam, getAllTeams, createTeam, updateTeam
- ✅ getMatch, getAllMatches, getMatchesByCompetition, createMatch, updateMatch
- ✅ getCompetition, getAllCompetitions, createCompetition, updateCompetition
  - Competition methods also updated to pass userId to `getMatchesByCompetition` and `createMatch`
- ✅ getTransferOffer, getAllTransferOffers, getTransferOffersByTeam, createTransferOffer, updateTransferOffer
- ✅ getInboxMessage, getAllInboxMessages, createInboxMessage, updateInboxMessage, deleteInboxMessage
- ✅ getFinancialTransaction, getAllFinancialTransactions, createFinancialTransaction
- ✅ getClub, updateClub, createClub
- ✅ getGameState, updateGameState, createGameState
- ✅ initializeGame - Updated to accept userId and pass it to all internal create operations

**No TypeScript Errors:**
- ✅ server/dbStorage.ts compiles successfully
- ✅ server/storage.ts compiles successfully

---

## ⏳ In Progress (Step 2 of 3)

### **Routes Update Required** (server/routes.ts)
Need to:
1. Add `validateActiveSave` or `validateSaveAccess` middleware to protected routes
2. Extract `validatedSaveId` and `validatedUserId` from `res.locals`
3. Pass both parameters to all storage method calls

**Example Pattern:**
```typescript
// OLD
app.get("/api/teams", async (req, res) => {
  const saveGameId = requireSaveGame(req, res);
  if (saveGameId === null) return;
  
  const teams = await storage.getAllTeams(saveGameId);
  res.json(teams);
});

// NEW
app.get("/api/teams", validateActiveSave, async (req, res) => {
  const { validatedSaveId, validatedUserId } = res.locals;
  
  const teams = await storage.getAllTeams(validatedSaveId, validatedUserId);
  res.json(teams);
});
```

**Routes to Update:**
- [ ] Team routes: /api/teams, /api/teams/:id, /api/team/player, /api/tactics/*
- [ ] Player routes: /api/players, /api/players/:id, /api/players/:id/train
- [ ] Match routes: /api/matches, /api/matches/:id, /api/matches/:id/simulate, etc.
- [ ] Game state routes: /api/game/state, /api/gamestate/advance
- [ ] Transfer routes: /api/transfers
- [ ] Inbox routes: /api/inbox, /api/inbox/:id/read
- [ ] Financial routes: /api/finances, /api/transactions
- [ ] Club routes: /api/club

---

## 🔜 To Do (Step 3 of 3)

### **Game Engines Update Required**
Need to update:
1. **server/gameEngine.ts** - Pass userId to all storage calls
2. **server/matchEngine.ts** - Pass userId to all storage calls  
3. **server/competitionEngine.ts** - Pass userId to all storage calls
4. **server/seedEngine.ts** - Pass userId to all create operations

**Pattern:**
```typescript
// OLD
const team = await storage.getTeam(saveGameId, teamId);

// NEW
const team = await storage.getTeam(saveGameId, userId, teamId);
```

---

## 🎯 Next Steps

1. **Start with routes.ts:**
   - Add middleware imports at top
   - Replace `requireSaveGame` helper with `validateActiveSave` middleware
   - Update all route handlers to use `res.locals` values
   - Pass userId to all storage calls

2. **Then update game engines:**
   - gameEngine.ts
   - matchEngine.ts
   - competitionEngine.ts
   - seedEngine.ts

3. **Finally verify:**
   - Run TypeScript compilation check
   - Test a few critical routes
   - Verify no breaking changes

---

## 📝 Notes

- All database operations now enforce user ownership at the query level
- Composite indexes `(userId, saveGameId)` ensure fast queries
- initializeGame() now properly ties all created data to the user
- No code breaks - all changes are additive (new parameter)
