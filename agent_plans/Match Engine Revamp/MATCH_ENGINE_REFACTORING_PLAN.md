# Match Engine Refactoring Plan

## 📋 Overview

This document outlines a phased approach to refactoring the Match Engine to eliminate code duplication, improve maintainability, and follow best practices.

**Current State**: ~2,500 lines with significant duplication
**Target State**: ~1,600 lines with modular, reusable components
**Estimated Timeline**: 4-6 phases over 2-3 weeks

---

## 🎯 Goals

1. **Eliminate Code Duplication** - Reduce ~400 lines of duplicated shot logic
2. **Improve Maintainability** - Create single source of truth for each behavior
3. **Enhance Testability** - Smaller, focused methods are easier to test
4. **Maintain Functionality** - No changes to game behavior or balance
5. **Type Safety** - Remove `any` casts and improve TypeScript usage

---

## 📊 Phase 1: Foundation & Helper Methods (2-3 days)

**Goal**: Create reusable helper methods to eliminate repetitive team/lineup access patterns.

### Tasks

#### 1.1 Create Team Access Helpers
```typescript
// Add to MatchEngine class (before Phase 1 methods)

/**
 * Get lineup for specified team
 */
private getLineup(state: LiveMatchState, team: 'home' | 'away'): OnCourtPlayer[] {
  return team === 'home' ? state.homeLineup : state.awayLineup;
}

/**
 * Get bench players for specified team
 */
private getBench(state: LiveMatchState, team: 'home' | 'away'): PlayerWithTraits[] {
  return team === 'home' 
    ? state.substitutions.homeBench 
    : state.substitutions.awayBench;
}

/**
 * Get team ID for specified team
 */
private getTeamId(state: LiveMatchState, team: 'home' | 'away'): number {
  return team === 'home' ? state.homeTeamId : state.awayTeamId;
}

/**
 * Get opposing team
 */
private getOpposingTeam(team: 'home' | 'away'): 'home' | 'away' {
  return team === 'home' ? 'away' : 'home';
}

/**
 * Get tactics for specified team
 */
private getTeamTactics(state: LiveMatchState, team: 'home' | 'away'): TacticalSetup {
  return team === 'home' ? state.homeTactics : state.awayTactics;
}

/**
 * Get team statistics reference
 */
private getTeamStats(
  state: LiveMatchState, 
  team: 'home' | 'away'
): typeof state.statistics[keyof typeof state.statistics] {
  return team === 'home' ? state.statistics.home : state.statistics.away;
}
```

#### 1.2 Create Goalkeeper Helper
```typescript
/**
 * Get goalkeeper for specified team
 * Falls back to first player if no goalkeeper found
 */
private getGoalkeeper(state: LiveMatchState, team: 'home' | 'away'): OnCourtPlayer {
  const lineup = this.getLineup(state, team);
  return lineup.find(p => p.player.position === 'Goalkeeper') || lineup[0];
}
```

#### 1.3 Create Event Factory
```typescript
/**
 * Create a match event with consistent structure
 */
private createEvent(
  state: LiveMatchState,
  type: MatchEvent['type'],
  player: OnCourtPlayer | null,
  team: 'home' | 'away',
  description: string,
  metadata?: Partial<MatchEvent>
): MatchEvent {
  return {
    minute: state.currentMinute,
    type,
    playerId: player?.player.id || 0,
    playerName: player?.player.name || '',
    teamId: this.getTeamId(state, team),
    description,
    ...metadata
  };
}

/**
 * Add event to match state
 */
private addEvent(state: LiveMatchState, event: MatchEvent): void {
  state.events.push(event);
}
```

#### 1.4 Refactor Existing Code
- Replace all instances of `team === 'home' ? state.homeLineup : state.awayLineup` with `this.getLineup(state, team)`
- Replace all manual event creation with `this.createEvent()` and `this.addEvent()`
- **Estimated**: 20+ replacements across the file

### Testing
- Run all existing match simulation tests
- Verify match statistics remain identical
- Check event generation consistency

### Success Criteria
- ✅ All helper methods implemented
- ✅ 20+ code duplications eliminated
- ✅ All tests passing
- ✅ ~50 lines saved

