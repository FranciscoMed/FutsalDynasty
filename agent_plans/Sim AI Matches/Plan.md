# Implementation Plan: Background Match Simulation

## Overview

Implement automatic simulation of all non-user team matches when the game date advances. This ensures league tables and knockout brackets stay accurate while only user matches require manual interaction.

---

## **Phase 1: Backend - Match Simulation Queue**

### **1.1 Create Background Match Simulator**
**File**: `server/matchSimulator.ts` (new file)

**Purpose**: Handle batch simulation of multiple matches without user interaction

- [ ] Create `simulateMatchInBackground(matchId: number): Promise<void>`
  - Runs match simulation silently
  - Updates match scores in database
  - Does NOT generate detailed events/commentary
  - Faster than user match simulation (no delays)

- [ ] Create `simulateAllMatchesOnDate(saveGameId: number, date: string): Promise<SimulationSummary>`
  - Finds all matches scheduled for given date
  - Filters out user team matches
  - Simulates each match in parallel
  - Returns summary: `{ matchesSimulated: number, results: MatchResult[] }`

- [ ] Add `shouldSimulateMatch(match: Match, playerTeamId: number): boolean`
  - Returns `false` if match involves user's team
  - Returns `false` if match already played
  - Returns `true` otherwise

**Type Definitions**:
```typescript
interface SimulationSummary {
  matchesSimulated: number;
  results: MatchResult[];
}

interface MatchResult {
  matchId: number;
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number;
  awayScore: number;
  competitionId: number;
}
```

---

### **1.2 Integrate with GameEngine**
**File**: `server/gameEngine.ts`

**Modify `advanceOneDay()` method**:

- [ ] After updating game state date, call background simulator
- [ ] Add step: `await simulateAllMatchesOnDate(saveGameId, newDate)`
- [ ] Return simulation summary in response

**Updated flow**:
```typescript
async advanceOneDay(saveGameId: number) {
  // 1. Increment date
  const newDate = addDays(gameState.currentDate, 1);
  
  // 2. Update game state
  await this.storage.updateGameState(saveGameId, { currentDate: newDate });
  
  // 3. Simulate all non-user matches for this date
  const simulationSummary = await simulateAllMatchesOnDate(saveGameId, newDate);
  
  // 4. Update competition standings
  await this.competitionEngine.updateStandingsForSimulatedMatches(
    simulationSummary.results
  );
  
  // 5. Check for user matches (existing logic)
  const matchesToday = await this.getMatchesOnDate(saveGameId, newDate);
  
  return {
    gameState: updatedGameState,
    matchesToday,
    simulationSummary
  };
}
```

---

### **1.3 Enhance CompetitionEngine**
**File**: `server/competitionEngine.ts`

- [ ] Add `updateStandingsForSimulatedMatches(results: MatchResult[]): Promise<void>`
  - Groups results by competition
  - Updates league standings (wins/draws/losses/points/GD)
  - Advances knockout brackets
  - Does NOT send inbox messages (silent update)

- [ ] Modify existing `updateStandings()` to use shared logic
  - Extract common logic into private method
  - Reuse for both user and background matches

**Pseudo-code**:
```typescript
async updateStandingsForSimulatedMatches(results: MatchResult[]) {
  const resultsByCompetition = groupBy(results, r => r.competitionId);
  
  for (const [competitionId, matches] of Object.entries(resultsByCompetition)) {
    const competition = await this.storage.getCompetition(competitionId);
    
    if (competition.type === "league") {
      await this.updateLeagueStandings(competitionId, matches);
    } else if (competition.type === "knockout") {
      await this.updateKnockoutBracket(competitionId, matches);
    }
  }
}

private async updateLeagueStandings(competitionId: number, matches: MatchResult[]) {
  for (const match of matches) {
    const homeWin = match.homeScore > match.awayScore;
    const draw = match.homeScore === match.awayScore;
    
    // Update home team standing
    await this.storage.updateStanding(competitionId, match.homeTeamId, {
      played: { increment: 1 },
      won: homeWin ? { increment: 1 } : undefined,
      drawn: draw ? { increment: 1 } : undefined,
      lost: !homeWin && !draw ? { increment: 1 } : undefined,
      goalsFor: { increment: match.homeScore },
      goalsAgainst: { increment: match.awayScore },
      goalDifference: { increment: match.homeScore - match.awayScore },
      points: { increment: homeWin ? 3 : draw ? 1 : 0 }
    });
    
    // Update away team standing (similar logic)
  }
}
```

---

### **1.4 Add Simulation Logging**
**File**: `server/matchSimulator.ts`

