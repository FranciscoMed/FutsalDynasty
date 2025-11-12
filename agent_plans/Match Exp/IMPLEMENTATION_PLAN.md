# Match Engine & Associated Features - Implementation Plan

**For:** Claude Sonnet 4.5 Agent  
**Version:** 1.0  
**Last Updated:** November 10, 2025  
**Priority:** 🔴 CRITICAL - Core Gameplay Loop  
**Estimated Duration:** 6-8 weeks (Phases 1-5)

---

## Executive Summary

This plan provides all necessary context for implementing the **Futsal Dynasty match engine** and its associated features. The implementation requires:

1. **Backend match simulation engine** (server-side)
2. **Real-time WebSocket communication** (server ↔ client)
3. **Player traits system** (affects match outcomes)
4. **Dynamic momentum & fatigue system** (impacts performance)
5. **Match UI & interactive controls** (user agency)
6. **Post-match analytics & reporting** (narrative closure)

### Current State
- Basic match engine exists (`server/matchEngine.ts`) with simple strength-based simulation
- Match events are generated but lack sophistication
- No traits, fatigue, momentum, or tactical depth
- Pre-match & post-match screens are mocked up (HTML mockup only)

### Target State
- Sophisticated UEFA-calibrated match engine with player attributes driving outcomes
- Real-time interactive match experience with meaningful tactical decisions
- Player traits creating unique playstyles and synergies
- Dynamic momentum affecting match flow
- Comprehensive player fatigue management
- Engaging pre-match, live, and post-match experiences

---

## Technology Stack & Architecture

### Backend Stack
```
Language:     TypeScript
Database:     PostgreSQL + Drizzle ORM
Server:       Express.js
Real-time:    WebSocket (Socket.IO recommended)
Simulation:   Server-side (authoritative)
Tick Model:   Calculate → Broadcast (1:1 relationship)
```

### Match Timing Model
```
Simulation Granularity: 15-second intervals (4 ticks per minute)
Total Ticks per Match:  160 ticks (40 minutes × 4)
Display Model:          Every tick calculation is immediately broadcast via WebSocket
Speed Control:          Adjusts time between ticks, not tick calculation
  - 1x speed: 1 tick every 3.75 seconds (15s simulated = 3.75s real)
  - 2x speed: 1 tick every 1.875 seconds (15s simulated = 1.875s real)
  - 4x speed: 1 tick every 0.9375 seconds (15s simulated = ~1s real)

Critical: Each tick is fully calculated, then immediately sent to client.
No batching, no delays - 1 calculation = 1 broadcast.
```

### Existing Codebase
```
server/
  ├── matchEngine.ts (simple simulation, to be enhanced)
  ├── lightweightMatchEngine.ts (quick sims, to be updated)
  ├── matchSimulator.ts (UI-connected, to be refactored)
  ├── gameEngine.ts (overall game loop)
  ├── db.ts (database client)
  ├── routes.ts (API endpoints)
  └── middleware/
      └── auditLog.ts

shared/
  └── schema.ts (data models - Player, Team, Match, MatchEvent, etc.)

client/
  └── src/
      ├── components/ (React components)
      ├── pages/ (route pages)
      ├── hooks/ (custom hooks)
      └── lib/ (utilities)
```

### Data Models (From `shared/schema.ts`)
- **Player:** Attributes (shooting, passing, dribbling, etc.), contract, condition
- **Team:** Formation, tactical preset, lineup, substitutes
- **Match:** Score, events, stats, player ratings
- **MatchEvent:** Type (goal, card, sub), minute, player info, description

---

## Phase 1: Foundation & Core Simulation (Weeks 1-2)

### 1.1 Enhance Match Data Models

**File:** `shared/schema.ts`

**New Types to Add:**
```typescript
// Traits
type PlayerTrait = 
  | 'attempts1v1' | 'finisher'
  | 'playmaker' | 'does1_2' | 'playsRiskyPasses'
  | 'hardTackler' | 'anticipates'
  | 'nerveless' | 'choker' | 'selfish' | 'isFlyGoalkeeper';

interface PlayerWithTraits extends Player {
  traits: PlayerTrait[];
  energy: number;        // 0-100, current match energy
  minutesPlayedThisMatch: number;
}

// Tactical modifiers
interface TacticalSetup {
  mentality: 'VeryDefensive' | 'Defensive' | 'Balanced' | 'Attacking' | 'VeryAttacking';
  pressingIntensity: 'Low' | 'Medium' | 'High' | 'VeryHigh';
  width: 'Narrow' | 'Balanced' | 'Wide';
  customInstructions?: string;
}

// Match state tracking
interface LiveMatchState {
  currentMinute: number;
  currentInterval: number; // 0-159 (15-second intervals)
  score: { home: number; away: number };
  possession: 'home' | 'away';
  momentum: { value: number; trend: 'home' | 'away' | 'neutral' };
  counterAttackActive: { team: 'home' | 'away' | null; ticksRemaining: number }; // NEW: Counter-attack flag
  lastEvent: MatchEvent | null; // NEW: Track last event for context
  statistics: {
    possession: { home: number; away: number };
    shots: { home: number; away: number };
    shotsOnTarget: { home: number; away: number };
    fouls: { home: number; away: number };
    corners: { home: number; away: number };
    saves: { home: number; away: number };
    tackles: { home: number; away: number }; // NEW: Track tackles
    interceptions: { home: number; away: number }; // NEW: Track interceptions
  };
  events: MatchEvent[];
  isPaused: boolean;
  speed: 1 | 2 | 4;
}

// Player on-court state
interface OnCourtPlayer {
  player: PlayerWithTraits;
  effectiveAttributes: {
    shooting: number;
    passing: number;
    dribbling: number;
    pace: number;
    tackling: number;
    positioning: number;
    marking: number;
  };
  performance: {
    shots: number;
    passes: number;
    tackles: number;
    interceptions: number;
    fouls: number;
    rating: number;
  };
}
```

**Actions:**
- [ ] Add trait enum to Player interface
- [ ] Create LiveMatchState interface
- [ ] Add energy/fatigue tracking to Player
- [ ] Create TacticalSetup type
- [ ] Create OnCourtPlayer tracking structure
- [ ] Update MatchEvent to include more detailed event info

---

### 1.2 Refactor Core Match Engine

**File:** `server/matchEngine.ts`

**Current Implementation Issues:**
- Too simple (just strength ratio)
- No tactical depth
- No player attribute integration
- No timing multipliers
- No realistic event distribution

**New Structure:**
```typescript
export class EnhancedMatchEngine {
  constructor(private storage: IStorage) {}

  // Main entry point
  async simulateMatch(
    saveGameId: number,
    userId: number,
    matchId: number,
    realTime: boolean = false
  ): Promise<Match> {
    // 1. Load match data
    // 2. Initialize match state
    // 3. If realTime: start WebSocket stream
    // 4. If not: run full simulation
    // 5. Save results
  }

  // Real-time simulation (minute by minute)
  private async simulateMinute(state: LiveMatchState): Promise<void> {
    // Called every second (or adjusted for speed)
    // Updates game state
    // Broadcasts via WebSocket
  }

  // Core calculation methods
  private calculateExpectedGoals(homeRating: number, awayRating: number): [number, number]
  private calculatePossession(state: LiveMatchState, team: 'home' | 'away'): 'home' | 'away'
  private generateEvent(state: LiveMatchState): MatchEvent | null
  private processEvent(event: MatchEvent, state: LiveMatchState): void
  private updateMomentum(state: LiveMatchState, event?: MatchEvent): void
  private updatePlayerFatigue(state: LiveMatchState): void
}
```

**Key Methods to Implement:**

1. **Match Initialization:**
```typescript
private initializeMatch(
  homeTeam: Team,
  homePlayers: Player[],
  awayTeam: Team,
  awayPlayers: Player[],
  homeRating: number,
  awayRating: number
): LiveMatchState {
  // Set up initial state
  // Calculate expected goals
  // Initialize player energy
  // Set starting momentum (50 = neutral)
}
```

2. **Team Quality Calculation:**
```typescript
private calculateTeamQuality(players: Player[]): number {
  // Average player attributes
  // Weight by playing time (starting XI vs bench)
  // Factor in morale/form
  // Return 0-100 quality score
}
```

3. **Expected Goals:**
```typescript
private calculateExpectedGoals(homeRating: number, awayRating: number): [number, number] {
  const BASE_GOALS_PER_TEAM = 2.58;
  const ratingDiff = homeRating - awayRating;
  const qualityMultiplier = 1 + (ratingDiff * 0.01);
  const clampedMultiplier = Math.max(0.5, Math.min(1.5, qualityMultiplier));
  
  const homeXG = BASE_GOALS_PER_TEAM * clampedMultiplier * 1.02; // 2% home advantage
  const awayXG = BASE_GOALS_PER_TEAM * (1 / clampedMultiplier);
  
  return [homeXG, awayXG];
}
```

**Actions:**
- [ ] Create new EnhancedMatchEngine class
- [ ] Move initialization logic from old engine
- [ ] Implement team quality calculation
- [ ] Implement expected goals calculation
- [ ] Set up match state tracking
- [ ] Create event generation framework

---

### 1.3 Basic Shot & Goal System

**File:** `server/matchEngine.ts` (continued)

**Shot System Flow:**
```
1. Possession → Check for shot event (frequency based on team quality)
2. Shot Created → Determine type (1v1, team play, counter, set piece)
3. Shot Quality → Modified by attributes, fatigue, pressure, traits
4. On Target? → Success probability based on shot quality
5. Goalkeeper Save → GK attributes vs shot quality
6. Goal? → Register goal, update score, momentum, stats
```

**Implementation:**

```typescript
// Determine if shot occurs this interval
private shouldGenerateShot(team: 'home' | 'away', state: LiveMatchState): boolean {
  const baseChance = 0.25; // 25% per possession
  const teamRating = team === 'home' ? this.homeTeamQuality : this.awayTeamQuality;
  const momentumMod = (state.momentum.value - 50) / 200; // ±10%
  
  const shotChance = baseChance * (1 + (teamRating / 1000)) * (1 + momentumMod);
  return Math.random() < shotChance;
}

// Calculate shot quality (0-1 scale)
private calculateShotQuality(
  shooter: Player,
  creationType: 'oneVsOne' | 'teamPlay' | 'counter' | 'setPiece',
  defender: Player | null,
  state: LiveMatchState
): number {
  let quality = 0.5; // Base
  
  // Shot ability
  quality += (shooter.attributes.shooting / 100) * 0.3;
  quality += (shooter.attributes.finishing / 100) * 0.2;
  
  // Creation type bonus
  if (creationType === 'counter') quality += 0.2;
  if (creationType === 'setPiece') quality += 0.15;
  
  // Defender impact
  if (defender) {
    quality -= (defender.attributes.tackling / 100) * 0.15;
    quality -= (defender.attributes.positioning / 100) * 0.1;
  }
  
  // Fatigue penalty
  const fatigue = 1 - (shooter.energy / 100);
  quality *= (1 - fatigue * 0.3); // Up to 30% penalty
  
  // Traits
  if (shooter.traits.includes('finisher') && !defender) quality += 0.1;
  if (shooter.traits.includes('attemptsLongShots')) quality += 0.05;
  
  return Math.max(0.1, Math.min(1.0, quality));
}

// Process shot to goal
private processShotOutcome(
  shot: { shooter: Player; quality: number; goalkeeper: Player }
): { type: 'goal' | 'saved' | 'miss' | 'woodwork'; xG: number } {
  
  // On target probability (46.4% baseline)
  const onTargetProb = 0.464 * shot.quality;
  if (Math.random() > onTargetProb) {
    return { type: 'miss', xG: shot.quality * 0.1 };
  }
  
  // Goalkeeper save probability (35% baseline)
  const saveProb = 0.35 * (shot.goalkeeper.attributes.reflexes / 20);
  if (Math.random() < saveProb) {
    return { type: 'saved', xG: shot.quality * 0.35 };
  }
  
  // Goal probability (19.9% of on-target shots)
  const goalProb = 0.199 * shot.quality;
  if (Math.random() < goalProb) {
    return { type: 'goal', xG: shot.quality * 0.7 };
  }
  
  return { type: 'woodwork', xG: shot.quality * 0.4 };
}
```

**Actions:**
- [ ] Implement shot creation logic
- [ ] Implement shot quality calculation
- [ ] Implement goalkeeper save system
- [ ] Add goal event processing
- [ ] Implement shot miss/woodwork outcomes
- [ ] Create xG (expected goals) tracking

---

### 1.4 Timing Multipliers

**File:** `server/matchEngine.ts` (continued)

**Goal Distribution:**
```
0-10 min:   0.88x (slow start)
10-30 min:  0.98x (normal)
30-40 min:  1.15x (intensity)
Minute 39:  2.16x (peak danger)
Minute 38:  1.69x (very high)

Second half: 56.8% of goals (vs 43.2% first)
```