---

## 📊 Phase 2: Shot Resolution Extraction (3-4 days)

**Goal**: Extract common shot resolution logic used across 4 different shot types.

### Tasks

#### 2.1 Create Shot Resolution System
```typescript
/**
 * Context for shot resolution
 */
interface ShotContext {
  shotType: 'open_play' | 'counter_attack' | 'free_kick' | 'penalty_10m' | 'corner';
  isCounter?: boolean;
  onTargetProb: number;
  saveProb: number;
  assistProb?: number;
  quality: number;
  shooter: OnCourtPlayer;
  attackingTeam: 'home' | 'away';
}

/**
 * Resolve shot attempt outcome
 * Common logic for all shot types
 */
private resolveShotAttempt(state: LiveMatchState, context: ShotContext): void {
  const { shooter, attackingTeam, quality, onTargetProb, saveProb } = context;
  const defendingTeam = this.getOpposingTeam(attackingTeam);
  
  // Update statistics
  state.statistics.shots[attackingTeam]++;
  shooter.performance.shots++;
  
  // Check if shot is on target
  const isOnTarget = Math.random() < onTargetProb;
  
  if (!isOnTarget) {
    this.handleMissedShot(state, context);
    return;
  }
  
  state.statistics.shotsOnTarget[attackingTeam]++;
  
  // Check if goalkeeper saves
  const goalkeeper = this.getGoalkeeper(state, defendingTeam);
  const gkEffectiveness = this.calculateGKEffectiveness(goalkeeper);
  
  if (Math.random() < saveProb * gkEffectiveness) {
    this.handleSave(state, goalkeeper, context);
    return;
  }
  
  // Goal scored!
  this.handleGoal(state, context);
}

/**
 * Handle missed shot
 */
private handleMissedShot(state: LiveMatchState, context: ShotContext): void {
  const { shooter, attackingTeam, quality, isCounter } = context;
  
  shooter.performance.rating -= CONFIG.ratings.weights.missedShots;
  
  const missType = Math.random() < 0.5 ? 'wide' : 'off target';
  const event = this.createEvent(
    state,
    'shot',
    shooter,
    attackingTeam,
    `${shooter.player.name} shoots ${missType}!`,
    { shotQuality: quality, isCounter }
  );
  
  this.addEvent(state, event);
}

/**
 * Handle save by goalkeeper
 */
private handleSave(
  state: LiveMatchState,
  goalkeeper: OnCourtPlayer,
  context: ShotContext
): void {
  const { shooter, attackingTeam, quality, isCounter, shotType } = context;
  const defendingTeam = this.getOpposingTeam(attackingTeam);
  
  // Update statistics
  state.statistics.saves[defendingTeam]++;
  
  // Update ratings
  const saveBonus = shotType === 'penalty_10m' 
    ? CONFIG.ratings.weights.penaltySaves 
    : CONFIG.ratings.weights.saves;
  
  goalkeeper.performance.rating += saveBonus;
  shooter.performance.rating += CONFIG.ratings.weights.shotsOnTarget;
  
  // Create event
  const event = this.createEvent(
    state,
    'shot',
    shooter,
    attackingTeam,
    `${shooter.player.name}'s shot is saved by ${goalkeeper.player.name}!`,
    { shotQuality: quality, isCounter }
  );
  
  this.addEvent(state, event);
}

/**
 * Handle goal scored
 */
