# Match Engine Algorithm - Design & Implementation

## Status: Design Phase ✅ | Implementation: Pending 🔲

**Last Updated:** November 7, 2025  
**Data Foundation:** 152 UEFA Futsal Champions League matches (2023/24 & 2024/25)

---

## Table of Contents
1. [Overview](#overview)
2. [Data Foundation](#data-foundation)
3. [Core Algorithm Structure](#core-algorithm-structure)
4. [Chance Creation System](#chance-creation-system)
5. [Defensive System](#defensive-system)
6. [Shot Quality & Conversion](#shot-quality--conversion)
7. [Player Attribute Mapping](#player-attribute-mapping)
8. [Tactical Influence](#tactical-influence)
9. [Match State & Momentum](#match-state--momentum)
10. [Implementation Roadmap](#implementation-roadmap)

---

## Overview

### Design Philosophy
The match engine balances **statistical realism** (based on UEFA data) with **user agency** (meaningful tactical and team-building decisions). Players' attributes and traits determine event probabilities, while tactics modify timing and approach.

### Core Equation
```typescript
Event Outcome = 
  UEFA_Baseline_Probability 
  × Player_Attributes_Modifier (±50%)
  × Tactical_Modifier (±30%)
  × Player_Traits_Modifier (±20%)
  × Match_State_Modifier (±20%)
  × Defensive_Resistance
  × RNG_Roll
```

---

## Data Foundation

### UEFA Statistical Baselines (Close Matches)
Based on analysis of **77 close matches** (0-2 goal differential) from 152 total matches:

```json
{
  "avgGoalsPerMatch": 5.16,
  "avgShotsPerTeam": 28.55,
  "avgShotsOnTargetPerTeam": 12.93,
  "avgFoulsPerTeam": 6.70,
  "avgYellowCardsPerTeam": 1.91,
  "avgCornersPerTeam": 7.82,
  "shotAccuracy": 0.464,
  "shotOnTargetToGoal": 0.199,
  "foulToYellowCard": 0.285
}
```

### Timing Multipliers
Goals are not evenly distributed. Key findings:
- **Early Game (0-10 min):** 0.88x multiplier (below average)
- **Mid Game (10-30 min):** 0.98x multiplier (near average)
- **Late Game (30-40 min):** 1.15x multiplier (above average)
- **Minute 39:** 2.16x multiplier (highest danger!)
- **Minute 38:** 1.69x multiplier
- **Second Half:** 56.8% of goals (vs 43.2% first half)

### Position-Based Scoring
```json
{
  "forward": 0.646,    // 64.5% of goals (Pivot + attacking Alas)
  "defender": 0.320,   // 31.9% of goals (Fixo + defensive Alas)
  "goalkeeper": 0.034  // 3.4% of goals (fly goalkeeper tactic)
}
```

**Important Context:**
- UEFA positions are broad categories (Forward/Defender/GK)
- Futsal has fluid positions: Alas can attack or defend
- Don't over-specify position probabilities
- Use tactical role modifiers instead (±10%)

### Home Advantage: MINIMAL
⚠️ **Warning:** UEFA data shows 45.4% away wins due to tournament format (1 host, 3 away teams). Stronger teams often play away.

**Recommendation:** Apply only **2-3% crowd boost** for home team, focus on **team quality ratings** instead.

---

## Core Algorithm Structure

### Match Simulation Loop
```typescript
interface MatchSimulation {
  // Pre-match setup
  initialize(): void {
    // 1. Calculate expected goals for each team
    // 2. Assign man-marking matchups
    // 3. Set initial momentum & energy
  }
  
  // Minute-by-minute simulation
  simulateMatch(): MatchResult {
    for (let minute = 0; minute <= 40; minute++) {
      const events = simulateMinute(minute);
      updateMatchState(events);
      applyFatigue(minute);
    }
    return finalResult;
  }
  
  // Single minute simulation
  simulateMinute(minute: number): MatchEvent[] {
    // 1. Determine possession (tactics, momentum)
    // 2. Apply timing multipliers
    // 3. Roll for event creation (shots, fouls)
    // 4. Process events with defensive resistance
    // 5. Update momentum based on outcomes
  }
}
```

### Expected Goals Calculation
```typescript
function calculateExpectedGoals(
  teamRating: number,
  opponentRating: number,
  baseGoalsPerTeam: number = 2.58 // Half of 5.16
): number {
  // Quality difference impact: 10 rating points = 10% change
  const ratingDiff = teamRating - opponentRating;
  const qualityMultiplier = 1 + (ratingDiff * 0.01);
  
  // Clamp at ±50% to prevent unrealistic scores
  const clampedMultiplier = Math.max(0.5, Math.min(1.5, qualityMultiplier));
  
  // Apply minimal home advantage (2%)
  const venueMultiplier = isHome ? 1.02 : 1.00;
  
  return baseGoalsPerTeam * clampedMultiplier * venueMultiplier;
}

// Example:
// Team A (80 rating) vs Team B (70 rating)
// Expected goals A: 2.58 * 1.10 * 1.02 = 2.89 goals
// Expected goals B: 2.58 * 0.90 * 1.00 = 2.32 goals
// Total: 5.21 goals ✅ (close to 5.16 baseline)
```

---

## Chance Creation System

### Five Paths to Creating a Shot

```typescript
enum ShotCreationType {
  ONE_VS_ONE,       // 35% - Dribble past marker
  TEAM_PLAY,        // 40% - Passing, movement, build-up
  SET_PIECE,        // 10% - Corner, free kick
  COUNTER_ATTACK,   // 10% - Fast break after turnover
  GOALKEEPER_PLAY   // 5%  - Fly goalkeeper joining attack
}
```

### Shot Creation Type Selection
Weighted by tactics, player traits, and match state:

```typescript
function determineShotCreationType(
  attackTactics: Tactics,
  defenseTactics: Tactics,
  playerTraits: TraitModifiers,
  state: MatchState
): ShotCreationType {
  
  // Base weights
  let weights = {
    ONE_VS_ONE: 0.35,
    TEAM_PLAY: 0.40,
    SET_PIECE: 0.10,
    COUNTER_ATTACK: 0.10,
    GOALKEEPER_PLAY: 0.05
  };
  
  // TACTICAL MODIFIERS
  
  // Attacking mentality = more 1v1 attempts
  if (attackTactics.mentality >= Mentality.ATTACKING) {
    weights.ONE_VS_ONE += 0.15;
    weights.TEAM_PLAY -= 0.10;
  }
  
  // High defensive pressing = more turnovers = more counters
  if (defenseTactics.pressingIntensity >= PressingIntensity.HIGH) {
    weights.COUNTER_ATTACK += 0.10;
    weights.TEAM_PLAY -= 0.10;
  }
  
  // Narrow defensive width = easier to find 1v1 on wings
  if (defenseTactics.width === 'NARROW') {
    weights.ONE_VS_ONE += 0.10;
  }
  
  // PLAYER TRAIT MODIFIERS
  
  // Team with multiple "attempts1v1" trait players
  if (playerTraits.attempts1v1Count > 2) {
    weights.ONE_VS_ONE += 0.15;
    weights.TEAM_PLAY -= 0.10;
  }
  
  // Team with playmakers
  if (playerTraits.playmakerCount > 1) {
    weights.TEAM_PLAY += 0.15;
    weights.ONE_VS_ONE -= 0.10;
  }
  
  // MATCH STATE MODIFIERS
  
  // Losing late = desperation
  if (state.minute > 35 && state.isLosing) {
    weights.ONE_VS_ONE += 0.10;
    weights.GOALKEEPER_PLAY += 0.15; // Fly GK more likely
  }
  
  return weightedRandomChoice(weights);
}
```

### 1. One-vs-One (Dribbling)

**When Selected:** Attacking tactics, players with "attempts1v1" trait, narrow defensive width

**Process:**
```typescript
function attemptOneVsOne(
  attackingTeam: Team,
  defendingTeam: Team,
  matchups: Map<DefenderId, AttackerId>
): OneVsOneResult {
  
  // 1. Select attacker (weighted by dribbling + trait preference)
  const attacker = selectAttackerFor1v1(attackingTeam);
  
  // 2. Find assigned marker
  const marker = findMarker(attacker.id, matchups, defendingTeam);
  
  // 3. Calculate success probability
  const successProb = calculate1v1Success(attacker, marker);
  
  // 4. Roll for outcome
  if (Math.random() < successProb) {
    // Beat defender → high quality shot (0.7-1.0)
    return { success: true, shotQuality: 0.7 + traits/attributes };
  } else {
    // Defender wins → check for foul
    if (Math.random() < foulProbability(marker)) {
      return { success: false, foulsCommitted: true };
    }
    return { success: false, possessionLost: true };
  }
}
```

**Success Probability Formula:**
```typescript
function calculate1v1Success(attacker: Player, defender: Player): number {
  // Base: 50/50
  let prob = 0.50;
  
  // Dribbling vs Tackling (±20% for 10-point diff)
  prob += (attacker.dribbling - defender.tackling) * 0.02;
  
  // Pace differential (±15% for 10-point diff)
  prob += (attacker.pace - defender.pace) * 0.015;
  
  // Defender positioning reduces success (-10% max)
  prob -= (defender.positioning / 20) * 0.10;
  
  // TRAIT MODIFIERS
  if (attacker.traits.attempts1v1) prob += 0.05;
  if (attacker.traits.speedDribbler && attacker.pace > defender.pace) prob += 0.08;
  if (defender.traits.tightMarking) prob -= 0.06;
  if (defender.traits.anticipates) prob -= 0.07;
  
  // Fatigue (late game)
  if (minute > 30) {
    prob += (attacker.stamina - defender.stamina) * 0.005;
  }
  
  return Math.max(0.1, Math.min(0.9, prob));
}
```

### 2. Team Play (Build-Up)

**When Selected:** Balanced tactics, playmakers, team-oriented players

**Process:**
```typescript
function attemptTeamPlay(
  attackingTeam: Team,
  defendingTeam: Team,
  defenseTactics: Tactics
): ShotAttempt | null {
  
  // 1. Calculate attacking quality
  const attackQuality = calculateAttackBuildUp(attackingTeam);
  
  // 2. Calculate defensive resistance
  const defenseQuality = calculateDefenseResistance(defendingTeam, defenseTactics);
  
  // 3. Check for special plays (1-2 passes, playmaker through ball)
  if (hasOneTwoPlayers(attackingTeam) && Math.random() < 0.3) {
    return attempt1_2Pass(attackingTeam);
  }
  
  // 4. Standard build-up
  const successProb = 0.6 * (attackQuality / defenseQuality);
  
  if (Math.random() < successProb) {
    const shotQuality = Math.max(0.3, Math.min(0.9, attackQuality / defenseQuality));
    return {
      shooter: selectShooter(attackingTeam),
      quality: shotQuality,
      defendersBeaten: calculateDefendersBeaten(successProb)
    };
  }
  
  return null; // Defense held firm
}
```

**Attack Quality:**
```typescript
function calculateAttackBuildUp(team: Team): number {
  const avgPassing = team.averageAttribute('passing');
  const avgCreativity = team.averageAttribute('creativity');
  const avgPositioning = team.averageAttribute('positioning');
  const avgDribbling = team.averageAttribute('dribbling');
  
  let quality = (avgPassing + avgCreativity + avgPositioning + avgDribbling) / 4;
  
  // TRAIT BONUSES
  const playmakerBonus = team.playmakerCount * 0.05; // +5% per playmaker
  const teamPlayerBonus = team.teamPlayerCount >= 3 ? 0.10 : 0;
  
  return quality * (1 + playmakerBonus + teamPlayerBonus);
}
```

### 3. Counter-Attack

**When Selected:** High defensive pressing, fast players, winning possession in opponent's half

**Process:**
```typescript
function attemptCounterAttack(
  attackingTeam: Team,
  defendingTeam: Team
): ShotAttempt {
  
  // Exploit defensive disorganization
  const fastestAttacker = attackingTeam.fastestPlayer();
  const recoveringDefender = defendingTeam.fastestPlayer();
  
  const paceDiff = fastestAttacker.pace - recoveringDefender.pace;
  const catchUpProb = Math.max(0.1, 0.5 - paceDiff * 0.03);
  
  if (Math.random() > catchUpProb) {
    // Clean through on goal!
    return {
      shooter: fastestAttacker,
      quality: 0.9, // Very high quality
      isOneOnOne: true,
      defendersBeaten: 4
    };
  } else {
    // Defender caught up - still advantageous
    return {
      shooter: fastestAttacker,
      quality: 0.6,
      defendersBeaten: 2
    };
  }
}
```

### 4. Set Pieces

**When Selected:** Corners, free kicks awarded after fouls

**Conversion Rates:**
- Corners: ~3.5% base conversion (from analysis)
- Modified by tactical routine and player attributes
- Defensive organization matters (height, marking discipline)

### 5. Fly Goalkeeper

**When Selected:** Late game, losing, goalkeeper has "isFlyGoalkeeper" trait

**Activation Probability:**
```typescript
function shouldActivateFlyGoalkeeper(state: MatchState): boolean {
  if (!goalkeeper.traits.isFlyGoalkeeper) return false;
  
  let prob = 0.05; // Base 5%
  
  if (state.minute > 35) prob += 0.10;
  if (state.isLosing) prob += 0.15;
  if (state.scoreDiff <= -2) prob += 0.20;
  
  return Math.random() < prob;
}
```

---

## Defensive System

### Man-Marking Matchups

**Philosophy:** Futsal uses man-to-man marking. Users can assign specific matchups.

```typescript
interface MarkingInstructions {
  defaultSystem: 'MAN_TO_MAN' | 'ZONAL' | 'MIXED';
  manMarkingAssignments: Map<DefenderId, AttackerId>;
  autoMarkingStrategy: 'MIRROR_POSITION' | 'BEST_ON_BEST' | 'SPEED_MATCH';
}
```

**Auto-Assignment Strategies:**
1. **Mirror Position:** Fixo marks Pivot, Alas mark Alas
2. **Best on Best:** Highest-rated defender on highest-rated attacker
3. **Speed Match:** Fast defender on fast attacker (prevent counters)

### Defensive Impact on Shot Creation

Defenders influence the match in **4 ways:**

#### 1. Shot Prevention (30-60% of attempts)
```typescript
function calculateDefensiveResistance(
  defendingTeam: Team,
  tactics: Tactics,
  state: MatchState
): number {
  
  const avgTackling = defendingTeam.averageAttribute('tackling');
  const avgPositioning = defendingTeam.averageAttribute('positioning');
  const avgMarking = defendingTeam.averageAttribute('marking');
  const avgWorkRate = defendingTeam.averageAttribute('workRate');
  
  let resistance = (avgTackling + avgPositioning + avgMarking + avgWorkRate) / 4;
  
  // TACTICAL MODIFIERS
  
  // Very defensive = +30% resistance
  if (tactics.mentality === Mentality.VERY_DEFENSIVE) {
    resistance *= 1.30;
  }
  
  // High pressing = -15% resistance (gaps in defense)
  if (tactics.pressingIntensity === PressingIntensity.VERY_HIGH) {
    resistance *= 0.85;
  }
  
  // Narrow width = +15% (compact block)
  if (tactics.width === 'NARROW') {
    resistance *= 1.15;
  }
  
  // FATIGUE PENALTY
  if (state.minute > 30) {
    const avgStamina = defendingTeam.averageAttribute('stamina');
    const fatigue = 1.0 - ((40 - state.minute) / 40) * (1 - avgStamina / 20);
    resistance *= fatigue; // Up to -20% when exhausted
  }
  
  return resistance;
}
```

#### 2. Shot Quality Reduction (20-50% penalty)
```typescript
function calculateShotQuality(
  shooter: Player,
  closestDefender: Player,
  distanceToDefender: number
): number {
  
  let quality = 0.7; // Base from creation
  
  // Proximity penalty
  if (distanceToDefender < 1.0) {
    quality -= 0.5 * (closestDefender.marking / 20); // Up to -50%
  }
  
  // Positioning (cutting angles)
  quality -= 0.3 * (closestDefender.positioning / 20); // Up to -30%
  
  // Shooter composure under pressure
  if (distanceToDefender < 2.0) {
    quality += (shooter.composure - 10) * 0.01; // ±10%
  }
  
  return Math.max(0.1, Math.min(1.0, quality));
}
```

#### 3. Shot Blocking
```typescript
function attemptShotBlock(defender: Player): boolean {
  let blockProb = 0.15; // Base 15%
  
  blockProb += defender.positioning * 0.01; // +20% max
  blockProb += defender.pace * 0.005; // +10% max (reactions)
  blockProb += defender.aggression * 0.005; // +10% max (bravery)
  
  return Math.random() < blockProb;
}
```

#### 4. Fouls & Discipline
```typescript
function calculateFoulProbability(
  defender: Player,
  minute: number
): number {
  
  let foulProb = 0.20; // Base 20% of failed tackles
  
  // Poor tackling = more fouls (±15%)
  foulProb += (20 - defender.tackling) * 0.015;
  
  // High aggression = more fouls (+20% max)
  foulProb += defender.aggression * 0.01;
  
  // Poor decisions = silly fouls (±10%)
  foulProb += (20 - defender.decisions) * 0.01;
  
  // TRAIT MODIFIERS
  if (defender.traits.hardTackler) foulProb += 0.15;
  if (defender.traits.standsOff) foulProb -= 0.10;
  
  // Late game desperation (+10%)
  if (minute > 35) foulProb += 0.10;
  
  return Math.max(0.05, Math.min(0.6, foulProb));
}
```

---

## Shot Quality & Conversion

### Shot Outcome Flow
```typescript
function generateShotOutcome(
  shooter: Player,
  goalkeeper: Player,
  shotQuality: number,
  state: MatchState
): ShotEvent {
  
  // 1. Is it on target? (UEFA baseline: 46.4%)
  const onTargetProb = 0.464 * shotQuality * attributeModifier(shooter);
  
  if (Math.random() > onTargetProb) {
    return { type: 'SHOT_OFF_TARGET', xG: shotQuality * 0.1 };
  }
  
  // 2. Can goalkeeper save it? (35% base)
  const saveProb = calculateSaveProbability(goalkeeper, shotQuality, state);
  
  if (Math.random() < saveProb) {
    return { type: 'SHOT_SAVED', xG: shotQuality * 0.35 };
  }
  
  // 3. Is it a goal? (19.9% of on-target shots)
  const goalProb = 0.199 * shotQuality * finishingModifier(shooter);
  
  if (Math.random() < goalProb) {
    return { type: 'GOAL', xG: shotQuality * 0.65 };
  }
  
  // 4. Woodwork or corner
  return Math.random() < 0.3 
    ? { type: 'WOODWORK', xG: shotQuality * 0.45 }
    : { type: 'CORNER', xG: shotQuality * 0.25 };
}
```

### Goalkeeper Save Probability
```typescript
function calculateSaveProbability(
  goalkeeper: Player,
  shotQuality: number,
  state: MatchState
): number {
  
  // Base: 35% of on-target shots saved
  let saveProb = 0.35 * (goalkeeper.reflexes / 15);
  
  // GK positioning reduces shot quality
  saveProb += (goalkeeper.positioning / 20) * 0.15;
  
  // TRAIT MODIFIERS
  if (goalkeeper.traits.rushesShotStopper) {
    saveProb += shotQuality < 0.6 ? 0.10 : -0.05;
  }
  
  if (goalkeeper.traits.nerveless && state.isHighPressure) {
    saveProb += 0.12; // Clutch saves
  }
  
  return Math.max(0.1, Math.min(0.8, saveProb));
}
```

---

## Player Attribute Mapping

### Offensive Attributes (1-20 scale)

| Attribute | Impact | Usage |
|-----------|--------|-------|
| **Finishing** | Shot → Goal conversion (+40% at elite) | Shot outcome probability |
| **Shooting** | Shot power, willingness to shoot | Shot quality, selection frequency |
| **Positioning** | Being in right place | Shot creation, quality modifier |
| **Dribbling** | 1v1 success | Duel probability, chance creation |
| **Pace** | Beat defender, counters | 1v1 modifier, counter-attack success |
| **Passing** | Team play quality | Build-up success, assist probability |
| **Creativity** | Key passes, unexpected plays | Playmaker effectiveness |
| **Composure** | Pressure situations | Late-game performance, penalty conversion |

### Defensive Attributes

| Attribute | Impact | Usage |
|-----------|--------|-------|
| **Tackling** | Win ball cleanly | 1v1 defense, foul reduction |
| **Marking** | Prevent shots, reduce quality | Shot prevention, quality penalty |
| **Positioning** | Defensive awareness | Cut angles, intercept passes |
| **WorkRate** | Pressing, stamina | Defensive resistance, fatigue resistance |
| **Aggression** | Tackle intensity | Foul likelihood (trade-off) |

### Physical & Mental

| Attribute | Impact | Usage |
|-----------|--------|-------|
| **Stamina** | Performance decay | Late-game modifier (min 30-40) |
| **Decisions** | Shot selection, tactical play | Foul avoidance, pass vs shoot |
| **Teamwork** | Tactical execution | Team synergy bonuses |

---

## Tactical Influence

### Team Mentality (Timing Modifier)

| Mentality | Early Game | Late Game | Shot Frequency | Defense |
|-----------|-----------|-----------|----------------|---------|
| **Very Defensive** | -15% | +10% | -20% | +30% resistance |
| **Defensive** | -8% | +5% | -10% | +15% resistance |
| **Balanced** | 0% | 0% | 0% | 0% |
| **Attacking** | +8% | -5% | +10% | -15% resistance |
| **Very Attacking** | +15% | -10% | +20% | -30% resistance |

### Pressing Intensity

| Intensity | Fouls | Turnovers Won | Fatigue | Defensive Gaps |
|-----------|-------|---------------|---------|----------------|
| **Low** | -30% | -20% | Low | +10% resistance |
| **Medium** | 0% | 0% | Normal | 0% |
| **High** | +30% | +20% | High | -5% resistance |
| **Very High** | +60% | +40% | Very High | -15% resistance |

### Width

| Width | Corners | Central Shots | Defensive Compactness |
|-------|---------|---------------|----------------------|
| **Narrow** | -20% | +20% | +15% resistance |
| **Balanced** | 0% | 0% | 0% |
| **Wide** | +30% | -15% | -10% resistance |

---

## Match State & Momentum

### Momentum System
```typescript
interface MatchState {
  minute: number;
  score: { home: number; away: number };
  momentum: number; // -1 (away) to +1 (home)
  energy: { home: number; away: number }; // 0-100
}

function updateMomentum(event: MatchEvent, state: MatchState): void {
  switch (event.type) {
    case 'GOAL':
      state.momentum = event.team === 'home' ? 0.7 : -0.7;
      break;
    case 'MISS_OPEN_GOAL':
      state.momentum *= -0.5; // Swing to opponent
      break;
    case 'GREAT_SAVE':
      state.momentum += event.team === 'home' ? 0.3 : -0.3;
      break;
  }
  
  // Decay momentum over time
  state.momentum *= 0.95;
}
```

### Match State Modifiers
```typescript
function adjustForMatchState(state: MatchState, team: 'home' | 'away'): number {
  const scoreDiff = state.score.home - state.score.away;
  const isHome = team === 'home';
  
  // Losing team desperation (late game)
  const desperationBoost = state.minute > 35 && (
    (isHome && scoreDiff < 0) || (!isHome && scoreDiff > 0)
  ) ? 1.3 : 1.0;
  
  // Winning team sits back
  const comfortMalus = state.minute > 30 && (
    (isHome && scoreDiff > 1) || (!isHome && scoreDiff < -1)
  ) ? 0.85 : 1.0;
  
  // Momentum effect (±15%)
  const momentumMod = isHome 
    ? 1.0 + (state.momentum * 0.15)
    : 1.0 - (state.momentum * 0.15);
  
  return desperationBoost * comfortMalus * momentumMod;
}
```

### Fatigue System
```typescript
function applyFatigue(team: Team, minute: number): void {
  if (minute < 20) return; // No fatigue early
  
  const fatigueStart = 20;
  const fatigueEnd = 40;
  const fatigueProgress = (minute - fatigueStart) / (fatigueEnd - fatigueStart);
  
  team.outfieldPlayers.forEach(player => {
    const staminaResistance = player.stamina / 20; // 0.05 to 1.0
    const fatiguePenalty = fatigueProgress * (1 - staminaResistance);
    
    // Reduce effective attributes
    player.effectivePace = player.pace * (1 - fatiguePenalty * 0.3);
    player.effectiveDribbling = player.dribbling * (1 - fatiguePenalty * 0.2);
    player.effectivePositioning = player.positioning * (1 - fatiguePenalty * 0.15);
    
    // High work-rate players tire faster
    if (player.workRate > 15) {
      fatiguePenalty *= 1.2;
    }
  });
}
```

---

## Implementation Roadmap

### Phase 1: Foundation ✅ COMPLETE
- [x] UEFA data collection (152 matches)
- [x] Statistical analysis & segmentation
- [x] Timing probability curves
- [x] Game engine config generation

### Phase 2: Core Engine 🔲 NEXT
**Priority:** High  
**Estimated Time:** 2-3 weeks

#### 2.1 Basic Match Simulation
- [ ] Match initialization (teams, tactics, expected goals)
- [ ] Minute-by-minute loop
- [ ] Timing multiplier application
- [ ] Basic event generation (shots, goals)

#### 2.2 Shot System
- [ ] Shot frequency calculation (per team)
- [ ] Shot quality calculation (attributes)
- [ ] Goal conversion (finishing vs GK)
- [ ] Shot outcomes (on target, saved, goal, woodwork)

#### 2.3 Attribute Integration
- [ ] Player attribute modifiers
- [ ] Position-based selection
- [ ] Quality thresholds validation

### Phase 3: Defensive Layer 🔲
**Priority:** High  
**Estimated Time:** 2 weeks

#### 3.1 Man-Marking System
- [ ] Matchup assignment algorithm
- [ ] User tactical instructions
- [ ] Auto-assignment strategies

#### 3.2 Defensive Resistance
- [ ] Shot prevention calculation
- [ ] Shot quality reduction
- [ ] Shot blocking attempts
- [ ] 1v1 duel system

#### 3.3 Fouls & Discipline
- [ ] Foul probability calculation
- [ ] Yellow/red card system
- [ ] Set piece generation

### Phase 4: Tactical Layer 🔲
**Priority:** Medium  
**Estimated Time:** 1-2 weeks

#### 4.1 Mentality System
- [ ] Timing curve adjustments
- [ ] Shot frequency modifiers
- [ ] Defensive resistance changes

#### 4.2 Pressing & Width
- [ ] Pressing intensity implementation
- [ ] Width impact on events
- [ ] Formation modifiers

#### 4.3 Set Pieces
- [ ] Corner routines
- [ ] Free kick mechanics
- [ ] Penalty kicks

### Phase 5: Match State 🔲
**Priority:** Medium  
**Estimated Time:** 1 week

#### 5.1 Momentum System
- [ ] Momentum tracking
- [ ] Event-based updates
- [ ] Momentum decay

#### 5.2 Score-Based Adjustments
- [ ] Desperation mechanics (losing late)
- [ ] Comfort mechanics (winning, sit back)
- [ ] Fly goalkeeper activation

#### 5.3 Fatigue System
- [ ] Energy tracking
- [ ] Attribute degradation
- [ ] Substitution impact

### Phase 6: Player Traits 🔲
**Priority:** Low (Enhancement)  
**Estimated Time:** 1-2 weeks

#### 6.1 Trait Implementation
- [ ] Trait definitions
- [ ] Event selection modifiers
- [ ] Probability adjustments

#### 6.2 Synergies
- [ ] Team trait bonuses
- [ ] Conflict penalties
- [ ] Chemistry system

### Phase 7: Polish & Balance 🔲
**Priority:** Ongoing  
**Estimated Time:** Continuous

#### 7.1 Statistical Validation
- [ ] Run 1000+ simulated matches
- [ ] Compare to UEFA baselines
- [ ] Adjust parameters

#### 7.2 User Experience
- [ ] xG (expected goals) display
- [ ] Event commentary
- [ ] Tactical feedback
- [ ] Performance analytics

#### 7.3 Edge Cases
- [ ] Red cards impact
- [ ] Weather conditions
- [ ] Referee strictness
- [ ] Player form/morale

---

## Testing & Validation

### Statistical Tests
```typescript
interface ValidationTests {
  // Averages should match UEFA data (±15% tolerance)
  avgGoalsPerMatch: { target: 5.16, tolerance: 0.5 },
  avgShotsPerTeam: { target: 28.55, tolerance: 2.0 },
  shotAccuracy: { target: 0.464, tolerance: 0.05 },
  
  // Distribution tests
  goalsInMinute39: { target: 0.0526, tolerance: 0.01 }, // 2.16x multiplier
  secondHalfGoals: { target: 0.568, tolerance: 0.05 },
  forwardGoalShare: { target: 0.645, tolerance: 0.05 },
  
  // Quality tests
  eliteVsAverage: { targetMultiplier: 2.5, tolerance: 0.5 },
  attackingVsDefensive: { targetMultiplier: 1.4, tolerance: 0.2 }
}
```

### Validation Scenarios
1. **Equal teams (75 rating):** Should average 5.16 goals, 50/50 win rate
2. **Quality gap (80 vs 70):** Better team wins ~60%, avg 3:2 score
3. **Defensive vs Attacking:** Defensive team fewer goals, fewer shots conceded
4. **Late-game comebacks:** Losing team creates more chances after min 35
5. **Attribute impact:** Elite finisher (18) scores 2.5x more than weak (8)

---

## Success Criteria

### Must Have ✅
- [x] Statistical realism (matches UEFA averages ±15%)
- [ ] Meaningful attribute differences (±50% variance)
- [ ] Tactical impact visible (±30% change)
- [ ] Timing patterns match (minute 39 spike, second-half bias)
- [ ] Position distribution correct (64.5% forwards)

### Should Have ⭐
- [ ] Defensive impact clear (man-marking matters)
- [ ] Match state influences outcomes (desperation works)
- [ ] Fatigue affects performance (late-game decline)
- [ ] Traits create unique playstyles

### Nice to Have 💡
- [ ] Player form/morale system
- [ ] Team chemistry bonuses
- [ ] Weather/pitch conditions
- [ ] Referee variance
- [ ] Injury mechanics

---

## Known Limitations & Caveats

### Data Limitations
1. **Position Mapping:** UEFA only provides Forward/Defender/GK, not Pivot/Ala/Fixo
2. **Home Advantage:** Tournament format skews data, use minimal 2% boost
3. **Team Quality Variance:** Mix of elite and weak teams in dataset
4. **Sample Size:** 152 matches (good but not huge)

### Design Trade-offs
1. **Determinism vs RNG:** Balance needed for user control vs unpredictability
2. **Complexity vs Performance:** More calculations = slower simulation
3. **Realism vs Fun:** Pure simulation might be boring, add drama
4. **User Agency vs Automation:** How much to simulate automatically

### Future Enhancements
- Player-specific statistics tracking
- Formation impact analysis
- Tactical AI for opponent teams
- Live match viewer/visualization
- Post-match analytics dashboard

---

## Configuration Files

### Generated Configs
- `game-engine-config.json` - Ready-to-use parameters
- `comprehensive-analysis.json` - Detailed statistical breakdown
- `goal-timing-data.json` - Minute-by-minute goal probabilities

### Integration Points
- `server/matchEngine.ts` - Current match engine (to be enhanced)
- `server/lightweightMatchEngine.ts` - Quick simulation (to be updated)
- `server/matchSimulator.ts` - UI-connected simulation

---

## Documentation
- [UEFA Data Quirks](../Scrape%20UEFA/DATA_QUIRKS_AND_CONTEXT.md)
- [Phase 3 Complete](../Scrape%20UEFA/PHASE3_COMPLETE.md)
- [Player Traits Design](../Player%20Traits/PLAYER_TRAITS_SYSTEM.md)
- [Implementation Plan](../Scrape%20UEFA/IMPLEMENTATION_PLAN.md)

---

**Next Steps:**
1. Begin Phase 2.1: Basic match simulation structure
2. Implement shot frequency & quality calculations
3. Add basic defensive resistance
4. Run initial validation tests
5. Iterate based on results

**Status:** Ready for implementation! 🚀