**Implementation:**
```typescript
private getTimingMultiplier(minute: number): number {
  if (minute <= 10) return 0.88;
  if (minute <= 30) return 0.98;
  if (minute <= 38) return 1.15;
  if (minute === 39) return 2.16; // Peak danger
  return 1.15;
}

// Apply when generating shots/events
const eventChance = baseChance * this.getTimingMultiplier(state.currentMinute);
```

**Actions:**
- [ ] Create timing multiplier function
- [ ] Apply to event generation
- [ ] Test against historical data
- [ ] Validate second-half bias (56.8% distribution)

---

## Phase 2: Defensive System & Events (Weeks 2-3)

### 2.1 Defensive Resistance Calculation

**File:** `server/matchEngine.ts`

**Defensive Impact:**
```
Prevents 30-60% of shots from being created
Reduces shot quality by 20-50%
Blocks 15-40% of remaining shots
Causes 15-30% of tackles to result in fouls
```

**Implementation:**
```typescript
private calculateDefensiveResistance(
  defendingTeam: Team,
  defendingPlayers: Player[],
  tactics: TacticalSetup,
  state: LiveMatchState
): number {
  const avgTackling = this.averageAttribute(defendingPlayers, 'tackling');
  const avgPositioning = this.averageAttribute(defendingPlayers, 'positioning');
  const avgMarking = this.averageAttribute(defendingPlayers, 'marking');
  
  let resistance = (avgTackling + avgPositioning + avgMarking) / 3;
  
  // Tactical modifiers
  if (tactics.mentality === 'VeryDefensive') resistance *= 1.30;
  if (tactics.mentality === 'VeryAttacking') resistance *= 0.85;
  
  if (tactics.pressingIntensity === 'VeryHigh') resistance *= 0.85;
  if (tactics.width === 'Narrow') resistance *= 1.15;
  
  // Fatigue penalty
  const avgEnergy = defendingPlayers.reduce((sum, p) => sum + p.energy, 0) / defendingPlayers.length;
  const fatigueModifier = 1.0 - ((100 - avgEnergy) / 100) * 0.2; // Up to -20%
  resistance *= fatigueModifier;
  
  return resistance;
}

// Use in shot prevention
private shouldPreventShot(
  offensiveQuality: number,
  defensiveResistance: number
): boolean {
  const preventionChance = (defensiveResistance / 100) * 0.5; // Up to 50%
  const reducedPrevention = preventionChance * (1 - offensiveQuality / 100);
  return Math.random() < reducedPrevention;
}
```

**Actions:**
- [ ] Implement defensive rating calculation
- [ ] Add tactical modifiers
- [ ] Add fatigue factors
- [ ] Integrate into shot generation
- [ ] Test defensive balance

---

### 2.2 Fouls & Discipline System

**File:** `server/matchEngine.ts`

**Foul Types:**
```
Tactical Foul: -10% to expected possession shift
Professional Foul: -20% + yellow card
Serious Foul Play: Red card + 2-minute major weakness (Minus one player) - Possession probability should decrease significantly
When one team reaches 6+ fouls in a half every free kick should generate a good scoring chance (10 meter free-kick with no wall)
```

**Implementation:**
```typescript
private shouldCommitFoul(
  defender: Player,
  minute: number,
  defenseUnderPressure: boolean
): boolean {
  let foulProb = 0.20; // Base 20%
  
  // Defender attributes
  foulProb += (20 - defender.attributes.tackling) * 0.015;
  foulProb += defender.attributes.aggression * 0.01;
  
  // Traits
  if (defender.traits.includes('hardTackler')) foulProb += 0.15;
  if (defender.traits.includes('standsOff')) foulProb -= 0.10;
  
  // Late game desperation
  if (minute > 35) foulProb += 0.10;
  if (defenseUnderPressure) foulProb += 0.05;
  
  return Math.random() < Math.min(0.6, foulProb);
}

// Determine card type
private determineCardType(
  defender: Player,
  severity: 'light' | 'moderate' | 'severe'
): 'none' | 'yellow' | 'red' {
  if (severity === 'light') {
    return Math.random() < 0.3 ? 'yellow' : 'none';
  } else if (severity === 'moderate') {
    return Math.random() < 0.7 ? 'yellow' : 'none';
  } else {
    return 'red'; // Severe always results in card
  }
}
```

**Actions:**
- [ ] Implement foul probability
- [ ] Implement card system (yellow/red)
- [ ] Add card consequences (red = reduced players)
- [ ] Track yellow card accumulation

---

### 2.3 Event Generation & Variety

**File:** `server/matchEngine.ts`

**Event Types & Frequencies:**
```
Common (every 1-2 ticks / ~15-30s):
  - Possession change
  - Dribble attempt
  - Tackle/interception (can trigger counter-attack)
  
Medium (every 3-5 ticks / ~1-3 min):
  - Shot attempt
  - Corner
  - Foul
  - Card
  
Rare (1-7 per match):
  - Goal
  - Penalty
  - Injury
  - Red card

Note: Pass events are NOT tracked individually - passing is implicit in possession retention and team play.
Counter-attacks are flagged after successful tackles for bonus shot quality in next tick.
```

**Event Generation Algorithm:**

```typescript
function generateEventsForTick(state: LiveMatchState): MatchEvent[] {
  const events: MatchEvent[] = [];
  
  // 1. Determine possession (if changed)
  const newPossession = calculatePossession(state);
  if (newPossession !== state.possession) {
    events.push(createPossessionChangeEvent(state, newPossession));
    state.possession = newPossession;
  }
  
  // 2. Check if counter-attack is active (from previous tick's successful tackle)
  const isCounterAttack = state.counterAttackActive.team === state.possession && state.counterAttackActive.ticksRemaining > 0;
  
  // 3. Generate action based on possession and game state
  const eventType = selectEventType(state, isCounterAttack);
  
  switch (eventType) {
    case 'shot':
      const shotEvent = generateShotEvent(state, isCounterAttack);
      events.push(...shotEvent); // May include goal, save, miss
      break;
      
    case 'dribble':
      const dribbleEvent = generateDribbleEvent(state);
      events.push(dribbleEvent);
      break;
      
    case 'tackle':
      const tackleEvent = generateTackleEvent(state);
      events.push(...tackleEvent); // May include foul, card, counter-attack flag
      break;
      
    case 'corner':
      const cornerEvent = generateCornerEvent(state);
      events.push(cornerEvent);
      break;
      
    case 'none':
      // Quiet tick, just time passing
      break;
  }
  
  // 4. Decrement counter-attack timer
  if (state.counterAttackActive.ticksRemaining > 0) {
    state.counterAttackActive.ticksRemaining--;
    if (state.counterAttackActive.ticksRemaining === 0) {
      state.counterAttackActive.team = null; // Counter-attack window expired
    }
  }
  
  // 5. Store last event for context
  if (events.length > 0) {
    state.lastEvent = events[events.length - 1];
  }
  
  return events;
}

function selectEventType(state: LiveMatchState, isCounterAttack: boolean): EventType {
  const attackingTeam = state.possession === 'home' ? 'home' : 'away';
  const teamQuality = getTeamQuality(state, attackingTeam);
  const defensiveResistance = getDefensiveResistance(state, attackingTeam === 'home' ? 'away' : 'home');
  
  // Base probabilities per tick
  let shotProb = 0.05;      // 5% base
  let dribbleProb = 0.15;   // 15% base
  let tackleProb = 0.20;    // 20% base (defending team attempts)
  let cornerProb = 0.02;    // 2% base
  
  // COUNTER-ATTACK BONUS: Significantly increase shot probability
  if (isCounterAttack) {
    shotProb *= 2.5;        // 2.5x shot chance on counter
    dribbleProb *= 0.5;     // Less dribbling (quick attack)
    tackleProb *= 0.6;      // Harder for defense to react
  }
  
  // Adjust based on team quality
  shotProb *= (1 + (teamQuality - 70) / 100);
  
  // Adjust based on tactics
  const tactics = state[`${attackingTeam}Tactics`];
  if (tactics.mentality === 'VeryAttacking') {
    shotProb *= 1.3;
  } else if (tactics.mentality === 'VeryDefensive') {
    shotProb *= 0.7;
  }
  
  // Adjust based on momentum
  const momentumModifier = (state.momentum.value - 50) / 100;
  if (attackingTeam === 'home') {
    shotProb *= (1 + momentumModifier * 0.3);
  } else {
    shotProb *= (1 - momentumModifier * 0.3);
  }
  
  // Adjust based on timing
  shotProb *= getTimingMultiplier(state.currentMinute);
  
  // Defensive resistance reduces shot probability
  shotProb *= (1 - defensiveResistance / 200);
  
  // Normalize and select
  const total = shotProb + dribbleProb + tackleProb + cornerProb;
  const rand = Math.random() * total;
  
  let cumulative = 0;
  cumulative += shotProb;
  if (rand < cumulative) return 'shot';
  
  cumulative += dribbleProb;
  if (rand < cumulative) return 'dribble';
  
  cumulative += tackleProb;
  if (rand < cumulative) return 'tackle';
  
  cumulative += cornerProb;
  if (rand < cumulative) return 'corner';
  
  return 'none'; // Quiet tick
}

function generateShotEvent(state: LiveMatchState, isCounterAttack: boolean = false): MatchEvent[] {
  const attackingTeam = state.possession === 'home' ? 'home' : 'away';
  const players = state[`${attackingTeam}Lineup`];
  const goalkeeper = state[attackingTeam === 'home' ? 'awayLineup' : 'homeLineup'].find(p => p.player.position === 'GK');
  
  // Select shooter based on traits + position
  const shooter = selectPlayerForAction('shot', players, state);
  
  // Determine shot type (counter-attack flag passed in)
  const shotType = determineShotType(state, isCounterAttack);
  
  // Calculate shot quality (BONUS for counter-attacks)
  const quality = calculateShotQuality(shooter, shotType, state, isCounterAttack);
  
  // Process outcome
  const outcome = processShotOutcome(shooter, quality, goalkeeper);
  
  const events: MatchEvent[] = [];
  
  // Shot event
  events.push({
    minute: state.currentMinute,
    type: 'shot',
    playerId: shooter.player.id,
    playerName: shooter.player.name,
    teamId: state[`${attackingTeam}TeamId`],
    description: `${shooter.player.name} shoots${isCounterAttack ? ' (COUNTER-ATTACK)' : ''} (${shotType})`,
    quality: quality,
    isCounterAttack: isCounterAttack // Flag for UI highlighting
  });
  
  // Outcome event
  if (outcome.type === 'goal') {
    events.push({
      minute: state.currentMinute,
      type: 'goal',
      playerId: shooter.player.id,
      playerName: shooter.player.name,
      teamId: state[`${attackingTeam}TeamId`],
      description: `⚽ GOAL! ${shooter.player.name} scores!${isCounterAttack ? ' (Counter-attack)' : ''}`,
      isCounterAttack: isCounterAttack
    });
    
    // Update score
    if (attackingTeam === 'home') {
      state.score.home++;
    } else {
      state.score.away++;
    }
    
    // Update momentum
    applyEventMomentum('goal', attackingTeam, state);
    
    // Clear counter-attack flag after scoring
    state.counterAttackActive.team = null;
    state.counterAttackActive.ticksRemaining = 0;
    
  } else if (outcome.type === 'saved') {
    events.push({
      minute: state.currentMinute,
      type: 'save',
      playerId: goalkeeper.player.id,
      playerName: goalkeeper.player.name,
      teamId: state[attackingTeam === 'home' ? 'awayTeamId' : 'homeTeamId'],
      description: `Save by ${goalkeeper.player.name}!`
    });
    
  } else if (outcome.type === 'woodwork') {
    events.push({
      minute: state.currentMinute,
      type: 'woodwork',
      playerId: shooter.player.id,
      playerName: shooter.player.name,
      teamId: state[`${attackingTeam}TeamId`],
      description: `${shooter.player.name} hits the post!`
    });
  }
  // 'miss' doesn't generate additional event beyond the shot
  
  // Update statistics
  state.statistics.shots[attackingTeam]++;
  if (outcome.type !== 'miss') {
    state.statistics.shotsOnTarget[attackingTeam]++;
  }
  if (outcome.type === 'saved') {
    state.statistics.saves[attackingTeam === 'home' ? 'away' : 'home']++;
  }
  
  return events;
}

function determineShotType(state: LiveMatchState, isCounterAttack: boolean): 'oneVsOne' | 'teamPlay' | 'counter' | 'setPiece' {
  // If counter-attack flag is set, force counter type
  if (isCounterAttack) {
    return 'counter';
  }
  
  if (state.lastEvent?.type === 'corner' || state.lastEvent?.type === 'freeKick') {
    return 'setPiece';
  }
  
  const rand = Math.random();
  if (rand < 0.4) {
    return 'oneVsOne'; // 40% 1v1
  }
  
  return 'teamPlay'; // 60% team play (if not 1v1)
}

function calculateShotQuality(
  shooter: OnCourtPlayer,
  shotType: 'oneVsOne' | 'teamPlay' | 'counter' | 'setPiece',
  state: LiveMatchState,
  isCounterAttack: boolean = false
): number {
  let quality = 0.5; // Base
  
  // Shot ability
  quality += (shooter.player.attributes.shooting / 100) * 0.3;
  quality += (shooter.player.attributes.finishing / 100) * 0.2;
  
  // Creation type bonus
  if (shotType === 'counter' || isCounterAttack) {
    quality += 0.25; // SIGNIFICANT BONUS for counter-attacks (defense out of position)
  }
  if (shotType === 'setPiece') quality += 0.15;
  
  // Defender impact (reduced on counter-attacks)
  const defendingTeam = state.possession === 'home' ? 'away' : 'home';
  const defender = selectDefender(state[`${defendingTeam}Lineup`]);
  
  if (defender) {
    const defenseMultiplier = isCounterAttack ? 0.5 : 1.0; // Defense less effective on counters
    quality -= (defender.player.attributes.tackling / 100) * 0.15 * defenseMultiplier;
    quality -= (defender.player.attributes.positioning / 100) * 0.1 * defenseMultiplier;
  }
  
  // Fatigue penalty
  const fatigue = 1 - (shooter.player.energy / 100);
  quality *= (1 - fatigue * 0.3); // Up to 30% penalty
  
  // Traits (selection already happened, this is quality bonus for specific traits)
  if (shooter.player.traits.includes('finisher') && !defender) quality += 0.1;
  
  return Math.max(0.1, Math.min(1.0, quality));
}

function generateTackleEvent(state: LiveMatchState): MatchEvent[] {
  const events: MatchEvent[] = [];
  const attackingTeam = state.possession;
  const defendingTeam = attackingTeam === 'home' ? 'away' : 'home';
  
  // Select defender attempting tackle (based on traits)
  const defender = selectPlayerForAction('tackle', state[`${defendingTeam}Lineup`], state);
  
  // Select attacker with ball
  const attacker = selectPlayerForAction('dribble', state[`${attackingTeam}Lineup`], state);
  
  // Calculate tackle success probability
  const tackleSuccess = calculateTackleSuccess(defender, attacker, state);
  
  const rand = Math.random();
  
  if (rand < tackleSuccess) {
    // SUCCESSFUL TACKLE - Win possession and trigger counter-attack!
    events.push({
      minute: state.currentMinute,
      type: 'tackle',
      playerId: defender.player.id,
      playerName: defender.player.name,
      teamId: state[`${defendingTeam}TeamId`],
      description: `${defender.player.name} wins the ball with a tackle!`,
      success: true
    });
    
    // Change possession
    state.possession = defendingTeam;
    
    // ACTIVATE COUNTER-ATTACK FLAG (lasts for 2 ticks = ~30 seconds)
    state.counterAttackActive = {
      team: defendingTeam,
      ticksRemaining: 2 // Counter-attack window: 2 ticks (30 seconds)
    };
    
    // Small momentum swing
    applyEventMomentum('tackle_won', defendingTeam, state);
    
    // Update stats
    state.statistics.tackles[defendingTeam]++;
    defender.performance.tackles++;
    
  } else {
    // Check if it's a foul
    const foulProbability = shouldCommitFoul(defender, state.currentMinute, tackleSuccess < 0.3);
    
    if (Math.random() < foulProbability) {
      // FOUL COMMITTED
      events.push({
        minute: state.currentMinute,
        type: 'foul',
        playerId: defender.player.id,
        playerName: defender.player.name,
        teamId: state[`${defendingTeam}TeamId`],
        description: `Foul by ${defender.player.name} on ${attacker.player.name}`
      });
      
      // Check for card
      const cardType = determineCardType(defender, 'moderate');
      if (cardType !== 'none') {
        events.push({
          minute: state.currentMinute,
          type: cardType === 'yellow' ? 'yellow_card' : 'red_card',
          playerId: defender.player.id,
          playerName: defender.player.name,
          teamId: state[`${defendingTeam}TeamId`],
          description: `${cardType === 'yellow' ? '🟨' : '🟥'} ${defender.player.name} receives a ${cardType} card`
        });
        
        // Handle red card consequences
        if (cardType === 'red') {
          // Remove player from lineup (4v5 situation)
          const idx = state[`${defendingTeam}Lineup`].findIndex(p => p.player.id === defender.player.id);
          if (idx !== -1) {
            const removedPlayer = state[`${defendingTeam}Lineup`].splice(idx, 1)[0];
            // Player is sent off, cannot be replaced
          }
        }
        
        defender.performance.cards[cardType]++;
      }
      
      // Update stats
      state.statistics.fouls[defendingTeam]++;
      defender.performance.fouls++;
      
      // Negative momentum for fouling team
      applyEventMomentum('foul', defendingTeam, state);
      
    } else {
      // FAILED TACKLE - Attacker keeps possession
      events.push({
        minute: state.currentMinute,
        type: 'tackle',
        playerId: defender.player.id,
        playerName: defender.player.name,
        teamId: state[`${defendingTeam}TeamId`],
        description: `${attacker.player.name} beats ${defender.player.name}`,
        success: false
      });
      
      // Attacker keeps ball, no possession change
      attacker.performance.dribbles++;
    }
  }
  
  return events;
}

function calculateTackleSuccess(
  defender: OnCourtPlayer,
  attacker: OnCourtPlayer,
  state: LiveMatchState
): number {
  let successProb = 0.5; // Base 50%
  
  // Defender attributes
  successProb += (defender.player.attributes.tackling / 100) * 0.3;
  successProb += (defender.player.attributes.positioning / 100) * 0.15;
  
  // Attacker attributes (resistance)
  successProb -= (attacker.player.attributes.dribbling / 100) * 0.25;
  successProb -= (attacker.player.attributes.pace / 100) * 0.10;
  
  // Fatigue impact
  const defenderFatigue = 1 - (defender.player.energy / 100);
  const attackerFatigue = 1 - (attacker.player.energy / 100);
  successProb -= defenderFatigue * 0.2; // Tired defender less effective
  successProb += attackerFatigue * 0.15; // Tired attacker easier to tackle
  
  // Momentum impact (small)
  const momentumModifier = (state.momentum.value - 50) / 100;
  if (state.possession === 'home') {
    successProb -= momentumModifier * 0.1; // Team with momentum harder to dispossess
  } else {
    successProb += momentumModifier * 0.1;
  }
  
  // Traits handled by selection, but can add small success modifier
  if (defender.player.traits.includes('hardTackler')) {
    successProb += 0.08; // Exception: hardTackler gets small success bonus
  }
  if (attacker.player.traits.includes('speedDribbler')) {
    successProb -= 0.06; // Exception: speedDribbler harder to tackle
  }
  
  return Math.max(0.1, Math.min(0.9, successProb));
}

function applyEventMomentum(
  eventType: 'goal' | 'tackle_won' | 'foul' | 'save',
  team: 'home' | 'away',
  state: LiveMatchState
): void {
  const momentumChanges = {
    goal: 25,
    tackle_won: 5,
    foul: -3,
    save: 8
  };
  
  const change = momentumChanges[eventType] || 0;
  
  if (team === 'home') {
    state.momentum.value += change;
  } else {
    state.momentum.value -= change;
  }
  
  state.momentum.value = Math.max(0, Math.min(100, state.momentum.value));
  
  // Update trend
  if (state.momentum.value > 60) {
    state.momentum.trend = 'home';
  } else if (state.momentum.value < 40) {
    state.momentum.trend = 'away';
  } else {
    state.momentum.trend = 'neutral';
  }
}
```