private handleGoal(state: LiveMatchState, context: ShotContext): void {
  const { shooter, attackingTeam, quality, isCounter, shotType, assistProb } = context;
  const defendingTeam = this.getOpposingTeam(attackingTeam);
  
  // Update score
  state.score[attackingTeam]++;
  
  // Update shooter rating
  const goalBonus = this.getGoalRatingBonus(shotType);
  shooter.performance.rating += goalBonus;
  
  // Check for assist
  let assisterId: number | undefined;
  let assisterName: string | undefined;
  
  if (assistProb && Math.random() < assistProb) {
    const assister = this.selectAssister(state, attackingTeam, shooter);
    if (assister) {
      assisterId = assister.player.id;
      assisterName = assister.player.name;
      assister.performance.rating += CONFIG.ratings.weights.assists;
    }
  }
  
  // Check for red card returns (futsal rule)
  this.checkRedCardReturnAfterGoal(state, defendingTeam);
  
  // Penalty for defending team
  const defendingLineup = this.getLineup(state, defendingTeam);
  defendingLineup.forEach(p => {
    p.performance.rating += CONFIG.ratings.weights.goalsConceded;
  });
  
  // Format description
  const description = this.formatGoalDescription(
    shooter.player.name,
    assisterName,
    shotType,
    isCounter
  );
  
  // Create goal event
  const event = this.createEvent(
    state,
    'goal',
    shooter,
    attackingTeam,
    description,
    {
      assistId: assisterId,
      assistName: assisterName,
      shotQuality: quality,
      isCounter,
      goalContext: shotType
    }
  );
  
  this.addEvent(state, event);
  
  // Update momentum
  this.updateMomentum(state, attackingTeam, CONFIG.momentum.events.goal);
}

/**
 * Get goal rating bonus based on shot type
 */
private getGoalRatingBonus(shotType: string): number {
  switch (shotType) {
    case 'penalty_10m':
      return CONFIG.ratings.weights.goals * 0.5; // Penalty worth less
    case 'free_kick':
    case 'corner':
      return CONFIG.ratings.weights.goals * 1.2; // Set piece worth more
    default:
      return CONFIG.ratings.weights.goals;
  }
}

/**
 * Select assist provider
 */
private selectAssister(
  state: LiveMatchState,
  attackingTeam: 'home' | 'away',
  shooter: OnCourtPlayer
): OnCourtPlayer | null {
  const lineup = this.getLineup(state, attackingTeam);
  const potentialAssisters = lineup.filter(p => p.player.id !== shooter.player.id);
  
  if (potentialAssisters.length === 0) return null;
  
  // Weight by passing and positioning attributes
  const weights = potentialAssisters.map(p => {
    const passing = p.effectiveAttributes.passing || 10;
    const positioning = p.effectiveAttributes.positioning || 10;
    const baseWeight = (passing + positioning) / 2;
    
    // Goalkeepers less likely to assist
    return p.player.position === 'Goalkeeper' ? baseWeight * 0.25 : baseWeight;
  });
  
  // Weighted random selection
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;
  
  for (let i = 0; i < potentialAssisters.length; i++) {
    random -= weights[i];
    if (random <= 0) return potentialAssisters[i];
  }
  
  return potentialAssisters[potentialAssisters.length - 1];
}

/**
 * Format goal description with context
 */