- [ ] Add optional logging for debugging
- [ ] Log simulation summary: `"Simulated 6 matches on 2024-09-15"`
- [ ] Log any simulation errors (but don't throw)
- [ ] Store simulation history in database (optional)

**Schema addition** (optional):
```typescript
// In shared/schema.ts
export const simulationLogs = pgTable("simulation_logs", {
  id: serial("id").primaryKey(),
  saveGameId: integer("save_game_id").notNull(),
  date: varchar("date", { length: 10 }).notNull(),
  matchesSimulated: integer("matches_simulated").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
```

---

## **Phase 2: Backend - Match Simulation Logic**

### **2.1 Create Lightweight Match Engine**
**File**: `server/lightweightMatchEngine.ts` (new file)

**Purpose**: Fast simulation without detailed events

- [ ] Create `simulateQuick(homeTeam: Team, awayTeam: Team): MatchResult`
  - Calculates team strengths (average player ratings)
  - Applies home advantage (+10% to home team strength)
  - Uses probabilistic goal generation
  - Returns only final score (no events)

**Algorithm**:
```typescript
function simulateQuick(homeTeam: Team, awayTeam: Team): MatchResult {
  // 1. Calculate team strengths
  const homeStrength = calculateTeamStrength(homeTeam) * 1.1; // home advantage
  const awayStrength = calculateTeamStrength(awayTeam);
  
  // 2. Determine expected goals using Poisson distribution
  const homeExpectedGoals = (homeStrength / awayStrength) * 2.5;
  const awayExpectedGoals = (awayStrength / homeStrength) * 2.5;
  
  // 3. Generate actual goals (Poisson random)
  const homeScore = poissonRandom(homeExpectedGoals);
  const awayScore = poissonRandom(awayExpectedGoals);
  
  // 4. Clamp scores to realistic range (0-10)
  return {
    homeScore: Math.min(homeScore, 10),
    awayScore: Math.min(awayScore, 10)
  };
}

function calculateTeamStrength(team: Team): number {
  const players = team.players;
  const avgRating = players.reduce((sum, p) => sum + p.rating, 0) / players.length;
  const avgFitness = players.reduce((sum, p) => sum + p.fitness, 0) / players.length;
  
  return (avgRating * 0.7 + (avgFitness / 100) * 0.3) * 10;
}

function poissonRandom(lambda: number): number {
  let L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  
  return k - 1;
}
```

**Advantages**:
- 10-100x faster than full match engine
- Realistic score distributions
- Accounts for team quality and home advantage
- No memory overhead (no event history)

---

### **2.2 Reuse Existing Match Engine (Alternative)**
**File**: `server/matchEngine.ts`

**Option**: Modify existing match engine to support "silent mode"

- [ ] Add parameter: `simulate(match, options: { silent?: boolean })`
- [ ] If `silent = true`:
  - Skip event generation
  - Skip commentary
  - Skip detailed logging
  - Only return final score

**Pros**: Reuses existing logic
**Cons**: Slower than lightweight engine

**Recommendation**: Use lightweight engine for background, full engine for user matches

---

## **Phase 3: Frontend - Display Updates**

### **3.1 Update AdvancementOverlay**
**File**: `client/src/components/AdvancementOverlay.tsx`

- [ ] Show simulation summary in events list
- [ ] Display: "✓ Simulated 6 matches"
- [ ] No detailed match results (keeps UI clean)

**Example**:
```tsx
{simulationSummary && simulationSummary.matchesSimulated > 0 && (
  <div className="p-2 bg-muted rounded-lg flex items-center gap-2">
    <Check className="w-4 h-4 text-green-600" />
    <span>Simulated {simulationSummary.matchesSimulated} matches</span>
  </div>
)}
```

---

### **3.2 Update CompetitionsPage**
**File**: `client/src/pages/CompetitionsPage.tsx`

- [ ] Ensure standings auto-refresh after time advancement
- [ ] Already uses TanStack Query caching
- [ ] Invalidate cache on day advance (already implemented)

**No changes needed** - existing cache invalidation handles this

---

### **3.3 Update MatchesPage**
**File**: `client/src/pages/MatchesPage.tsx`

- [ ] Recent results will automatically include simulated matches
- [ ] Already uses cached match data
- [ ] Invalidate cache on day advance (already implemented)

**No changes needed** - existing implementation handles this

---

## **Phase 4: Testing & Validation**

### **4.1 Unit Tests**

**Test `simulateMatchInBackground`**:
- [ ] Simulates match correctly
- [ ] Updates database with scores
- [ ] Does not simulate user matches
- [ ] Handles errors gracefully

**Test `simulateAllMatchesOnDate`**:
- [ ] Finds all matches on date
- [ ] Filters out user matches
- [ ] Returns correct summary
- [ ] Handles days with no matches

**Test `updateStandingsForSimulatedMatches`**:
- [ ] Updates league standings correctly
- [ ] Calculates points/GD properly
- [ ] Advances knockout brackets
- [ ] Handles multiple competitions

---

### **4.2 Integration Tests**

**Test full advancement flow**:
```typescript
// Test case: Advance to date with multiple matches
1. Create save game with 3 competitions
2. Create fixtures for date (10 matches, 1 includes user)
3. Call advanceOneDay()
4. Verify: 9 matches simulated, 1 user match pending
5. Verify: Standings updated correctly
6. Verify: User match NOT simulated
```

**Test edge cases**:
- [ ] Day with only user matches → No background simulation
- [ ] Day with no matches → No errors
- [ ] Multiple competitions on same day → All updated
- [ ] Knockout matches → Bracket advances correctly

---

### **4.3 Performance Tests**

**Benchmark simulation speed**:
- [ ] 10 matches: < 100ms
- [ ] 50 matches: < 500ms
- [ ] 100 matches: < 1s

**If too slow**:
- Use lightweight engine instead of full engine
- Parallelize simulations (Promise.all)
- Add database indexes on match date

---

## **Phase 5: Optional Enhancements**

### **5.1 Simulation History**
- [ ] Store all simulated matches in history table
- [ ] Allow users to view results later
- [ ] Add "League News" page showing recent results

### **5.2 Simulation Settings**
- [ ] Add user preference: "Show simulation notifications"
- [ ] Add user preference: "Simulation speed" (realistic vs instant)

### **5.3 Detailed Statistics**
- [ ] Track player stats in background matches (goals, assists)
- [ ] Update player form based on simulated performances
- [ ] Generate player ratings adjustments

### **5.4 Injury System**
- [ ] Simulate injuries in background matches
- [ ] Affect opponent team availability
- [ ] Make AI teams more realistic

---

## **Implementation Order (Recommended)**

### **Sprint 1: Core Simulation**
1. Create `lightweightMatchEngine.ts` with quick simulation
2. Create `matchSimulator.ts` with batch logic
3. Add unit tests for simulation logic

### **Sprint 2: GameEngine Integration**
4. Modify `advanceOneDay()` to call simulator
5. Add simulation summary to response
6. Test advancement flow

### **Sprint 3: Competition Updates**
7. Add `updateStandingsForSimulatedMatches()` to CompetitionEngine
8. Test league standings updates
9. Test knockout bracket progression

### **Sprint 4: Frontend Updates**
10. Update AdvancementOverlay to show simulation summary
11. Test UI updates after simulation
12. Verify cache invalidation works

### **Sprint 5: Testing & Polish**
13. Integration tests for full flow
14. Performance benchmarks
15. Edge case handling
16. User acceptance testing

---

## **API Changes Summary**

### **Modified Endpoints**
```typescript
// POST /api/game/advance-day
// Response now includes simulation summary
{
  gameState: GameState,
  matchesToday: Match[],
  simulationSummary: {
    matchesSimulated: number,
    results: MatchResult[]
  }
}

// POST /api/game/advance-until
// Also includes simulation summary per day
{
  currentDate: string,
  complete: boolean,
  nextEvent?: NextEvent,
  simulationSummary: SimulationSummary
}
```

### **New Internal Methods**
- `matchSimulator.simulateMatchInBackground(matchId)`
- `matchSimulator.simulateAllMatchesOnDate(saveGameId, date)`
- `competitionEngine.updateStandingsForSimulatedMatches(results)`
- `lightweightMatchEngine.simulateQuick(homeTeam, awayTeam)`

---

## **Database Schema Changes**

### **Optional: Simulation History Table**
```sql
CREATE TABLE simulation_logs (
  id SERIAL PRIMARY KEY,
  save_game_id INTEGER NOT NULL,
  date VARCHAR(10) NOT NULL,
  matches_simulated INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (save_game_id) REFERENCES save_games(id)
);

CREATE INDEX idx_simulation_logs_save_game ON simulation_logs(save_game_id);
CREATE INDEX idx_simulation_logs_date ON simulation_logs(date);
```

---

## **Success Criteria**

✅ All non-user matches simulate automatically when date advances  
✅ User matches remain unplayed until user confirms tactics  
✅ League standings update correctly after simulations  
✅ Knockout brackets progress accurately  
✅ Simulation is fast (< 1s for typical match day)  
✅ No UI lag during advancement  
✅ Competition tables display correct data  
✅ Recent results show simulated matches  
✅ No duplicate simulations (idempotent)  
✅ Errors handled gracefully (no crashes)  

---

## **Performance Targets**

| Metric | Target | Acceptable | Unacceptable |
|--------|--------|------------|--------------|
| **10 matches** | < 50ms | < 100ms | > 200ms |
| **50 matches** | < 250ms | < 500ms | > 1s |
| **100 matches** | < 500ms | < 1s | > 2s |
| **Memory usage** | < 10MB | < 20MB | > 50MB |
| **DB queries** | < 30 | < 50 | > 100 |

---

## **Risk Mitigation**

### **Risk**: Simulation takes too long
**Mitigation**: Use lightweight engine, parallelize, add progress indicator

### **Risk**: Standings calculations incorrect
**Mitigation**: Comprehensive unit tests, compare with manual calculations

### **Risk**: Race conditions with concurrent simulations
**Mitigation**: Use database transactions, add locks if needed

### **Risk**: User confusion about simulated results
**Mitigation**: Clear UI indicators, "League News" page for context

---

This plan ensures all matches are simulated realistically while keeping the user experience focused on their own team's matches!