**Actions:**
- [ ] Create event type enum
- [ ] Implement event frequency system
- [ ] Generate realistic event variety
- [ ] Create event commentary system
- [ ] Add event timestamps
- [ ] **Implement tackle event with counter-attack triggering**
- [ ] **Implement counter-attack flag system (2-tick window)**
- [ ] **Add counter-attack bonuses to shot generation (+25% quality, 2.5x shot probability)**
- [ ] Remove pass event tracking (passes are implicit in possession retention)

---

## Phase 3: Tactical System & Modifiers (Weeks 3-4)

### 3.1 Tactical Presets & Modifiers

**File:** `server/matchEngine.ts` + new file `server/tacticsEngine.ts`

**Formations & Mentality:**
```
Very Defensive:
  - 4-0 / 3-1
  - -15% early, +10% late
  - -20% shots
  - +30% defense

Defensive:
  - 3-1
  - -8% early, +5% late
  - -10% shots
  - +15% defense

Balanced:
  - 2-2
  - 0% modifier
  - 0% shots
  - 0% defense

Attacking:
  - 2-2 / 1-3
  - +8% early, -5% late
  - +10% shots
  - -15% defense

Very Attacking:
  - 1-3 / 4-0
  - +15% early, -10% late
  - +20% shots
  - -30% defense
```

**Implementation:**
```typescript
interface TacticalModifier {
  mentality: Record<string, { earlyGame: number; lateGame: number; shotFreq: number; defense: number }>;
  pressing: Record<string, { fouls: number; turnovers: number; fatigue: number }>;
  width: Record<string, { wings: number; central: number; compactness: number }>;
}

private applyTacticalModifier(
  baseValue: number,
  tactics: TacticalSetup,
  minute: number
): number {
  const modifiers = this.tacticalModifiers[tactics.mentality];
  
  if (minute < 15) {
    return baseValue * (1 + modifiers.earlyGame);
  } else if (minute > 30) {
    return baseValue * (1 + modifiers.lateGame);
  } else {
    const blend = (minute - 15) / 15; // 0-1
    const midgameModifier = modifiers.earlyGame * (1 - blend) + modifiers.lateGame * blend;
    return baseValue * (1 + midgameModifier);
  }
}
```

**Actions:**
- [ ] Define tactical modifier system
- [ ] Implement mentality effects
- [ ] Implement pressing intensity effects
- [ ] Implement width effects
- [ ] Create tactical combination validation

---

### 3.2 Formation Impact

**File:** `server/tacticsEngine.ts`

**Formation Strengths/Weaknesses:**
```
4-0 (Ultra Defensive):
  + Best defense (1.3x resistance)
  - Worst attacking (0.7x shots)
  
3-1 (Defensive):
  + Strong defense (1.15x)
  - Limited attacking (0.85x)
  
2-2 (Balanced):
  + Balanced approach
  - No special advantages
  
1-3 (Attacking):
  - Weak defense (0.85x)
  + Strong attacking (1.15x)
  
1-2-1 (Dynamic):
  + Flexible (tactical bonuses)
  - Predictable
```

**Actions:**
- [ ] Define formation data
- [ ] Implement formation selection validation
- [ ] Apply formation modifiers to match engine
- [ ] Allow mid-match formation changes
- [ ] Create formation swap animation

---

### 3.3 Man-Marking System

**File:** `server/tacticsEngine.ts`

**Matching Defender to Attacker:**
```
Goal: Defenders suppress opponent's best players

Strategies:
1. Mirror Position: Fixo marks Pivot, Alas mark Alas
2. Best on Best: Elite defender on elite attacker
3. Speed Match: Fast defender on fast attacker
4. User Custom: Player-specified assignments
```

**Implementation:**
```typescript
function createManMarkingMatchups(
  offensivePlayers: Player[],
  defensivePlayers: Player[],
  strategy: 'mirror' | 'bestOnBest' | 'speedMatch' | 'custom',
  customAssignments?: Map<number, number> // defender -> attacker
): Map<number, number> {
  
  if (strategy === 'mirror') {
    return this.matchByPosition(offensivePlayers, defensivePlayers);
  } else if (strategy === 'bestOnBest') {
    return this.matchByRating(offensivePlayers, defensivePlayers);
  } else if (strategy === 'speedMatch') {
    return this.matchByPace(offensivePlayers, defensivePlayers);
  } else {
    return customAssignments || new Map();
  }
}

// Apply in shot quality calculation
if (defenderAssignment) {
  const marker = defenderAssignment.get(shooter.id);
  quality -= (marker.attributes.marking / 100) * 0.15;
}
```

**Actions:**
- [ ] Implement man-marking algorithm
- [ ] Create position matcher
- [ ] Create rating matcher
- [ ] Create pace matcher
- [ ] Allow custom assignments
- [ ] Show matchup on UI

---

## Phase 4: Match State - Momentum & Fatigue (Weeks 4-5)

### 4.1 Momentum System

**File:** `server/matchEngine.ts`

**Momentum Scale:** 0-100 (50 = neutral)
- 0 = Away dominating
- 50 = Equal
- 100 = Home dominating

**Event-Based Changes:**
```
Goal:              +25 (team) / -20 (opponent)
Conceded Goal:     -20
Shot On Target:    +5
Good Defense:      +3
Turnover:          -4
Foul:              -2
Saved Penalty:     +15
Missed Penalty:    -18
Yellow Card:       -5
Red Card:          -20
```