private formatGoalDescription(
  shooterName: string,
  assisterName: string | undefined,
  shotType: string,
  isCounter?: boolean
): string {
  const assist = assisterName ? ` (Assist: ${assisterName})` : '';
  const counter = isCounter ? ' (Counter-attack)' : '';
  
  let typePrefix = '';
  switch (shotType) {
    case 'penalty_10m':
      typePrefix = '10m PENALTY ';
      break;
    case 'free_kick':
      typePrefix = 'FREE-KICK ';
      break;
    case 'corner':
      typePrefix = 'CORNER ';
      break;
  }
  
  return `⚽ ${typePrefix}GOAL! ${shooterName} scores!${assist}${counter}`;
}
```

#### 2.2 Refactor Existing Shot Methods
Replace shot resolution logic in:
- `generateShotEvent()` - lines 1156-1242
- `generateFreeKickShot()` - lines 1536-1644
- `generatePenaltyKick()` - lines 1651-1742
- `generateCornerEvent()` - lines 1748-1853

Each method should now:
1. Calculate shot context (quality, probabilities)
2. Call `this.resolveShotAttempt(state, context)`

**Example Refactored Method**:
```typescript
private generateShotEvent(state: LiveMatchState, isCounter: boolean): void {
  const attackingTeam = state.possession;
  const lineup = this.getLineup(state, attackingTeam);
  
  // Select shooter
  const shooter = this.selectShooter(lineup, 'finish', attackingTeam, state);
  
  // Calculate quality
  const quality = this.calculateShotQuality(shooter, state);
  
  // Check if defense blocks
  const defendingTeam = this.getOpposingTeam(attackingTeam);
  const resistance = this.calculateDefensiveResistance(
    this.getLineup(state, defendingTeam),
    state,
    defendingTeam
  );
  
  if (Math.random() < resistance * CONFIG.defense.preventionRate) {
    // Shot blocked - defensive event
    const defender = this.selectDefender(
      this.getLineup(state, defendingTeam),
      'intercept',
      defendingTeam,
      state
    );
    
    state.statistics.blocks[defendingTeam]++;
    defender.performance.rating += 0.1;
    
    const event = this.createEvent(
      state,
      'defensive',
      defender,
      defendingTeam,
      `${defender.player.name} blocks the shot!`
    );
    this.addEvent(state, event);
    return;
  }
  
  // Resolve shot
  const context: ShotContext = {
    shotType: isCounter ? 'counter_attack' : 'open_play',
    isCounter,
    onTargetProb: CONFIG.shooting.onTargetBase + quality * 0.3,
    saveProb: CONFIG.goalkeeper.baseSaveChance,
    assistProb: isCounter ? 0.3 : CONFIG.shooting.assistProbability,
    quality,
    shooter,
    attackingTeam
  };
  
  this.resolveShotAttempt(state, context);
}
```

### Testing
- Compare match results before/after refactoring
- Verify goal distribution remains consistent
- Check all event types are generated correctly

### Success Criteria
- ✅ Shot resolution system implemented
- ✅ All 4 shot methods refactored
- ✅ ~400 lines of duplication eliminated
- ✅ All tests passing
- ✅ Match statistics unchanged

---

## 📊 Phase 3: Configuration & Magic Numbers (1-2 days)

**Goal**: Move all remaining magic numbers to `matchEngineConfig.ts`.

### Tasks

#### 3.1 Add Missing Config Values
Add to `matchEngineConfig.ts`:

```typescript
export const MatchEngineConfig = {
  // ... existing config ...
  
  // ============================================================================
  // PERFORMANCE RATINGS (previously magic numbers)
  // ============================================================================
  performanceRatings: {
    // Shot outcomes
    missedShotPenalty: -0.03,
    shotsOnTargetBonus: 0.15,
    
    // Saves
    normalSaveBonus: 0.15,
    penaltySaveBonus: 0.4,
    
    // Goals
    normalGoalBonus: 1.0,
    penaltyGoalBonus: 0.5,
    freeKickGoalBonus: 0.7,
    setPieceGoalBonus: 0.8,
    
    // Defensive actions
    blockBonus: 0.1,
    interceptionBonus: 0.1,
    tackleBonus: 0.1,
    
    // Negative impacts
    goalConcededPenalty: -0.2,
    foulPenalty: -0.1,
  },
  
  // ============================================================================
  // ATTRIBUTE THRESHOLDS
  // ============================================================================
  attributeThresholds: {
    lowAttribute: 10,
    mediumAttribute: 50,
    highAttribute: 70,
    eliteAttribute: 85,
  },
  
  // ============================================================================
  // PROBABILITY CLAMPS
  // ============================================================================
  probabilityClamps: {
    minProbability: 0.0,
    maxProbability: 1.0,
    minGoalChance: 0.05,
    maxGoalChance: 0.95,
  },
} as const;
```

#### 3.2 Refactor Magic Numbers
Replace all hardcoded numbers with config references:

```typescript
// Before:
goalkeeper.performance.rating += 0.15;

// After:
goalkeeper.performance.rating += CONFIG.performanceRatings.normalSaveBonus;
```

```typescript
// Before:
if (Math.random() < 0.70) { ... }

// After:
if (Math.random() < CONFIG.setPieces.freeKick.onTargetChance) { ... }
```

### Testing
- Run configuration validator
- Verify all magic numbers are replaced
- Check game balance remains identical

### Success Criteria
- ✅ No magic numbers in matchEngine.ts
- ✅ All values in config
- ✅ Configuration validator passes
- ✅ Tests passing

---

## 📊 Phase 4: Method Decomposition (2-3 days)

**Goal**: Break down long methods (>50 lines) into smaller, focused functions.

### Tasks

#### 4.1 Refactor `generateFoulEvent()` (~150 lines)
Split into:
- `determineFoulSeverity()`
- `processFoulCards()`
- `handleAccumulatedFouls()`
- `processDangerousFoul()`

#### 4.2 Refactor `generateTickEvents()` (~60 lines)
Split into:
- `calculateEventProbabilities()`
- `selectEventToGenerate()`

#### 4.3 Refactor `initializeMatch()` (~100 lines)
Split into:
- `calculateInitialTeamQualities()`
- `createInitialLineups()`
- `createInitialBenches()`
- `createInitialMatchState()`

#### 4.4 Refactor `updatePlayerFatigue()` (~70 lines)
Split into:
- `updateLineupFatigue()`
- `updateBenchRecovery()`

### Testing
- Unit test each new method
- Integration test the refactored flows
- Verify behavior unchanged

### Success Criteria
- ✅ No methods >50 lines (except `simulateMatch`)
- ✅ Each method has single responsibility
- ✅ All tests passing

---

## 📊 Phase 5: Type Safety & Error Handling (1-2 days)

**Goal**: Remove `any` casts and improve TypeScript usage.

### Tasks

#### 5.1 Fix Type Safety Issues
```typescript
// Before:
type: `${cardType}_card` as any,

// After:
type: cardType === 'yellow' ? 'yellow_card' as const : 'red_card' as const,
```

Define proper union types in `schema.ts`:
```typescript
export type MatchEventType = 
  | 'goal'
  | 'shot'
  | 'yellow_card'
  | 'red_card'
  | 'substitution'
  | 'defensive'
  | 'foul'
  | 'corner'
  | 'dribble';
```

#### 5.2 Improve Error Handling
```typescript
// Create error types
class MatchEngineError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'MatchEngineError';
  }
}

// Use in methods
if (!this.currentState) {
  throw new MatchEngineError(
    'Real-time match not initialized',
    'MATCH_NOT_INITIALIZED',
    { isRealTimeMatch: this.isRealTimeMatch }
  );
}
```

#### 5.3 Add Debug Logger
```typescript
// Create debug utility
class MatchEngineDebug {
  private static enabled = process.env.DEBUG_MATCH_ENGINE === 'true';
  
  static log(category: string, message: string, data?: any): void {
    if (this.enabled) {
      console.log(`[MatchEngine:${category}] ${message}`, data || '');
    }
  }
}

// Replace commented debug code
// Before:
// console.log(`[MatchEngine] RED CARD: ${fouler.player.name}...`);

// After:
MatchEngineDebug.log('RedCard', `Player sent off: ${fouler.player.name}`, {
  minute: state.currentMinute,
  team: foulTeam
});
```

### Testing
- TypeScript strict mode compilation
- Verify no `any` types remain
- Error handling test cases

### Success Criteria
- ✅ No `any` types
- ✅ Proper error types defined
- ✅ Debug system implemented
- ✅ TypeScript strict mode passes

---

## 📊 Phase 6: Documentation & Testing (2-3 days)

**Goal**: Comprehensive documentation and test coverage.

### Tasks

#### 6.1 Add JSDoc Comments
- Document all public methods
- Document complex private methods
- Add parameter descriptions
- Add return value descriptions
- Add example usage where helpful

#### 6.2 Create Unit Tests
```typescript
// tests/matchEngine/shotResolution.test.ts
describe('Shot Resolution System', () => {
  it('should handle missed shots correctly', () => {
    // Test missed shot logic
  });
  
  it('should handle saves correctly', () => {
    // Test save logic
  });
  
  it('should handle goals with assists', () => {
    // Test goal with assist
  });
  
  it('should apply correct rating bonuses', () => {
    // Test rating calculations
  });
});
```

#### 6.3 Create Integration Tests
```typescript
// tests/matchEngine/fullMatch.test.ts
describe('Full Match Simulation', () => {
  it('should complete 160 ticks', () => {
    // Test full match
  });
  
  it('should generate realistic statistics', () => {
    // Verify shot counts, possession, etc.
  });
  
  it('should handle red cards correctly', () => {
    // Test red card system
  });
});
```

#### 6.4 Update Documentation
- Update `MATCH_ENGINE_CONFIG_GUIDE.md`
- Create architecture diagram
- Document shot resolution flow
- Document event generation flow

### Testing
- 80%+ code coverage
- All edge cases tested
- Performance benchmarks

### Success Criteria
- ✅ All methods documented
- ✅ 80%+ test coverage
- ✅ Documentation updated
- ✅ Performance maintained

---

## 📊 Phase 7: Performance Optimization (Optional, 1-2 days)

**Goal**: Optimize hot paths and reduce memory allocations.

### Tasks

#### 7.1 Profile Performance
- Identify bottlenecks
- Measure tick processing time
- Check memory usage

#### 7.2 Optimize Hot Paths
- Cache frequently accessed values
- Reduce object allocations in loops
- Optimize weighted selection algorithms

#### 7.3 Add Performance Metrics
```typescript
class MatchEngineMetrics {
  private tickTimes: number[] = [];
  