**Implementation:**
```typescript
private calculateMomentum(state: LiveMatchState, minute: number): number {
  let momentum = state.momentum.value;
  
  // Decay toward 50 (equilibrium)
  const decayRate = 1.5;
  if (momentum > 50) {
    momentum = Math.max(50, momentum - decayRate);
  } else if (momentum < 50) {
    momentum = Math.min(50, momentum + decayRate);
  }
  
  // Score differential
  const scoreDiff = state.score.home - state.score.away;
  if (scoreDiff > 0) {
    momentum += scoreDiff === 1 ? 1 : scoreDiff === 2 ? 0 : -2;
  } else if (scoreDiff < 0) {
    momentum += scoreDiff === -1 ? -1 : scoreDiff === -2 ? 0 : 2;
  }
  
  // Fatigue impact
  const homeFatigue = this.calculateTeamFatigue(state.homeLineup);
  const awayFatigue = this.calculateTeamFatigue(state.awayLineup);
  const fatigueImpact = (awayFatigue - homeFatigue) / 10;
  momentum += fatigueImpact;
  
  // Home advantage (constant)
  momentum += 0.5;
  
  return Math.max(0, Math.min(100, momentum));
}

// Apply event momentum
private applyEventMomentum(event: MatchEvent, state: LiveMatchState): void {
  const changes = {
    goal: 25,
    saved: -20,
    // ... etc
  };
  
  const change = changes[event.type] || 0;
  if (event.teamId === state.homeTeamId) {
    state.momentum.value += change;
  } else {
    state.momentum.value -= change;
  }
  
  state.momentum.value = Math.max(0, Math.min(100, state.momentum.value));
}
```

**How Momentum Affects Outcomes:**
```typescript
// Shot quality boost
quality *= (1 + ((teamMomentum - 50) / 100 * 0.30)); // ±15%

// Event frequency
eventChance *= (1 + ((teamMomentum - 50) / 100 * 0.30)); // More events

// Possession probability
possessionProb += ((teamMomentum - 50) / 100 * 0.10); // ±10%
```

**Actions:**
- [ ] Implement momentum tracking
- [ ] Implement event-based updates
- [ ] Implement decay toward center
- [ ] Apply momentum to probabilities
- [ ] Display momentum meter on UI
- [ ] Test momentum swings

---

### 4.2 Player Energy & Fatigue

**File:** `server/matchEngine.ts`

**Energy System:**
```
Starts at: 100% (fresh)
Decays: 1-2% per minute (depends on intensity)
Match Intensity: Based on score, time, game state
Fatigue penalty: -30% attributes at 0% energy
```

**Implementation:**
```typescript
private updatePlayerFatigue(players: OnCourtPlayer[], minute: number, state: LiveMatchState): void {
  const intensity = this.calculateMatchIntensity(state, minute);
  
  players.forEach(player => {
    // Base fatigue rate
    const baseFatigue = 1.5;
    const intensityMult = intensity / 100;
    const fitnessMult = (100 - player.player.attributes.stamina) / 100;
    
    const energyLoss = baseFatigue * (1 + intensityMult) * (1 + fitnessMult);
    player.player.energy = Math.max(0, player.player.energy - energyLoss);
    
    // Update effective attributes
    this.applyFatigueToAttributes(player);
  });
}

private applyFatigueToAttributes(player: OnCourtPlayer): void {
  const energyRatio = player.player.energy / 100;
  
  // Attributes degrade to 50% when completely exhausted
  const degradation = 0.5 + (energyRatio * 0.5);
  
  player.effectiveAttributes.pace = player.player.attributes.pace * degradation;
  player.effectiveAttributes.dribbling = player.player.attributes.dribbling * degradation;
  player.effectiveAttributes.tackling = player.player.attributes.tackling * degradation;
  player.effectiveAttributes.positioning = player.player.attributes.positioning * degradation;
}

// Calculate match intensity
private calculateMatchIntensity(state: LiveMatchState, minute: number): number {
  let intensity = 50;
  
  const scoreDiff = Math.abs(state.score.home - state.score.away);
  if (scoreDiff === 0) intensity += 20;
  else if (scoreDiff === 1) intensity += 10;
  
  if (minute >= 35) intensity += 15;
  else if (minute >= 30) intensity += 10;
  
  if (Math.abs(state.momentum.value - 50) > 30) intensity += 10;
  
  return Math.min(100, intensity);
}
```

**Actions:**
- [ ] Implement energy tracking
- [ ] Implement fatigue accumulation
- [ ] Implement attribute degradation
- [ ] Implement match intensity calculation
- [ ] Display player energy on UI
- [ ] Show fatigue warnings

---

### 4.3 Substitution System

**File:** `server/matchEngine.ts`

**Unlimited Substitutions (Futsal):**
```
Fresh player (100% energy) provides:
  - +10% team strength
  - Momentum boost (+5)
  - Replaces tired player
```

**Auto-Substitution Logic:**
```typescript
private checkSubstitutions(state: LiveMatchState, minute: number): void {
  if (minute < 5 || minute > 38) return;
  
  state.homeLineup.forEach(player => {
    if (player.energy < 30 && state.homeBench.length > 0) {
      this.makeSubstitution(state, 'home', player);
    }
  });
  
  state.awayLineup.forEach(player => {
    if (player.energy < 30 && state.awayBench.length > 0) {
      this.makeSubstitution(state, 'away', player);
    }
  });
}

private makeSubstitution(state: LiveMatchState, team: 'home' | 'away', tiredPlayer: Player): void {
  const lineup = team === 'home' ? state.homeLineup : state.awayLineup;
  const bench = team === 'home' ? state.homeBench : state.awayBench;
  
  const freshestPlayer = bench
    .filter(p => p.position === tiredPlayer.position)
    .sort((a, b) => b.energy - a.energy)[0];
  
  if (freshestPlayer) {
    const idx = lineup.findIndex(p => p.id === tiredPlayer.id);
    lineup[idx] = freshestPlayer;
    bench.splice(bench.indexOf(freshestPlayer), 1);
    bench.push(tiredPlayer);
    
    state.events.push({
      minute: state.currentMinute,
      type: 'substitution',
      playerId: freshestPlayer.id,
      playerName: freshestPlayer.name,
      teamId: team === 'home' ? state.homeTeamId : state.awayTeamId,
      description: `${tiredPlayer.name} substituted for ${freshestPlayer.name}`
    });
  }
}
```

**Actions:**
- [ ] Implement substitution logic
- [ ] Implement auto-substitution
- [ ] Allow user substitutions
- [ ] Track substitution impact
- [ ] Generate substitution events
- [ ] Update UI with fresh players

---

## Phase 5: Player Traits & Team Chemistry (Weeks 5-6)

### 5.1 Trait System Implementation

**File:** `server/traitsEngine.ts` (NEW)

**Core Trait Categories & Impacts:**

#### Offensive Traits

**IMPORTANT:** These traits affect WHO gets selected for actions, NOT success rates.

```
attemptsToDribble:
  - Selection Impact: 1.5x more likely to be selected for 1v1 dribble attempts
  - Context: When "1v1 dribble chance" occurs, this player is 50% more likely to be chosen
  - Success Rate: Determined by dribbling attribute (same formula for all players)
  - Example: 3 players available → Player with trait has ~43% selection chance vs ~29% for others

looksForPass:
  - Selection Impact: 1.4x more likely to be selected for team play/pass opportunities
  - Selection Impact: 0.8x less likely for own shot attempts (less selfish)
  - Context: When "team play pass" opportunity occurs, this player more likely to be passer
  - Success Rate: Determined by passing attribute
  - Example: More likely to pass to open teammate instead of shooting

playsWithBackToGoal:
  - Selection Impact: 1.3x more likely to be selected for hold-up play situations
  - Context: When "back-to-goal" play occurs, this player more likely to receive ball
  - Success Rate: Determined by strength/positioning attributes
  - Example: Pivot player who receives deep passes with back to goal

attemptsTurnToShoot:
  - Selection Impact: 1.4x more likely for "turn and shoot" opportunities
  - Context: When tight-space shooting chance occurs, this player more likely selected
  - Success Rate: Determined by shooting + dribbling attributes
  - Example: Quick turn in midfield to create shooting space

triesToVolley:
  - Selection Impact: 1.5x more likely for free kick/volley shot attempts
  - Context: When set piece occurs, this player more likely to take volley
  - Success Rate: Determined by shooting attribute
  - Example: Player attempts direct volley on free kick delivery

appearsAtSecondPost:
  - Selection Impact: 1.5x more likely for team play finishing opportunities
  - Context: When "second post" or "close range finish" occurs, this player more likely
  - Success Rate: Determined by finishing/positioning attributes
  - Example: Tap-in merchant, always in right place for rebounds

does1v2PassAndGo:
  - Selection Impact: 1.4x more likely for one-two pass combinations
  - Context: When "1-2 pass" opportunity occurs, this player more likely to initiate
  - Success Rate: Determined by passing + positioning attributes
  - Example: Quick wall passes to break defensive lines

speedDribbler:
  - Selection Impact: 1.3x more likely for pace-based 1v1 attempts (especially counters)
  - Context: When "open space dribble" occurs, this player more likely if fast
  - Success Rate: Determined by pace + dribbling attributes
  - Example: Uses speed over skill to beat defenders in transition

technicalDribbler:
  - Selection Impact: 1.3x more likely for tight-space 1v1 attempts
  - Context: When "congested dribble" occurs, this player more likely
  - Success Rate: Determined by dribbling + technique attributes
  - Example: Close control dribbling in crowded midfield

finisher:
  - Selection Impact: 1.6x more likely for open finishing opportunities
  - Context: When "clear goal chance" occurs, this player much more likely to take it
  - Success Rate: Determined by shooting attribute
  - Example: Clinical striker who gets selected for key chances

playmaker:
  - Selection Impact: 1.4x more likely for creative/team play opportunities
  - Context: When "key pass" or "creative action" occurs, this player more likely
  - Success Rate: Determined by passing + vision attributes
  - Example: Orchestrates attacks, gets selected for assist opportunities

runsInBehind:
  - Selection Impact: 1.4x more likely for counter attack opportunities
  - Context: When "counter" or "through ball" occurs, this player more likely to receive
  - Success Rate: Determined by pace + positioning attributes
  - Example: Always making runs behind defense on transitions

comesToBall:
  - Selection Impact: 1.3x more likely for buildup play/deep receiving
  - Context: When "buildup pass" occurs, this player more likely to be target
  - Success Rate: Determined by positioning attribute
  - Example: Drops deep to receive from goalkeeper/defenders

targetMan:
  - Selection Impact: 1.5x more likely for aerial duels/physical play
  - Context: When "aerial chance" or "header" occurs, this player more likely
  - Success Rate: Determined by heading + strength attributes
  - Example: Tall striker who wins aerial balls and flick-ons
```

#### Defensive Traits

**IMPORTANT:** These traits affect WHO gets selected for defensive actions, NOT success rates.

```
hardTackler:
  - Selection Impact: 1.5x more likely to attempt tackles
  - Context: When "tackle opportunity" occurs, this player more likely to commit
  - Success Rate: Determined by tackling attribute
  - Side Effect: Higher foul probability (player attempts risky tackles)
  - Example: Aggressive defender who frequently commits to tackles

anticipates:
  - Selection Impact: 1.4x more likely for interception opportunities
  - Context: When "interception chance" occurs, this player more likely to read it
  - Success Rate: Determined by positioning + tackling attributes
  - Side Effect: Fewer fouls (smart defending over aggression)
  - Example: Reads pass early and steps in to intercept

standsOff:
  - Selection Impact: 1.3x more likely for blocking/positioning actions
  - Selection Impact: 0.7x less likely for tackle attempts
  - Context: When "defensive position" needed, this player more likely to hold position
  - Success Rate: Determined by positioning + marking attributes
  - Side Effect: Fewer fouls (avoids risky tackles)
  - Example: Jockey defender, blocks passing lanes instead of tackling

tightMarking:
  - Selection Impact: 1.5x more likely to be assigned to mark specific opponent
  - Context: When "man-marking" assigned, this player more likely to stick tight
  - Success Rate: Determined by marking attribute
  - Side Effect: May reduce opponent shot quality (tactical effect, not trait modifier)
  - Example: Shadows elite opponent throughout match

pressesHigh:
  - Selection Impact: 1.4x more likely for high-pressure attempts
  - Context: When "press" action occurs in attacking third, this player more likely
  - Success Rate: Determined by pace + tackling attributes
  - Side Effect: Increases team fatigue rate
  - Example: Closes down goalkeeper/defender immediately

recoversWell:
  - Selection Impact: 1.4x more likely for defensive recovery actions
  - Context: When "recovery run" needed after being beaten, this player more likely
  - Success Rate: Determined by pace + stamina attributes
  - Example: Recovers after failed tackle to block shot
```

#### Mental Traits

**NOTE:** Mental traits mostly don't affect selection, but affect match context or outcomes.

```
nerveless:
  - Selection Impact: 1.0x (no change in selection)
  - Performance Impact: +15% shot success in high-pressure moments (min 35-40)
  - Performance Impact: +20% penalty conversion
  - Context: Performs better when stakes are high
  - Example: Scores crucial goal when team needs it most
  - EXCEPTION: This trait DOES modify success rate (mental fortitude)

choker:
  - Selection Impact: 1.0x (no change in selection)
  - Performance Impact: -25% shot success in high-pressure moments (min 35-40)
  - Performance Impact: -30% penalty conversion
  - Context: Underperforms when stakes are high (opposite of nerveless)
  - Example: Misses easy chance in crucial moment
  - EXCEPTION: This trait DOES modify success rate (mental weakness)

leader:
  - Selection Impact: 1.0x for own actions (no change)
  - Team Impact: +8% team morale modifier (affects all teammates)
  - Team Impact: +15% comeback probability when losing
  - Context: Inspires teammates to perform better
  - Example: Team plays better when leader is on court
  - NOTE: Affects team performance, not individual selection

consistent:
  - Selection Impact: 1.0x (no change in selection)
  - Performance Impact: Reduces attribute variance by 50%
  - Context: Always performs near expected level (reliable)
  - Example: Regularly rates 7.0-7.5, never 5.0 or 9.0
  - NOTE: Reduces randomness, not a selection modifier

erratic:
  - Selection Impact: 1.0x (no change in selection)
  - Performance Impact: Increases attribute variance by 100%
  - Context: Unpredictable - can be brilliant or terrible
  - Example: Might rate 9.5 one match, 4.5 the next
  - NOTE: Increases randomness, not a selection modifier

classy:
  - Selection Impact: 1.0x (no change in selection)
  - Performance Impact: +8% pass accuracy overall
  - Performance Impact: Fewer decision-making mistakes
  - Context: Technical excellence in execution
  - Example: High pass completion, few mistakes
  - EXCEPTION: This trait DOES improve execution quality
```

#### Goalkeeper Traits

**NOTE:** Goalkeeper traits have mixed effects - some affect selection, some affect performance.

```
isFlyGoalkeeper:
  - Selection Impact: 2.0x more likely to come out as field player late game
  - Activation Probability: 5% base (↑15% when losing, ↑20% when down 2+)
  - Context: GK leaves goal to become 6th field player
  - Team Impact: +25% team shots when active (extra attacker)
  - Risk: +30% concede probability if caught out of position
  - Duration: Until goal scored or possession lost
  - Example: GK comes out at minute 38 when trailing by 1
  - NOTE: This is a SELECTION trait (more likely to attempt)

rushesShotStopper:
  - Selection Impact: 1.0x (no change in when saves are attempted)
  - Performance Impact: +10% save rate on weak shots (closes down space)
  - Performance Impact: -5% save rate on strong shots (caught out of position)
  - Performance Impact: +15% save rate on 1v1 situations
  - Context: Aggressive GK who closes down shooters
  - Example: Rushes out to block shot, reducing shooter's angle
  - EXCEPTION: This trait DOES modify save success rates

sweeper:
  - Selection Impact: 1.0x for saves (no change)
  - Performance Impact: +8% distribution pass accuracy
  - Team Impact: +15% counter attack frequency (quick distribution)
  - Team Impact: Fewer defensive errors behind (good positioning)
  - Context: Modern sweeper-keeper who plays out from back
  - Example: Accurate throw starts quick counter attack
  - EXCEPTION: This trait DOES improve distribution quality

distributor:
  - Selection Impact: 1.0x (no change in selection)
  - Performance Impact: +12% pass accuracy from goalkeeper
  - Team Impact: +8% team play frequency (better buildup)
  - Team Impact: +10% buildup play success rate
  - Context: GK provides accurate passes for buildup
  - Example: Precise throw to midfielder starts attack
  - EXCEPTION: This trait DOES improve passing quality

nerveless (GK):
  - Same as field player nerveless trait
  - Performance Impact: +8% save rate in pressure moments
  - Performance Impact: Fewer errors under pressure
  - Context: Mental strength for crucial saves
  - Example: Saves penalty when match is on line
  - EXCEPTION: This trait DOES modify save success rates
```

#### Teamwork Traits

**IMPORTANT:** These traits affect WHO gets selected for team-oriented actions.

```
teamPlayer:
  - Selection Impact: 1.3x more likely for team play opportunities
  - Selection Impact: More likely to pass when shooting is also viable
  - Context: When "team play" or "support" action occurs, this player more likely
  - Success Rate: Determined by passing/positioning attributes
  - Team Impact: +8% team chemistry with multiple team players
  - Example: Passes to open teammate instead of taking contested shot

selfish:
  - Selection Impact: 1.4x more likely for own shot attempts
  - Selection Impact: Less likely to pass when shooting is viable
  - Context: When "shot opportunity" occurs, this player more likely to take it
  - Success Rate: Determined by shooting attribute
  - Team Impact: -8% team chemistry with multiple selfish players
  - Example: Shoots when teammate has easier chance

presser:
  - Selection Impact: 1.3x more likely for pressing actions
  - Context: When "press" opportunity occurs, this player more likely
  - Success Rate: Determined by pace + tackling attributes
  - Team Impact: Increases team pressing effectiveness
  - Example: Whole team presses when multiple pressers on court

defender:
  - Selection Impact: 1.3x more likely for defensive actions
  - Selection Impact: 0.8x less likely for attacking actions
  - Context: When "defensive duty" occurs, this player more likely to be involved
  - Success Rate: Determined by defensive attributes
  - Example: Consistently wins tackles and blocks

midfielder:
  - Selection Impact: 1.1x more likely in both attack and defense (balanced)
  - Context: Equally likely to be involved in both phases
  - Success Rate: Determined by relevant attributes
  - Example: Balanced contributions across all match phases

supporter:
  - Selection Impact: 1.5x more likely for assist/support play
  - Context: When "assist opportunity" or "support action" occurs, this player more likely
  - Success Rate: Determined by passing + positioning attributes
  - Team Impact: Boosts teammate performance
  - Example: Key passes and support runs that create chances
```

**Trait System Summary:**

**Selection Traits (Most Traits - 40+):**
- Affect WHO performs actions (1.3x-2.0x selection probability)
- Do NOT affect success rates once selected
- Success determined by attributes only
- Examples: attemptsToDribble, appearsAtSecondPost, hardTackler, finisher, teamPlayer

**Performance Traits (Exceptions - Mental/GK):**
- Affect HOW WELL actions succeed (not selection)
- Modify success rates or execution quality
- Examples: nerveless (+15% clutch shots), choker (-25% pressure), rushesShotStopper (+10% weak shots), classy (+8% pass accuracy)

**Why the distinction?**
- Selection traits: Create playstyle variety (WHO gets the ball in what situations)
- Performance traits: Represent mental fortitude or GK-specific techniques
- This keeps most traits simple (selection only) while allowing a few exceptions for realism

**Core Trait Categories:**
```
Offensive:     attemptsToDribble, speedDribbler, technicalDribbler, finisher, playmaker, looksForPass, playsWithBackToGoal, attemptsTurnToShoot, triesToVolley, appearsAtSecondPost, does1v2PassAndGo, runsInBehind, comesToBall, targetMan
Defensive:     hardTackler, anticipates, standsOff, tightMarking, pressesHigh, recoversWell
Mental:        nerveless, choker, leader, consistent, erratic, classy
Goalkeeper:    isFlyGoalkeeper, rushesShotStopper, sweeper, distributor
Teamwork:      teamPlayer, selfish, presser, defender, midfielder, supporter
```

**Impact Layer: Player Selection Multipliers**

Traits affect **WHO gets selected for actions**, NOT the success rate:

```typescript
// Trait-based player selection multipliers
// When a chance type occurs, traits increase probability that THIS player performs it
const traitPlayerSelectionMultipliers = {
  // OFFENSIVE SELECTION TRAITS
  // "If there's a 1v1 chance, this player is more likely to take it"
  attemptsToDribble: { 
    selected_for: '1v1 dribble attempts',
    multiplier: 1.5  // 1.5x more likely to attempt 1v1
  },
  
  // "If there's a team play chance, this player is more likely to finish it"
  appearsAtSecondPost: {
    selected_for: 'team play finish (especially close range)',
    multiplier: 1.5  // 1.5x more likely to be second post player
  },
  
  // "If there's a 1v2 combination, this player more likely executes it"
  does1v2PassAndGo: {
    selected_for: 'team play chance (one-two combinations)',
    multiplier: 1.4  // 1.4x more likely to perform 1v2
  },
  
  // "If there's a free kick chance, this player is more likely to take volley"
  triesToVolley: {
    selected_for: 'free kick shot attempts',
    multiplier: 1.5  // 1.5x more likely to attempt volley
  },
  
  // "If there's a 1v1 turn and shoot, this player more likely attempts it"
  attemptsTurnToShoot: {
    selected_for: '1v1 turn-and-shoot attempts',
    multiplier: 1.4  // 1.4x more likely to attempt turn shots
  },
  
  // "If there's a chance where player has back to goal, this player more likely"
  playsWithBackToGoal: {
    selected_for: 'hold-up play / back-to-goal situations',
    multiplier: 1.3  // 1.3x more likely to be hold-up player
  },
  
  // "If there's a possession chance, this player more likely to look for pass"
  looksForPass: {
    selected_for: 'team play / pass opportunities',
    multiplier: 1.4  // 1.4x more likely to pass when chance available
  },
  
  // Speed dribbler more likely to be selected for 1v1 in counter attacks
  speedDribbler: {
    selected_for: '1v1 in counter attacks / open space',
    multiplier: 1.3  // 1.3x more likely in transition
  },
  
  // Technical dribbler more likely in tight spaces / midfield
  technicalDribbler: {
    selected_for: '1v1 in tight/congested areas',
    multiplier: 1.3  // 1.3x more likely in structured defense
  },
  
  // Finisher more likely to be selected for open finish chances
  finisher: {
    selected_for: 'open finishing opportunities',
    multiplier: 1.6  // 1.6x more likely as finisher
  },
  
  // Playmaker more likely in team play situations
  playmaker: {
    selected_for: 'team play / creative opportunities',
    multiplier: 1.4  // 1.4x more likely in team play
  },
  
  // Target man more likely for aerial/physical chances
  targetMan: {
    selected_for: 'aerial duels / headers / physical play',
    multiplier: 1.5  // 1.5x more likely for aerial chances
  },
  
  // Runs in behind for counter attacks
  runsInBehind: {
    selected_for: 'counter attack / through ball chances',
    multiplier: 1.4  // 1.4x more likely for counters
  },
  
  // Comes to ball for buildup play
  comesToBall: {
    selected_for: 'buildup play / possession sequences',
    multiplier: 1.3  // 1.3x more likely in buildup
  },
  
  // DEFENSIVE SELECTION TRAITS
  // Hard tackler more likely to attempt tackles
  hardTackler: {
    selected_for: 'tackle attempts',
    multiplier: 1.5  // 1.5x more likely to make tackle attempt
  },
  
  // Anticipates more likely to intercept
  anticipates: {
    selected_for: 'interception opportunities',
    multiplier: 1.4  // 1.4x more likely to intercept
  },
  
  // Stands off more likely for positioning/blocking
  standsOff: {
    selected_for: 'blocking passes / positioning',
    multiplier: 1.3  // 1.3x more likely to block/position
  },
  
  // Tight marking more likely when assigned to mark
  tightMarking: {
    selected_for: 'player marking / close pressure',
    multiplier: 1.5  // 1.5x more likely if assigned to mark
  },
  
  // Presses high more likely in pressing situations
  pressesHigh: {
    selected_for: 'high pressure attempts',
    multiplier: 1.4  // 1.4x more likely to press
  },
  
  // Recovers well more likely selected for recovery attempts
  recoversWell: {
    selected_for: 'defensive recovery actions',
    multiplier: 1.4  // 1.4x more likely to recover
  },
  
  // MENTAL/TEAMWORK SELECTION TRAITS
  // GK fly keeper more likely to come out as field player
  isFlyGoalkeeper: {
    selected_for: 'goalkeeper shoots / comes out as field player',
    multiplier: 2.0  // 2x more likely to attempt shooting
  },
  
  // Team player more likely selected for team play actions
  teamPlayer: {
    selected_for: 'team play / support actions',
    multiplier: 1.3  // 1.3x more likely in team play
  },
  
  // Selfish more likely selected for own shot attempts
  selfish: {
    selected_for: 'own shot attempts',
    multiplier: 1.4  // 1.4x more likely to shoot
  },
  
  // Supporter more likely as assist/support player
  supporter: {
    selected_for: 'assist / support play',
    multiplier: 1.5  // 1.5x more likely to assist
  },
  
  // Leader's traits don't change selection, affect outcome
  leader: {
    selected_for: 'any action (affects morale)',
    multiplier: 1.0  // No selection change
  }
};

// Implementation example:
function selectPlayerForAction(
  action: 'shot' | '1v1' | 'teamPlay' | 'tackle' | 'intercept',
  availablePlayers: Player[]
): Player {
  
  // Weight each player by their trait relevance
  const weighted = availablePlayers.map(player => {
    let weight = 1.0;
    
    // Check if player has traits relevant to this action type
    player.traits.forEach(trait => {
      const traitDef = traitPlayerSelectionMultipliers[trait];
      if (traitDef && isActionRelevant(action, traitDef.selected_for)) {
        weight *= traitDef.multiplier;
      }
    });
    
    return { player, weight };
  });
  
  // Select player using weighted random selection
  return selectWeighted(weighted);
}

// Example: 1v1 chance occurs
// Available players: [Player A (no traits), Player B (attemptsToDribble), Player C (finisher)]
// Selection weights:
//   - Player A: 1.0 (baseline)
//   - Player B: 1.5 (has attemptsToDribble) ← MOST LIKELY
//   - Player C: 1.0 (finisher doesn't apply to 1v1)
// Result: Player B is 1.5x more likely to take the 1v1
```