  recordTickTime(time: number): void {
    this.tickTimes.push(time);
  }
  
  getAverageTickTime(): number {
    return this.tickTimes.reduce((a, b) => a + b, 0) / this.tickTimes.length;
  }
}
```

### Success Criteria
- ✅ No performance regression
- ✅ Average tick time <5ms
- ✅ Memory usage stable

---

## 📈 Progress Tracking

### Metrics to Track
- Lines of code: Target reduction from 2,500 → 1,600
- Code duplication: Target <5% duplicate code
- Test coverage: Target 80%+
- Method length: Target <50 lines per method
- Magic numbers: Target 0

### Definition of Done
Each phase is complete when:
1. All tasks implemented
2. All tests passing
3. Code reviewed
4. Documentation updated
5. No regressions in game behavior

---

## 🚀 Migration Strategy

### Backward Compatibility
- Keep old methods during refactoring
- Add deprecation warnings
- Remove in next major version

### Testing Strategy
1. **Before each phase**: Record baseline match results
2. **During phase**: Run tests after each major change
3. **After phase**: Compare results with baseline
4. **Regression tests**: 1000 simulated matches comparison

### Rollback Plan
- Use feature flags for new code paths
- Keep old implementations until verified
- Git tags for each phase completion

---

## 🎓 Learning Opportunities

### Code Review Focus Areas
1. **Phase 2**: Shot resolution abstraction
2. **Phase 4**: Method decomposition techniques
3. **Phase 5**: TypeScript best practices

### Best Practices Demonstrated
- Single Responsibility Principle
- Don't Repeat Yourself (DRY)
- Open/Closed Principle
- Dependency Injection
- Factory Pattern (event creation)

---

## 📝 Notes

### Risk Mitigation
- **Risk**: Breaking game balance
- **Mitigation**: Extensive regression testing with statistics comparison

- **Risk**: Performance degradation
- **Mitigation**: Profile before/after, maintain benchmarks

- **Risk**: Scope creep
- **Mitigation**: Stick to plan, defer enhancements to backlog

### Future Enhancements (Post-Refactoring)
- Event replay system
- Machine learning for realistic player behavior
- More granular player positioning
- Weather/pitch conditions
- Advanced tactical AI

---

## ✅ Success Metrics

### Technical Metrics
- [ ] Code reduced from 2,500 to ~1,600 lines
- [ ] Method count increased by ~30 (more focused methods)
- [ ] Average method length <30 lines
- [ ] 0 magic numbers
- [ ] 0 `any` types
- [ ] 80%+ test coverage

### Quality Metrics
- [ ] All tests passing
- [ ] No performance regression
- [ ] Game balance unchanged
- [ ] TypeScript strict mode compliant
- [ ] ESLint warnings: 0

### Documentation Metrics
- [ ] All public methods documented
- [ ] Architecture diagram complete
- [ ] Configuration guide updated
- [ ] Code examples provided

---

## 📞 Support & Questions

For questions during implementation:
1. Review this plan
2. Check code comments
3. Review related test cases
4. Consult with team lead

**Document Version**: 1.0
**Created**: November 18, 2025
**Last Updated**: November 18, 2025