**Key Distinction:**
- **Without traits:** All players equally likely to attempt action (base probability)
- **With traits:** Player with relevant trait is 1.3x-2.0x more likely to be **selected** for that action
- **Success rate stays the same:** Once selected, all players use identical base success formulas (based on attributes)

**Implementation:**
```typescript
export class TraitEngine {
  // SIMPLE: Traits only affect player SELECTION probability, not success
  private traitPlayerSelectionWeights = {
    // Offensive
    attemptsToDribble: 1.5,           // 1.5x likely to be selected for 1v1
    looksForPass: 1.4,                // 1.4x likely for team play/passes
    playsWithBackToGoal: 1.3,         // 1.3x likely for hold-up play
    attemptsTurnToShoot: 1.4,         // 1.4x likely for turn shots
    triesToVolley: 1.5,               // 1.5x likely for free kicks
    appearsAtSecondPost: 1.5,         // 1.5x likely for team play finish
    does1v2PassAndGo: 1.4,            // 1.4x likely for one-two combinations
    speedDribbler: 1.3,               // 1.3x likely for pace dribbles
    technicalDribbler: 1.3,           // 1.3x likely in tight spaces
    finisher: 1.6,                    // 1.6x likely for finishing chances
    playmaker: 1.4,                   // 1.4x likely for creative play
    runsInBehind: 1.4,                // 1.4x likely for counter attacks
    comesToBall: 1.3,                 // 1.3x likely in buildup
    targetMan: 1.5,                   // 1.5x likely for aerials
    
    // Defensive
    hardTackler: 1.5,                 // 1.5x likely to make tackle
    anticipates: 1.4,                 // 1.4x likely to intercept
    standsOff: 1.3,                   // 1.3x likely to position/block
    tightMarking: 1.5,                // 1.5x likely to mark tightly
    pressesHigh: 1.4,                 // 1.4x likely to press
    recoversWell: 1.4,                // 1.4x likely to recover
    
    // Mental & Teamwork
    isFlyGoalkeeper: 2.0,             // 2.0x likely to shoot
    teamPlayer: 1.3,                  // 1.3x likely in team play
    selfish: 1.4,                     // 1.4x likely to shoot
    supporter: 1.5,                   // 1.5x likely to assist
    leader: 1.0,                      // No selection change
    
    // GK-specific (don't affect selection)
    rushesShotStopper: 1.0,
    sweeper: 1.0,
    distributor: 1.0,
    
    // Mental modifiers (don't affect selection directly)
    nerveless: 1.0,
    choker: 1.0,
    consistent: 1.0,
    erratic: 1.0,
    classy: 1.0,
    
    // Other
    presser: 1.3,
    defender: 1.3,
    midfielder: 1.1
  };
  
  // Trait action relevance mapping
  private traitActionRelevance = {
    // Offensive traits
    attemptsToDribble: ['1v1'],
    looksForPass: ['teamPlay', 'assist'],
    playsWithBackToGoal: ['holdUp', 'teamPlay'],
    attemptsTurnToShoot: ['1v1_turn', 'midfield_shot'],
    triesToVolley: ['freeKick', 'volley'],
    appearsAtSecondPost: ['teamPlay_finish'],
    does1v2PassAndGo: ['one_two', 'teamPlay'],
    speedDribbler: ['1v1_counter', '1v1_pace'],
    technicalDribbler: ['1v1_tight'],
    finisher: ['finish', 'open_shot'],
    playmaker: ['creative', 'pass', 'teamPlay'],
    runsInBehind: ['counter', 'throughBall'],
    comesToBall: ['buildup'],
    targetMan: ['aerial', 'header'],
    
    // Defensive traits
    hardTackler: ['tackle'],
    anticipates: ['intercept'],
    standsOff: ['position', 'block'],
    tightMarking: ['mark'],
    pressesHigh: ['press'],
    recoversWell: ['recovery'],
    
    // Goalkeeper
    isFlyGoalkeeper: ['gk_shoot'],
    rushesShotStopper: ['save'],
    sweeper: ['distribution', 'sweeping'],
    distributor: ['pass_from_gk'],
    
    // Other
    teamPlayer: ['teamPlay'],
    selfish: ['shot'],
    supporter: ['assist'],
    leader: ['any'],
    presser: ['press'],
    defender: ['defend'],
    midfielder: ['possession']
  };
  
  /**
   * Select which player performs an action
   * ONLY affects WHO gets selected, NOT success rate
   */
  selectPlayerForAction(
    action: string,
    availablePlayers: Player[]
  ): Player {
    const weighted = availablePlayers.map(player => {
      let weight = 1.0;
      
      // Check each trait on player
      player.traits.forEach(trait => {
        const relevantActions = this.traitActionRelevance[trait] || [];
        if (relevantActions.includes(action)) {
          weight *= this.traitPlayerSelectionWeights[trait];
        }
      });
      
      return { player, weight };
    });
    
    return selectWeightedRandom(weighted);
  }
  
  /**
   * Example flow:
   * 1. Match engine generates a "1v1 chance"
   * 2. Match engine calls selectPlayerForAction('1v1', homeTeamPlayers)
   * 3. If players available:
   *    - Player A (no traits): weight = 1.0
   *    - Player B (attemptsToDribble): weight = 1.5 ✓ SELECTED (more likely)
   *    - Player C (finisher): weight = 1.0
   * 4. Player B is ~60% likely to be selected for this 1v1
   * 5. Success rate = base formula (same for all players)
   * 
   * Same for other action types:
   * - "teamPlay_finish" chance → appearsAtSecondPost player 1.5x likely
   * - "intercept" opportunity → anticipates player 1.4x likely
   * - "free kick" → triesToVolley player 1.5x likely
   */
  
  // Get trait description for UI
  getTraitDescription(trait: string): string {
    const descriptions = {
      attemptsToDribble: 'If there\'s a 1v1 dribble chance, this player is 1.5x more likely to attempt it',
      appearsAtSecondPost: 'If there\'s a team play finish chance, this player is 1.5x more likely to finish it',
      does1v2PassAndGo: 'If there\'s a one-two opportunity, this player is 1.4x more likely to execute it',
      triesToVolley: 'If there\'s a free kick, this player is 1.5x more likely to volley it',
      attemptsTurnToShoot: 'If there\'s a tight space shot, this player is 1.4x more likely to attempt it',
      playsWithBackToGoal: 'If there\'s a hold-up play situation, this player is 1.3x more likely',
      looksForPass: 'If there\'s a team play opportunity, this player is 1.4x more likely to pass',
      speedDribbler: 'If there\'s a pace-based 1v1, this player is 1.3x more likely',
      technicalDribbler: 'In tight space 1v1s, this player is 1.3x more likely',
      finisher: 'If there\'s an open finish, this player is 1.6x more likely',
      playmaker: 'In team play situations, this player is 1.4x more likely',
      targetMan: 'For aerial chances, this player is 1.5x more likely',
      runsInBehind: 'In counter attacks, this player is 1.4x more likely',
      comesToBall: 'In buildup play, this player is 1.3x more likely',
      
      hardTackler: 'If there\'s a tackle, this player is 1.5x more likely to attempt it',
      anticipates: 'If there\'s an interception, this player is 1.4x more likely',
      standsOff: 'For positioning/blocking, this player is 1.3x more likely',
      tightMarking: 'When marking, this player is 1.5x more likely',
      pressesHigh: 'If pressing occurs, this player is 1.4x more likely',
      recoversWell: 'For recovery actions, this player is 1.4x more likely',
      
      isFlyGoalkeeper: 'If GK shoots, this player is 2.0x more likely',
      teamPlayer: 'In team play, this player is 1.3x more likely',
      selfish: 'For own shots, this player is 1.4x more likely',
      supporter: 'For assists, this player is 1.5x more likely'
    };
    
    return descriptions[trait] || 'Unknown trait';
  }
}
```

**CRITICAL CLARIFICATION:**

Traits = **SELECTION ONLY**, not success modifiers

```
WRONG: "Finisher trait makes player better at finishing (+18% success)"
RIGHT: "Finisher trait makes player 1.6x more likely to be selected for finishing chances"

WRONG: "Hard Tackler trait increases tackle success"
RIGHT: "Hard Tackler trait makes player 1.5x more likely to be selected for tackle attempts"

WRONG: "Speed Dribbler increases 1v1 success"
RIGHT: "Speed Dribbler makes player 1.3x more likely to be selected for pace-based 1v1s"
```

Once selected, all players use identical base success formulas based on:
- Player attributes (shooting, pace, tackling, etc.)
- Opponent attributes
- Fatigue
- Situation quality
- But NOT traits

**Actions:**
- [ ] Create trait definition database
- [ ] Implement trait selection system
- [ ] Implement trait success modifiers
- [ ] Implement trait quality modifiers
- [ ] Add trait stacking rules
- [ ] Create trait conflicts

---

### 5.2 Team Synergies

**File:** `server/traitsEngine.ts`

**Positive Synergies:**
```
2+ Playmakers:     +8% team play success
3+ Team Players:   +10% chemistry
1v1 Specialists:   +5% dribble attempts & success
```

**Negative Synergies:**
```
2+ Selfish:        -8% per extra (poor team play)
Playmaker + Selfish: -5% chemistry
3+ Defensive:      -10% attacking threat
```

**Implementation:**
```typescript
function analyzeTeamSynergies(players: Player[]): Record<string, number> {
  const traitCounts = this.countTraits(players);
  const synergies = {};
  
  if (traitCounts.playmaker >= 2) {
    synergies.playmakerSynergy = 0.08;
  }
  
  if (traitCounts.teamPlayer >= 3) {
    synergies.teamPlayerSynergy = 0.10;
  }
  
  if (traitCounts.selfish >= 2) {
    synergies.selfishConflict = -0.08 * (traitCounts.selfish - 1);
  }
  
  return synergies;
}

// Apply to match engine
private calculateTeamQualityWithSynergies(
  players: Player[],
  baseQuality: number
): number {
  const synergies = this.analyzeTeamSynergies(players);
  let modifier = 1.0;
  
  Object.values(synergies).forEach(value => {
    modifier += value;
  });
  
  return baseQuality * modifier;
}
```

**Actions:**
- [ ] Define synergy definitions
- [ ] Implement positive synergy detection
- [ ] Implement negative synergy detection
- [ ] Apply to match calculations
- [ ] Display synergies on team screen
- [ ] Recommend synergy improvements

---

### 5.3 Special Traits

**File:** `server/traitsEngine.ts`

**Goalkeeper Traits:**
```
isFlyGoalkeeper: Can come out as field player late game
  - Activation: 5% base, +15% losing, +20% down 2+
  - Threat: +25% team shots
  - Risk: +30% concede if caught out

rushesShotStopper: Aggressive closing
  - Weak shots: +10% save
  - Strong shots: -5% save
  - 1v1: +15% save

sweeper: Extra defender, excellent positioning
  - Distribution: +10% quality
  - Counter attacks: +15% frequency
```

**Mental Traits:**
```
nerveless: Performs under pressure
  - Late game (min 35-40): +15% quality
  - Penalties: +20%
  - Important matches: +10%

choker: Crumbles under pressure (opposite of nerveless)
  - Late game: -25%
  - Penalties: -30%
  - Important matches: -15%

leader: Boosts team
  - Team morale: +8%
  - Comebacks: +15%
  - Young players: +10%
```

**Actions:**
- [ ] Implement goalkeeper fly GK logic
- [ ] Implement nerveless/choker pressure systems
- [ ] Implement leader team boost
- [ ] Add pressure situations to engine
- [ ] Calculate important match status
- [ ] Track clutch moments

---

## Phase 6: WebSocket & Real-Time Communication (Weeks 6-7)

### 6.1 WebSocket Setup

**File:** `server/index.ts` + `server/matchSimulator.ts`

**Library:** Socket.IO recommended

```typescript
// Server setup
import { createServer } from 'http';
import { Server } from 'socket.io';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: 'localhost:5173' }
});

io.on('connection', (socket) => {
  socket.on('join-match', (matchId) => {
    socket.join(`match-${matchId}`);
  });
  
  socket.on('match:pause', (matchId) => {
    io.to(`match-${matchId}`).emit('match:paused');
  });
  
  socket.on('disconnect', () => {
    // Cleanup
  });
});
```

**Actions:**
- [ ] Install Socket.IO on server
- [ ] Create WebSocket connection handler
- [ ] Implement match room management
- [ ] Create event broadcast system
- [ ] Handle disconnections gracefully
- [ ] Implement rate limiting

---

### 6.2 Match Update Stream

**File:** `server/matchSimulator.ts`

**Update Model:** Every tick calculation is immediately broadcast (1:1 relationship)

**Critical Design Principle:** 
- Calculate tick → Immediately broadcast → Wait for next tick interval
- No batching, no queuing, no delays between calculation and broadcast
- User sees match state synchronously with server calculation

```typescript
interface MatchUpdate {
  minute: number;
  second: number;
  score: { home: number; away: number };
  events: MatchEvent[];
  statistics: MatchStatistics;
  momentum: { value: number; trend: string };
  commentary?: string;
  lineups: { home: OnCourtPlayer[]; away: OnCourtPlayer[] };
}

// WebSocket Message Format (JSON)
interface MatchUpdateMessage {
  type: 'match:update';
  matchId: number;
  timestamp: number;
  data: MatchUpdate;
}

async function broadcastMatchUpdate(matchId: number, update: MatchUpdate): Promise<void> {
  const io = getIOInstance();
  const message: MatchUpdateMessage = {
    type: 'match:update',
    matchId,
    timestamp: Date.now(),
    data: update
  };
  io.to(`match-${matchId}`).emit('match:update', message);
}

// Called every tick - Calculate then immediately broadcast
async function simulateMatchTick(state: LiveMatchState): Promise<void> {
  // 1. Calculate new state (possession, events, fatigue, momentum)
  const events = generateEventsForTick(state);
  updateStatistics(state, events);
  updateMomentum(state, events);
  updatePlayerFatigue(state);
  
  // 2. IMMEDIATELY broadcast (no delay, no batching)
  const update: MatchUpdate = {
    minute: state.currentMinute,
    second: Math.floor(state.currentInterval / 4 * 15),
    score: state.score,
    events: events,
    statistics: state.statistics,
    momentum: state.momentum,
    commentary: generateCommentary(events),
    lineups: { home: state.homeLineup, away: state.awayLineup }
  };
  
  await broadcastMatchUpdate(state.matchId, update);
  
  // 3. Wait for next tick interval (controlled by speed setting)
  // This happens in the main simulation loop
}

// Main simulation loop
async function runMatchSimulation(matchId: number, speed: 1 | 2 | 4): Promise<void> {
  const state = initializeMatch(matchId);
  const tickInterval = calculateTickInterval(speed); // 3.75s, 1.875s, or 0.9375s
  
  for (let tick = 0; tick < 160; tick++) {
    // Calculate and broadcast immediately
    await simulateMatchTick(state);
    
    // Wait for next tick
    await sleep(tickInterval);
  }
  
  // Match complete
  await finalizeMatch(state);
}

function calculateTickInterval(speed: 1 | 2 | 4): number {
  // 15-second intervals in real-time based on speed
  const baseInterval = 15000; // 15 seconds simulated
  const realTimeRatio = {
    1: 0.25,   // 1x speed: 15s sim = 3.75s real
    2: 0.125,  // 2x speed: 15s sim = 1.875s real
    4: 0.0625  // 4x speed: 15s sim = 0.9375s real
  };
  
  return baseInterval * realTimeRatio[speed];
}
```

**Actions:**
- [ ] Implement update generation
- [ ] Implement broadcast system (1:1 tick-to-broadcast)
- [ ] Implement speed control (1x, 2x, 4x adjusts tick interval)
- [ ] Implement pause/resume (stops tick timer)
- [ ] Implement match skip (runs all 160 ticks instantly)
- [ ] Test that every tick is immediately visible to user

---

### 6.3 User Actions via WebSocket

**File:** `server/matchSimulator.ts`

**User Actions:**
```
- Substitution: socket.emit('match:substitute', { out, in })
- Formation change: socket.emit('match:change-formation', { formation })
- Tactics change: socket.emit('match:change-tactics', { mentality, pressing, width })
- Match control: socket.emit('match:pause/resume/speed', { speed })
```

**Implementation:**
```typescript
socket.on('match:substitute', async (data) => {
  const { matchId, playerOut, playerIn } = data;
  const state = getMatchState(matchId);
  
  // Validate substitution
  if (state.substitutionsUsed >= 5) {
    socket.emit('error', 'No substitutions remaining');
    return;
  }
  
  // Make substitution
  const idx = state.homeLineup.findIndex(p => p.id === playerOut);
  state.homeLineup[idx] = state.homeBench.find(p => p.id === playerIn);
  
  // Update momentum & broadcast
  state.momentum.value += 5; // Fresh player boost
  broadcastMatchUpdate(matchId, state);
});

socket.on('match:change-formation', async (data) => {
  const { matchId, formation } = data;
  const state = getMatchState(matchId);
  
  state.homeTeam.formation = formation;
  state.defensiveResistance = calculateDefensiveResistance(state);
  
  broadcastMatchUpdate(matchId, state);
});
```

**Actions:**
- [ ] Implement substitution handler
- [ ] Implement formation change handler
- [ ] Implement tactics change handler
- [ ] Implement speed control handler
- [ ] Implement pause/resume handler
- [ ] Add validation for each action

---

## Error Handling & Edge Cases

### User Action Validation

**Invalid Substitution:**
```typescript
function validateSubstitution(
  matchId: number,
  playerOutId: number,
  playerInId: number,
  team: 'home' | 'away'
): { valid: boolean; error?: string } {
  
  const state = getMatchState(matchId);
  const lineup = team === 'home' ? state.homeLineup : state.awayLineup;
  const bench = team === 'home' ? state.homeBench : state.awayBench;
  
  // Check player out is on court
  if (!lineup.find(p => p.player.id === playerOutId)) {
    return { valid: false, error: 'Player not currently on court' };
  }
  
  // Check player in is on bench
  if (!bench.find(p => p.player.id === playerInId)) {
    return { valid: false, error: 'Player not available on bench' };
  }
  
  // Check position compatibility
  const playerOut = lineup.find(p => p.player.id === playerOutId);
  const playerIn = bench.find(p => p.player.id === playerInId);
  
  if (playerOut.player.position === 'GK' && playerIn.player.position !== 'GK') {
    return { valid: false, error: 'Cannot substitute goalkeeper with field player' };
  }
  
  return { valid: true };
}
```

**Invalid Formation/Tactics:**
```typescript
function validateFormationChange(formation: string): { valid: boolean; error?: string } {
  const validFormations = ['4-0', '3-1', '2-2', '1-3', '1-2-1'];
  if (!validFormations.includes(formation)) {
    return { valid: false, error: 'Invalid formation' };
  }
  return { valid: true };
}

function validateTacticsChange(tactics: TacticalSetup): { valid: boolean; error?: string } {
  const validMentality = ['VeryDefensive', 'Defensive', 'Balanced', 'Attacking', 'VeryAttacking'];
  const validPressing = ['Low', 'Medium', 'High', 'VeryHigh'];
  const validWidth = ['Narrow', 'Balanced', 'Wide'];
  
  if (!validMentality.includes(tactics.mentality)) return { valid: false, error: 'Invalid mentality' };
  if (!validPressing.includes(tactics.pressingIntensity)) return { valid: false, error: 'Invalid pressing' };
  if (!validWidth.includes(tactics.width)) return { valid: false, error: 'Invalid width' };
  
  return { valid: true };
}
```

### WebSocket Disconnect Handling

```typescript
// Server: Queue updates for disconnected clients
class MatchBroadcaster {
  private updateQueues = new Map<string, MatchUpdate[]>();
  
  async handleReconnect(socket: Socket, matchId: number): Promise<void> {
    const queued = this.updateQueues.get(socket.id) || [];
    
    if (queued.length > 0) {
      socket.emit('match:catchup', {
        updates: queued,
        currentState: getMatchState(matchId)
      });
      this.updateQueues.delete(socket.id);
    } else {
      socket.emit('match:state', getMatchState(matchId));
    }
  }
}

// Client: Reconnect and catch up
socket.on('connect', () => {
  socket.emit('join-match', currentMatchId);
});

socket.on('match:catchup', (data) => {
  data.updates.forEach(update => applyMatchUpdate(update));
});
```

### Critical Test Scenarios

```markdown
1. **Red Card at Minute 10**: Team plays 4v5 for 30 minutes, -30% offensive strength
2. **5-Goal Lead**: Momentum effect capped at ±15%, losing team can still score
3. **0% Energy Player**: Attributes degrade to 50%, auto-sub if bench available
4. **2+ Selfish Players**: Team play frequency drops, assist rate decreases
5. **Goalkeeper Fly Out**: GK becomes field player, +1 attacker temporarily, high risk
6. **Disconnect Mid-Goal**: Client receives goal event upon reconnect via queue
7. **Formation Change Invalid**: System rejects with error message
8. **Simultaneous Goal + Red Card**: Goal processes first (priority system), then card
9. **Match State Corruption**: Validation detects issues, auto-recovers score from events
10. **40-Minute Completion**: Match ends at interval 159, generates post-match report
11. **Multiple Nerveless Players**: Each gets +15% clutch boost independently
12. **Team Player Synergy**: 3+ team players boost chemistry by 10% total
13. **Trait Selection Edge Case**: All players with same trait = weights normalized correctly
14. **WebSocket Flood**: Rate limiting prevents state corruption from rapid actions
15. **Match State Validation**: Run every 20 ticks, auto-fix score/energy/momentum if corrupted
```

---

## Phase 7: Post-Match Analytics & UI (Weeks 7-8)

### 7.1 Post-Match Report Generation

**File:** `server/matchEngine.ts`

**Report Data:**
```
- Final score & goal scorers
- Match statistics (possession, shots, passes, etc.)
- Player ratings & performance
- Team chemistry impact
- Key moments & turning points
- Player of the match
- Squad morale changes
```

**Implementation:**
```typescript
async function generatePostMatchReport(matchId: number): Promise<PostMatchReport> {
  const state = getMatchState(matchId);
  
  return {
    finalScore: { home: state.score.home, away: state.score.away },
    goalScorers: state.events.filter(e => e.type === 'goal'),
    statistics: state.statistics,
    playerRatings: calculatePlayerRatings(state),
    teamStats: calculateTeamStats(state),
    manOfTheMatch: findManOfTheMatch(state),
    keyMoments: extractKeyMoments(state.events),
    squadMoraleChanges: calculateMoraleChanges(state),
    season Impact: updateStandings(matchId)
  };
}
```

**Actions:**
- [ ] Implement player rating calculation
- [ ] Implement team statistics calculation
- [ ] Implement key moment detection
- [ ] Implement morale change calculation
- [ ] Implement standings update
- [ ] Create post-match event save

---

### 7.2 UI Components

**File:** `client/src/components/MatchExperience.tsx` (NEW)

**Components to Create:**
1. **Pre-Match Screen:**
   - Opponent intelligence display
   - Lineup selection
   - Formation selector
   - Tactics panel

2. **Live Match Screen:**
   - Live scoreboard
   - Event feed/commentary
   - Momentum meter
   - Player energy display
   - Live statistics
   - Tactical adjustment panel
   - Substitution interface
   - Speed/pause controls

3. **Post-Match Screen:**
   - Final result display
   - Match statistics tabs
   - Player ratings
   - Man of the match
   - Key moments
   - Season impact

**Actions:**
- [ ] Create pre-match component
- [ ] Create live match component
- [ ] Create post-match component
- [ ] Implement WebSocket integration
- [ ] Implement UI event handlers
- [ ] Add animations and transitions

---

## Data Flow & Integration

### Complete Match Simulation Flow

```
1. USER SELECTS MATCH
   ↓
2. LOAD MATCH DATA (teams, players, tactics)
   ↓
3. INITIALIZE MATCH STATE
   ├─ Calculate team ratings
   ├─ Calculate expected goals
   ├─ Initialize lineups & energy
   ├─ Set initial momentum (50)
   └─ Create live match state
   ↓
4. START REAL-TIME SIMULATION
   ├─ Every 200ms (server)
   ├─ Simulate minute tick
   ├─ Generate events
   ├─ Update state
   ├─ Calculate fatigue
   ├─ Check substitutions
   └─ Broadcast update via WebSocket
   ↓
5. USER INTERACTIONS (Real-time)
   ├─ Substitution request → Process → Update state
   ├─ Formation change → Recalculate defense → Update
   ├─ Tactics change → Apply modifiers → Update
   └─ Pause/Resume/Speed → Adjust tick rate
   ↓
6. MATCH COMPLETES (Min 40)
   ├─ Finalize all events
   ├─ Calculate final statistics
   ├─ Calculate player ratings
   ├─ Generate post-match report
   ├─ Update database
   ├─ Update season standings
   └─ Save match to history
   ↓
7. DISPLAY POST-MATCH REPORT
   ├─ Final score & scorers
   ├─ Statistics breakdown
   ├─ Player ratings
   ├─ Key moments
   └─ Season standings update
```

### Database Integration Points

```
Initial Load:
- Load Team (formation, tactics)
- Load Players (attributes, traits, current condition)
- Load Match (date, opponent, competition)

During Match:
- Log all events (database transaction)
- Track player actions for rating

After Match:
- Save final score & events
- Save match statistics
- Save player ratings
- Update player condition/morale
- Update team standing
- Generate match report
```

---

## Testing & Validation Strategy

### Unit Tests

```typescript
// Match engine calculations
describe('MatchEngine', () => {
  test('calculates expected goals correctly', () => {
    const [homeXG, awayXG] = engine.calculateExpectedGoals(80, 70);
    expect(homeXG).toBeCloseTo(2.89, 1);
    expect(awayXG).toBeCloseTo(2.27, 1);
  });
  
  test('applies timing multipliers', () => {
    const mult39 = engine.getTimingMultiplier(39);
    expect(mult39).toBeCloseTo(2.16, 2);
  });
  
  test('calculates fatigue correctly', () => {
    player.energy = 0;
    const effective = engine.getEffectiveAttribute(player, 18);
    expect(effective).toBeCloseTo(9, 0); // 50% degradation
  });
});

// Trait system
describe('TraitEngine', () => {
  test('applies trait modifiers', () => {
    const player = {
      traits: ['attempts1v1'],
      attributes: { dribbling: 14 }
    };
    
    const frequency = engine.getEventFrequency(player, '1v1');
    expect(frequency).toBe(2.0); // 2x multiplier
  });
});
```

### Integration Tests

```typescript
// Full match simulation
describe('Full Match Simulation', () => {
  test('simulates 40-minute match', async () => {
    const match = await engine.simulateMatch(saveGameId, userId, matchId);
    
    expect(match.played).toBe(true);
    expect(match.homeScore + match.awayScore).toBeGreaterThan(0);
    expect(match.events.length).toBeGreaterThan(0);
    expect(match.homeStats).toBeDefined();
  });
  
  test('matches UEFA statistical baselines', async () => {
    const matches = await runSimulation(1000); // 1000 matches
    const avgGoals = matches.reduce((sum, m) => sum + m.homeScore + m.awayScore, 0) / 1000;
    
    expect(avgGoals).toBeCloseTo(5.16, 1); // Within tolerance
  });
});
```

### Validation Criteria

```
Statistical:
- Average goals per match: 5.16 ± 0.5
- Shots per team: 28.55 ± 2.0
- Shot accuracy: 46.4% ± 5%
- Second-half goals: 56.8% ± 5%
- Position distribution: Forward 64.5%, Defender 32%, GK 3.5%

Tactical:
- Defensive tactics reduce shots: 15-30% reduction
- Attacking tactics increase shots: 15-30% increase
- Fatigue impact: 20-30% attribute reduction at 0% energy
- Traits visible: 5-25% change in relevant situations

Balance:
- Elite vs Average: 2.5x multiplier (±0.5)
- No single trait breaks balance: ±50% max total modifier
- Synergies reward teambuilding: ±8-15% bonus
```

---

## Success Metrics

### User Engagement
- [ ] 80%+ of matches watched (not simmed)
- [ ] Average watch time: 3+ minutes per match
- [ ] 40%+ users make tactical changes during match
- [ ] 60%+ users view full post-match report

### Technical Performance
- [ ] Pre-match load: < 1 second
- [ ] Match simulation tick calculation: < 100ms per tick
- [ ] Tick-to-broadcast latency: < 10ms (immediate)
- [ ] UI render: 60 FPS throughout
- [ ] WebSocket latency: < 50ms client reception
- [ ] Total tick cycle: < 200ms (calculation + broadcast + client render)

### Design Goals
- [ ] Attributes impact visible (±50% variance)
- [ ] Traits create unique playstyles (5-25% changes)
- [ ] Tactics matter (±30% changes)
- [ ] Match feels dramatic & engaging
- [ ] Player connection builds (ratings, moments)

---

## Known Constraints & Trade-offs

### Performance
- Server simulates all calculations (security)
- Broadcasting updates every tick (1:1 relationship)
- Each tick must calculate + broadcast in < 200ms total
- Can run multiple matches simultaneously
- Memory: ~5MB per live match state
- Network: ~1-2KB per update × 160 ticks = ~160-320KB per match

### Player Agency vs Automation
- Real-time substitutions allowed
- Tactical changes mid-match possible
- Auto-substitution optional (configurable)
- No "instant win" mechanics

### Realism vs Fun
- Slightly increased late-game goals for drama
- Momentum exaggerates team dominance for narrative
- Traits allow for surprise moments
- Balanced against pure randomness

---

## Implementation Checklist

### Phase 1: Foundation
- [ ] Enhanced data models created
- [ ] Core match engine refactored
- [ ] Shot & goal system implemented
- [ ] Timing multipliers applied
- [ ] Basic testing framework set up
- **Estimated:** 2 weeks

### Phase 2: Defensive System
- [ ] Defensive resistance calculated
- [ ] Fouls & discipline system
- [ ] Event variety system
- [ ] Integration testing
- **Estimated:** 2 weeks

### Phase 3: Tactical System
- [ ] Tactical modifiers system
- [ ] Formation impact
- [ ] Man-marking system
- [ ] Tactical validation
- **Estimated:** 2 weeks

### Phase 4: Match State
- [ ] Momentum system
- [ ] Player fatigue tracking
- [ ] Substitution system
- [ ] State validation
- **Estimated:** 2 weeks

### Phase 5: Traits & Chemistry
- [ ] Trait system core
- [ ] Team synergies
- [ ] Special traits
- [ ] Trait testing
- **Estimated:** 1-2 weeks

### Phase 6: Real-Time
- [ ] WebSocket setup
- [ ] Update streaming
- [ ] User action handlers
- [ ] Latency testing
- **Estimated:** 1 week

### Phase 7: UI & Analytics
- [ ] Pre-match UI component
- [ ] Live match UI component
- [ ] Post-match UI component
- [ ] Integration with WebSocket
- [ ] User acceptance testing
- **Estimated:** 1 week

### Phase 8: Polish & Balance
- [ ] Statistical validation (1000+ matches)
- [ ] Balance adjustments
- [ ] Performance optimization
- [ ] Edge case handling
- [ ] Final testing
- **Estimated:** Ongoing (1-2 weeks)

---

## Deliverables by Phase

### Phase 1
- Enhanced match engine with attribute integration
- Shot quality & conversion system
- Timing multipliers applied
- Basic match simulation working

### Phase 2
- Defensive resistance system
- Fouls & discipline
- Event variety
- All match events generated

### Phase 3
- Tactical system with mentality/pressing/width modifiers
- Formation-specific impacts
- Man-marking system
- Tactical validation

### Phase 4
- Momentum system (0-100 scale)
- Player fatigue tracking (0-100 energy)
- Auto-substitution system
- Match flow feels dynamic

### Phase 5
- Trait system (20+ traits)
- Team synergies calculated
- Special trait mechanics
- Playstyle differentiation visible

### Phase 6
- WebSocket server running
- Real-time update stream
- User action handlers working
- Pause/resume/speed control

### Phase 7
- Pre-match screen UI
- Live match screen UI
- Post-match report UI
- Full end-to-end integration

### Phase 8
- Statistical validation complete
- Balance adjustments applied
- Performance optimized
- Ready for production

---

## FAQ for Agent Implementation

### Q1: How should player ratings be calculated?
**A:** Post-match ratings consider:
- Goals/assists (major boost: +1 point each)
- Passing accuracy (±0.5% per point)
- Defensive actions (tackles, interceptions: +0.3 each)
- Mistakes leading to goals (-2 points)
- Work rate & positioning (+0.2 per minute)
- Rating range: 1.0-10.0 scale

**Implementation:**
```typescript
function calculatePlayerRating(player: OnCourtPlayer, matchResult: 'win' | 'draw' | 'loss'): number {
  let rating = 6.0; // Base rating
  
  // Goals and assists (major impact)
  rating += player.performance.goals * 1.5;
  rating += player.performance.assists * 1.0;
  
  // Shots (contribution to attack)
  rating += Math.min(player.performance.shots * 0.2, 1.0); // Max +1.0
  rating += player.performance.shotsOnTarget * 0.3;
  
  // Passing (accuracy matters)
  if (player.performance.passes > 0) {
    const passAccuracy = player.performance.successfulPasses / player.performance.passes;
    rating += (passAccuracy - 0.7) * 2.0; // ±0.6 based on accuracy (70% baseline)
  }
  
  // Defensive contributions
  rating += player.performance.tackles * 0.3;
  rating += player.performance.interceptions * 0.3;
  rating += player.performance.blocks * 0.2;
  
  // Negative factors
  rating -= player.performance.fouls * 0.2;
  rating -= player.performance.turnovers * 0.15;
  rating -= player.performance.mistakesLeadingToGoal * 2.0;
  
  // Cards
  if (player.performance.yellowCard) rating -= 0.3;
  if (player.performance.redCard) rating -= 2.0;
  
  // Match result bonus/penalty
  if (matchResult === 'win') rating += 0.5;
  if (matchResult === 'loss') rating -= 0.3;
  
  // Time played factor (partial game = harder to get high rating)
  const minutesPlayed = player.performance.minutesPlayed;
  if (minutesPlayed < 20) {
    rating *= (minutesPlayed / 20); // Scale down if < 20 minutes
  }
  
  // Goalkeeper specific
  if (player.player.position === 'GK') {
    rating = 6.0; // Reset base for GK
    rating += player.performance.saves * 0.4;
    rating -= player.performance.goalsConceded * 0.5;
    if (player.performance.goalsConceded === 0 && minutesPlayed >= 30) {
      rating += 1.0; // Clean sheet bonus
    }
    rating += (player.performance.successfulDistributions / player.performance.distributions) * 1.0;
  }
  
  // Clamp to 1.0-10.0 range
  return Math.max(1.0, Math.min(10.0, rating));
}
```

### Q2: How does formations affect match outcomes?
**A:** Formations provide:
- **4-0:** +30% defensive resistance, -30% attacking
- **3-1:** +15% defensive, -15% attacking
- **2-2:** Balanced (no modifier)
- **1-3:** -15% defensive, +15% attacking
- **1-2-1:** Flexible (tactical bonuses +5%)

### Q3: What's the difference between attributes and traits?
**A:** 
- **Attributes:** How good a player is (1-20 scale, shooting, passing, etc.)
- **Traits:** How they play (event selection, success modifiers, playstyle)
- Both together: High attribute + matching trait = elite in that area

### Q4: Can users break the match engine with extreme tactics?
**A:** No, modifiers are capped:
- Total tactical modifier: ±30% max
- Total trait modifier: ±50% max
- Combined max: ±80% change in any metric
- Game remains balanced even with extreme choices

### Q5: How is home advantage handled?
**A:** Minimal (2-3%) because tournament format skews data. Focus on:
- Team quality (not venue)
- Morale/form (not location)
- Crowd doesn't provide statistical advantage

### Q6: What happens if a player gets a red card?
**A:** 
- Immediate: One fewer player on court (4 vs 5)
- Match impact: -30% team offensive strength
- Consequences: Tactical adjustment needed
- No way to bring in replacement

### Q7: How does momentum decay work?
**A:** 
- Naturally returns toward 50 (neutral) at 1.5 points/minute
- Score differential affects it (+1 per goal ahead)
- Fatigue shifts it (tired team loses momentum)
- Events apply instant changes (goals: ±25 points)
- Prevents runaway dominance

### Q8: Should I run validation tests frequently?
**A:** Yes, after each phase:
- Run 100-200 simulated matches
- Compare to UEFA baselines
- Adjust parameters if off by > 15%
- Document all changes
- Test edge cases (elite vs average, close games, etc.)

### Q9: How do I handle disconnections mid-match?
**A:** 
- Server continues simulation
- Client reconnects via match ID
- Server catches client up with last state + events
- No data loss
- Match completes normally

### Q10: What's the minimum viable version?
**A:** Core features for MVP:
1. Real-time match simulation (server-side)
2. Basic shot & goal system
3. Live score & event feed
4. Player fatigue
5. Basic tactics (mentality)
6. User substitutions
7. Post-match stats

Advanced features for v1.1:
- Full traits system
- Complex team synergies
- Advanced analytics
- Match highlights
- replay system

---

## Additional Resources

### Reference Documents
- `MATCH_ENGINE_ALGORITHM.md` - Detailed algorithm design
- `PLAYER_TRAITS_SYSTEM.md` - Trait system deep dive
- `vision.md` - UX/flow design (pre-/live-/post-match)
- `match-experience-mockup.html` - UI mockup (HTML)

### Data Files
- `game-engine-config.json` - Generated config parameters
- `comprehensive-analysis.json` - Statistical breakdown
- `goal-timing-data.json` - Minute-by-minute goal probabilities

### Existing Codebase
- `server/matchEngine.ts` - Current engine (to enhance)
- `shared/schema.ts` - Data models (to extend)
- `client/src/pages/...` - Existing pages (to integrate)

---

## Support & Questions

This implementation plan provides:
✅ Complete technical specifications  
✅ Data structures & interfaces  
✅ Algorithm pseudocode  
✅ Integration points  
✅ Testing strategy  
✅ Success metrics  

For clarifications during implementation:
1. Refer to referenced algorithm documents
2. Check data model definitions
3. Review pseudocode examples
4. Validate against statistical baselines
5. Test in isolation, then integrate

---

**Status:** Ready for implementation 🚀  
**Next Step:** Begin Phase 1 with enhanced data models and core engine refactoring

