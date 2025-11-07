# Player Traits System - Design Document

## Status: Design Phase ✅ | Implementation: Pending 🔲

**Last Updated:** November 7, 2025  
**Purpose:** Define player personality and playstyle beyond raw attributes

---

## Table of Contents
1. [Overview](#overview)
2. [Trait Philosophy](#trait-philosophy)
3. [Trait Categories](#trait-categories)
4. [Trait Impact System](#trait-impact-system)
5. [Trait Synergies](#trait-synergies)
6. [Trait Acquisition](#trait-acquisition)
7. [Implementation Guide](#implementation-guide)

---

## Overview

### What Are Traits?

**Attributes** tell you **HOW GOOD** a player is.  
**Traits** tell you **HOW THEY PLAY**.

```typescript
// Example:
// Player A: 18 Dribbling, no traits
// Player B: 18 Dribbling, "attempts1v1" trait

// Both are equally good dribblers
// But Player B will TRY to dribble much more often (2x frequency)
```

### Design Goals
- ✅ Create **recognizable playstyles** (finishers, playmakers, dribblers)
- ✅ Add **personality** to players (selfish, team player, nerveless)
- ✅ Provide **tactical depth** (assign right player to right role)
- ✅ Enable **storytelling** ("My nerveless striker scored the winner!")
- ✅ Maintain **balance** (traits modify by 5-25%, not game-breaking)

---

## Trait Philosophy

### Core Principles

#### 1. Traits Modify Behavior, Not Ability
```typescript
// WRONG: Trait changes attribute value
if (player.traits.speedDribbler) {
  player.pace = 20; // Makes everyone equally fast
}

// RIGHT: Trait changes how attribute is used
if (player.traits.speedDribbler && player.pace > defender.pace) {
  dribbleSuccess += 0.08; // +8% when using pace advantage
}
```

#### 2. Traits Have Trade-offs
Every trait should have a **context** where it's beneficial and where it's not.

```typescript
// "attemptsLongShots" trait
if (distance > 10) {
  shotQuality += 0.15; // +15% from distance (benefit)
} else {
  shotQuality -= 0.05; // -5% close range (impatient, trade-off)
}

// "finisher" trait
if (situation.isOpen) {
  shotQuality += 0.18; // +18% in clear chances (benefit)
} else {
  shotQuality -= 0.10; // -10% contested (waits too long, trade-off)
}
```

#### 3. Traits Stack with Attributes
```typescript
// Low attribute + good trait = still weak
// Low dribbling (8) + "attempts1v1" = tries often, fails often

// High attribute + bad trait = still strong but inefficient
// High finishing (18) + "selfish" = scores but misses assists

// High attribute + good trait = elite
// High dribbling (18) + "speedDribbler" + high pace = unstoppable
```

#### 4. Traits Should Be Noticeable
If a trait only changes outcomes by 1-2%, players won't notice it. Aim for **5-25% impact** in relevant situations.

---

## Trait Categories

### 1. Offensive Traits

#### Shot Selection Traits
```typescript
interface ShotSelectionTraits {
  // Determines WHEN and WHERE player shoots
  
  attemptsLongShots: {
    description: "Likes to shoot from distance",
    impact: {
      longRangeShots: "+15% quality when distance > 10m",
      closeRangeShots: "-5% quality (impatient)",
      shotFrequency: "+20% overall"
    },
    rarity: "UNCOMMON", // 25% of players
    requiredAttributes: { shooting: 13 }
  },
  
  shootsOnTurn: {
    description: "Quick turn and shoot, catches defenders off guard",
    impact: {
      turnAndShootQuality: "+12% (surprise element)",
      regularShotQuality: "0% (only on turns)"
    },
    rarity: "UNCOMMON",
    requiredAttributes: { dribbling: 12, shooting: 12 }
  },
  
  finisher: {
    description: "Waits for perfect moment, clinical in clear chances",
    impact: {
      openShotQuality: "+18% when unmarked",
      contestedShots: "-10% (hesitates)",
      shotFrequency: "-15% (patient)"
    },
    rarity: "RARE", // 10% of players
    requiredAttributes: { finishing: 16, composure: 14 }
  },
  
  placesShots: {
    description: "Precision over power",
    impact: {
      shotAccuracy: "+8%",
      shotPower: "-10% (easier to save if not placed well)"
    },
    rarity: "UNCOMMON"
  }
}
```

#### Dribbling Traits
```typescript
interface DribblingTraits {
  // Determines HOW player beats defenders
  
  attempts1v1: {
    description: "Frequently tries to beat defender 1-on-1",
    impact: {
      dribbleAttempts: "+100% frequency (2x more attempts)",
      dribbleSuccess: "+5% (experience in 1v1s)",
      ballLoss: "+15% when failing (more risky play)"
    },
    rarity: "UNCOMMON",
    requiredAttributes: { dribbling: 12 }
  },
  
  speedDribbler: {
    description: "Uses pace to beat players with knock-ons",
    impact: {
      dribbleSuccess: "+8% when pace > defender pace",
      noSpeedAdvantage: "-3% (less effective vs fast defenders)"
    },
    rarity: "UNCOMMON",
    requiredAttributes: { dribbling: 13, pace: 15 }
  },
  
  technicalDribbler: {
    description: "Uses skill moves and close control in tight spaces",
    impact: {
      dribbleSuccess: "+5% always (skill moves)",
      tightSpaces: "+10% additional in crowded areas",
      counterAttacks: "-5% (prefers build-up)"
    },
    rarity: "RARE",
    requiredAttributes: { dribbling: 15, creativity: 13 }
  },
  
  flair: {
    description: "Unpredictable, can produce magic or disaster",
    impact: {
      variance: "±20% quality swing (high variance)",
      spectacularGoals: "+5% chance of worldie",
      simpleErrors: "+5% chance of howler"
    },
    rarity: "RARE"
  }
}
```

#### Passing/Playmaking Traits
```typescript
interface PlaymakingTraits {
  
  playmaker: {
    description: "Looks to create chances for teammates",
    impact: {
      teamPlaySuccess: "+5% per playmaker in team",
      assistProbability: "+15%",
      shotAttempts: "-10% (prefers to pass)"
    },
    rarity: "UNCOMMON",
    requiredAttributes: { passing: 15, creativity: 14 }
  },
  
  does1_2: {
    description: "Excels at one-two passes to create space",
    impact: {
      oneTwo Attempts: "+30% frequency",
      oneTwoSuccess: "+10% (timing and movement)",
      staticPlay: "-5% (less effective when static)"
    },
    rarity: "COMMON",
    requiredAttributes: { passing: 13, positioning: 12 }
  },
  
  playsRiskyPasses: {
    description: "Attempts difficult through balls and long passes",
    impact: {
      successfulRiskyPass: "Shot quality 0.85 (great chance)",
      failedRiskyPass: "40% interception rate (high risk)",
      safePassPreference: "-20% (goes for glory)"
    },
    rarity: "UNCOMMON",
    requiredAttributes: { passing: 14, creativity: 15 }
  },
  
  dictatesTempo: {
    description: "Controls game rhythm, keeps possession",
    impact: {
      teamPossession: "+5%",
      attackingUrgency: "-10% (patient)",
      underPressure: "+8% composure"
    },
    rarity: "RARE"
  }
}
```

#### Movement Traits
```typescript
interface MovementTraits {
  
  runsInBehind: {
    description: "Makes runs for through balls",
    impact: {
      counterAttackSuccess: "+12%",
      receiveThroughBalls: "+20% frequency",
      buildUpPlay: "-5% (less available)"
    },
    rarity: "COMMON",
    requiredAttributes: { pace: 13, positioning: 12 }
  },
  
  comesToBall: {
    description: "Drops deep to receive passes",
    impact: {
      buildUpInvolvement: "+15%",
      linkUpPlay: "+10% quality",
      goalScoringPositions: "-10% (deeper)"
    },
    rarity: "COMMON",
    requiredAttributes: { positioning: 12, teamwork: 13 }
  },
  
  targetMan: {
    description: "Strong in holding up ball, pivot play",
    impact: {
      holdUpPlay: "+15% success",
      teamPlayBuildup: "+8% quality",
      individual1v1: "-5% (less mobile)"
    },
    rarity: "UNCOMMON",
    requiredAttributes: { strength: 14, positioning: 13 }
  }
}
```

#### Teamwork Traits
```typescript
interface TeamworkTraits {
  
  teamPlayer: {
    description: "Prioritizes team success over individual glory",
    impact: {
      teamChemistry: "+3% when 3+ team players",
      passVsShoot: "+20% pass preference",
      selfishConflict: "-5% if selfish players present"
    },
    rarity: "COMMON"
  },
  
  selfish: {
    description: "Shoots when should pass, wants personal glory",
    impact: {
      shotAttempts: "+30% frequency",
      poorShotSelection: "-20% quality when should pass",
      teamChemistry: "-8% when 2+ selfish players",
      individualGoals: "+10% (more attempts)"
    },
    rarity: "UNCOMMON"
  }
}
```

---

### 2. Defensive Traits

#### Tackling Style Traits
```typescript
interface TacklingTraits {
  
  hardTackler: {
    description: "Aggressive, committed tackles",
    impact: {
      tackleSuccess: "+10% ball winning",
      foulProbability: "+15% (goes in hard)",
      yellowCardRisk: "+20%"
    },
    rarity: "COMMON",
    requiredAttributes: { tackling: 13, aggression: 14 }
  },
  
  anticipates: {
    description: "Reads play, intercepts passes",
    impact: {
      interceptions: "+20% frequency",
      dribbleDefense: "-7% (relies on anticipation)",
      positioningBonus: "+5% effective positioning"
    },
    rarity: "UNCOMMON",
    requiredAttributes: { positioning: 15, decisions: 14 }
  },
  
  standsOff: {
    description: "Doesn't dive in, stays on feet",
    impact: {
      dribbleDefense: "+5% easier to beat",
      foulProbability: "-10% (doesn't commit)",
      containment: "+8% (hard to get past)"
    },
    rarity: "COMMON",
    requiredAttributes: { positioning: 13 }
  },
  
  slidesTackles: {
    description: "Uses slide tackles frequently",
    impact: {
      lastDitchTackle: "+15% success",
      foulRisk: "+20% when unsuccessful",
      yellowCardRisk: "+25%"
    },
    rarity: "UNCOMMON"
  }
}
```

#### Marking Traits
```typescript
interface MarkingTraits {
  
  tightMarking: {
    description: "Stays very close to attacker",
    impact: {
      dribbleDefense: "-6% attacker success",
      shotQuality: "-10% opponent quality",
      beaten: "+10% when attacker successful (out of position)"
    },
    rarity: "COMMON",
    requiredAttributes: { marking: 14 }
  },
  
  zonalMarker: {
    description: "Prefers covering space over man-marking",
    impact: {
      manMarkingEffectiveness: "-10%",
      spaceControl: "+15%",
      interceptions: "+10%"
    },
    rarity: "UNCOMMON"
  }
}
```

#### Defensive Mentality Traits
```typescript
interface DefensiveMentalityTraits {
  
  lastDefender: {
    description: "Always stays back, rarely attacks",
    impact: {
      defensiveSolidity: "+10%",
      attackingContribution: "-80%",
      counterAttackSupport: "-50%"
    },
    rarity: "COMMON",
    requiredAttributes: { positioning: 13, decisions: 13 }
  },
  
  getsForward: {
    description: "Joins attacks frequently",
    impact: {
      attackingContribution: "+40%",
      goalThreat: "+15%",
      defensiveGaps: "-15% team defense",
      counterVulnerability: "+20%"
    },
    rarity: "UNCOMMON",
    requiredAttributes: { stamina: 14, pace: 12 }
  }
}
```

---

### 3. Goalkeeper Traits

```typescript
interface GoalkeeperTraits {
  
  isFlyGoalkeeper: {
    description: "Acts as outfield player when attacking (empty net)",
    impact: {
      activationProb: "5% base, +15% when losing, +20% if down 2+",
      attackingThreat: "+25% team shots (late game)",
      goalRisk: "+30% concede if caught out"
    },
    rarity: "VERY_RARE", // 3% of goalkeepers
    requiredAttributes: { flyGoalkeeper: 12, shooting: 10 }
  },
  
  rushesShotStopper: {
    description: "Comes out aggressively to close angles",
    impact: {
      weakShots: "+10% save rate (smothers)",
      qualityShots: "-5% save rate (caught out)",
      oneOnOne: "+15% save rate (narrows angle)"
    },
    rarity: "UNCOMMON"
  },
  
  sweeper: {
    description: "Acts as extra defender, excellent positioning",
    impact: {
      saveProbability: "+8% (positioning)",
      distributionQuality: "+10%",
      longDistribution: "+15% counter-attack initiation"
    },
    rarity: "UNCOMMON",
    requiredAttributes: { positioning: 15 }
  },
  
  commandsArea: {
    description: "Organizes defense, vocal leader",
    impact: {
      teamDefense: "+5% resistance",
      setPieceDefense: "+10%",
      confidentCatches: "+8% (vs parrying)"
    },
    rarity: "RARE"
  },
  
  longDistribution: {
    description: "Excellent long passes to start counters",
    impact: {
      counterAttackFrequency: "+20%",
      counterAttackQuality: "+10%",
      shortBuildUp: "-5% (prefers long)"
    },
    rarity: "COMMON"
  }
}
```

---

### 4. Mental Traits

```typescript
interface MentalTraits {
  
  // Pressure & Clutch Performance
  
  nerveless: {
    description: "Performs better in high-pressure situations",
    impact: {
      lateGameQuality: "+15% (min 35-40)",
      penaltyConversion: "+20%",
      importantMatches: "+10%",
      lowStakesGames: "-3% (less motivated)"
    },
    rarity: "RARE",
    requiredAttributes: { composure: 16 }
  },
  
  choker: {
    description: "Crumbles under pressure",
    impact: {
      lateGameQuality: "-25% (min 35-40)",
      penaltyConversion: "-30%",
      importantMatches: "-15%",
      lowStakesGames: "+5% (relaxed)"
    },
    rarity: "UNCOMMON",
    conflicts: ["nerveless"]
  },
  
  bigGamePlayer: {
    description: "Thrives in important matches (finals, derbies)",
    impact: {
      finalMatches: "+15% quality",
      playoffMatches: "+12% quality",
      regularMatches: "0%"
    },
    rarity: "VERY_RARE",
    requiredAttributes: { composure: 14 },
    requiresExperience: { matches: 50, importantMatches: 10 }
  },
  
  // Consistency
  
  consistent: {
    description: "Reliable, similar performance each match",
    impact: {
      variance: "Reduced ±40% (pulls toward average)",
      floorPerformance: "+20% minimum",
      ceilingPerformance: "-10% maximum"
    },
    rarity: "COMMON"
  },
  
  unpredictable: {
    description: "Can be brilliant or terrible",
    impact: {
      variance: "Increased ±60%",
      worldClass: "+10% chance of exceptional game",
      disaster: "+10% chance of howler"
    },
    rarity: "UNCOMMON",
    conflicts: ["consistent"]
  },
  
  // Leadership
  
  leader: {
    description: "Boosts entire team performance",
    impact: {
      teamMorale: "+8% all players",
      comebackBonus: "+15% when losing",
      youngPlayerBonus: "+10% for players under 23"
    },
    rarity: "RARE",
    requiredAttributes: { teamwork: 15, decisions: 14 },
    requiresExperience: { age: 27, captaincy: 2 }
  },
  
  influencer: {
    description: "Changes match momentum with big plays",
    impact: {
      momentumSwing: "+30% on goal/assist",
      inspiringPlays: "+10% team motivation after event",
      pressure: "-5% (carries team burden)"
    },
    rarity: "VERY_RARE"
  }
}
```

---

## Trait Impact System

### Impact Tiers

```typescript
enum TraitImpactLevel {
  MINOR = "MINOR",       // ±5-8%
  MODERATE = "MODERATE", // ±10-15%
  MAJOR = "MAJOR"        // ±18-25%
}
```

### Application Layers

Traits impact the match engine at **3 layers:**

#### Layer 1: Event Selection (Who attempts what)
```typescript
// Example: "attempts1v1" trait
function selectAttackerFor1v1(team: Team): Player {
  const dribblers = team.players.filter(p => p.traits.attempts1v1);
  
  if (dribblers.length > 0) {
    // 2x more likely to be selected
    return weightedSelection(dribblers, 2.0);
  }
  
  return weightedSelection(team.players, 1.0);
}
```

#### Layer 2: Success Probability (Does attempt succeed)
```typescript
// Example: "speedDribbler" trait
function calculate1v1Success(attacker: Player, defender: Player): number {
  let prob = baseCalculation(attacker, defender);
  
  if (attacker.traits.speedDribbler && attacker.pace > defender.pace) {
    prob += 0.08; // +8% when using pace advantage
  }
  
  return prob;
}
```

#### Layer 3: Quality Modifier (How good is the outcome)
```typescript
// Example: "finisher" trait
function calculateShotQuality(shooter: Player, situation: ShotSituation): number {
  let quality = baseQuality(situation);
  
  if (shooter.traits.finisher) {
    if (situation.isOpen) {
      quality += 0.18; // +18% in clear chances
    } else {
      quality -= 0.10; // -10% contested (hesitates)
    }
  }
  
  return quality;
}
```

### Trait Stacking Rules

```typescript
// Multiple traits can apply to same event
function applyAllTraitModifiers(
  player: Player,
  baseValue: number,
  context: EventContext
): number {
  
  let modified = baseValue;
  
  // Apply each relevant trait
  player.traits.forEach(trait => {
    if (traitApplies(trait, context)) {
      modified *= trait.getModifier(context);
    }
  });
  
  // Cap total modification at ±50%
  return Math.max(baseValue * 0.5, Math.min(baseValue * 1.5, modified));
}
```

---

## Trait Synergies

### Positive Synergies (Team Bonuses)

```typescript
interface TraitSynergy {
  // Multiple playmakers work together
  playmakerSynergy: {
    condition: "2+ players with 'playmaker' trait",
    bonus: "+8% team play success",
    description: "Playmakers combine to unlock defenses"
  },
  
  // Team players boost cohesion
  teamPlayerSynergy: {
    condition: "3+ players with 'teamPlayer' trait",
    bonus: "+10% team chemistry",
    description: "Unselfish players create fluid attacking"
  },
  
  // Fly GK + attacking defenders
  flyGoalkeeperCombo: {
    condition: "Fly GK + 1+ 'getsForward' defender",
    bonus: "+5% attacking threat, +15% late-game goals",
    description: "Goalkeeper joins aggressive defenders"
  },
  
  // 1-2 pass specialists
  oneTwoSynergy: {
    condition: "2+ players with 'does1_2' trait",
    bonus: "+12% one-two success, +30% attempt frequency",
    description: "Quick combinations unlock defense"
  }
}
```

### Negative Synergies (Conflicts)

```typescript
interface TraitConflict {
  // Multiple selfish players
  selfishConflict: {
    condition: "2+ players with 'selfish' trait",
    penalty: "-8% per extra selfish player",
    description: "Ball hogs compete, poor team play"
  },
  
  // Playmaker vs Selfish
  philosophyClash: {
    condition: "1+ 'playmaker' AND 1+ 'selfish'",
    penalty: "-5% team chemistry",
    description: "Conflicting approaches to game"
  },
  
  // Too many attacking defenders
  defensiveGaps: {
    condition: "2+ defenders with 'getsForward'",
    penalty: "-8% defensive solidity",
    description: "Nobody stays back to defend"
  },
  
  // Too many cautious players
  lacksCreativity: {
    condition: "3+ players with 'lastDefender'",
    penalty: "-10% attacking threat",
    description: "Too defensive, nobody attacks"
  }
}
```

---

## Trait Acquisition

### How Players Get Traits

#### 1. Youth Development (Potential)
```typescript
interface TraitDevelopmentPotential {
  // Based on attributes at young age (16-20)
  
  attempts1v1: {
    probability: () => {
      if (player.age > 20) return 0;
      if (player.dribbling >= 14) return 0.30; // 30% chance
      return 0;
    }
  },
  
  playmaker: {
    probability: () => {
      if (player.age > 22) return 0;
      if (player.passing >= 15 && player.creativity >= 14) return 0.25;
      return 0;
    }
  },
  
  finisher: {
    probability: () => {
      if (player.age > 21) return 0;
      if (player.finishing >= 16 && player.composure >= 13) return 0.15;
      return 0;
    }
  }
}
```

#### 2. Training Focus
```typescript
interface TraitTraining {
  // Specific training can develop traits over time (6-12 months)
  
  '1V1_DRIBBLING': {
    developsTrait: 'attempts1v1',
    requirements: { 
      minDribbling: 12,
      trainingIntensity: 'HIGH',
      duration: '6 months'
    },
    successRate: 0.40 // 40% chance after 6 months
  },
  
  'PLAYMAKING': {
    developsTrait: 'playmaker',
    requirements: {
      minPassing: 13,
      minCreativity: 12,
      duration: '8 months'
    },
    successRate: 0.35
  },
  
  'FINISHING': {
    developsTrait: 'finisher',
    requirements: {
      minFinishing: 14,
      minComposure: 12,
      duration: '10 months'
    },
    successRate: 0.25
  }
}
```

#### 3. Experience-Based (Earned)
```typescript
interface ExperienceBasedTraits {
  // Earned through match performance
  
  bigGamePlayer: {
    requirements: {
      totalMatches: 50,
      importantMatches: 10,
      performanceInImportant: 'ABOVE_AVERAGE' // 7+ rating
    },
    earned: "After 10th important match with good performance"
  },
  
  nerveless: {
    requirements: {
      pressureSituations: 20, // Late game, penalties, etc.
      successfulOutcomes: 12, // 60% success rate
      composure: 14
    },
    earned: "After proving clutch ability"
  },
  
  leader: {
    requirements: {
      age: 27,
      captaincySeasons: 2,
      teamwork: 15,
      decisions: 14,
      respect: 'HIGH' // From teammates
    },
    earned: "After establishing leadership"
  }
}
```

#### 4. Random Development
```typescript
interface RandomTraitDevelopment {
  // Small chance each season for young players
  
  seasonalCheck: {
    playerAge: '18-23',
    baseChance: 0.05, // 5% per season
    attributeBonus: 'If relevant attribute >= 15: +5%',
    trainingBonus: 'If specialized training: +10%'
  },
  
  // Example:
  // 19-year-old with 16 dribbling, 1v1 dribbling training
  // Chance of "attempts1v1": 5% + 5% + 10% = 20% per season
}
```

### Trait Loss/Change
```typescript
interface TraitLoss {
  // Traits can be lost or changed over time
  
  ageRelated: {
    'speedDribbler': "Lost if pace drops below 12 (age 32+)",
    'runsInBehind': "Lost if pace drops below 11 (age 33+)"
  },
  
  injuryRelated: {
    'hardTackler': "May become 'standsOff' after serious injury",
    'attempts1v1': "Reduced frequency after confidence-shattering injury"
  },
  
  formRelated: {
    'consistent': "Can become 'unpredictable' after extended poor form",
    'nerveless': "Can become 'choker' after crucial miss"
  }
}
```

---

## Implementation Guide

### Data Structure

```typescript
interface PlayerTraits {
  // Offensive
  attemptsLongShots?: boolean;
  shootsOnTurn?: boolean;
  finisher?: boolean;
  placesShots?: boolean;
  
  attempts1v1?: boolean;
  speedDribbler?: boolean;
  technicalDribbler?: boolean;
  flair?: boolean;
  
  playmaker?: boolean;
  does1_2?: boolean;
  playsRiskyPasses?: boolean;
  dictatesTempo?: boolean;
  
  runsInBehind?: boolean;
  comesToBall?: boolean;
  targetMan?: boolean;
  
  teamPlayer?: boolean;
  selfish?: boolean;
  
  // Defensive
  hardTackler?: boolean;
  anticipates?: boolean;
  standsOff?: boolean;
  slidesTackles?: boolean;
  
  tightMarking?: boolean;
  zonalMarker?: boolean;
  
  lastDefender?: boolean;
  getsForward?: boolean;
  
  // Goalkeeper
  isFlyGoalkeeper?: boolean;
  rushesShotStopper?: boolean;
  sweeper?: boolean;
  commandsArea?: boolean;
  longDistribution?: boolean;
  
  // Mental
  nerveless?: boolean;
  choker?: boolean;
  bigGamePlayer?: boolean;
  
  consistent?: boolean;
  unpredictable?: boolean;
  
  leader?: boolean;
  influencer?: boolean;
}
```

### Usage in Match Engine

```typescript
// 1. Event Selection Phase
function determineEventType(team: Team): EventType {
  const traitModifiers = analyzeTeamTraits(team);
  
  let weights = BASE_WEIGHTS;
  
  // Apply trait modifiers
  if (traitModifiers.attempts1v1Count > 2) {
    weights.ONE_VS_ONE += 0.15;
  }
  
  if (traitModifiers.playmakerCount > 1) {
    weights.TEAM_PLAY += 0.15;
  }
  
  return selectWeighted(weights);
}

// 2. Player Selection Phase
function selectPlayer(team: Team, context: EventContext): Player {
  // Filter by relevant trait
  let candidates = team.players;
  
  if (context.type === '1v1_DRIBBLE') {
    const dribblers = candidates.filter(p => p.traits.attempts1v1);
    if (dribblers.length > 0) {
      candidates = dribblers; // 100% selection boost
    }
  }
  
  // Weight by attributes
  return weightedSelection(candidates);
}

// 3. Outcome Calculation Phase
function calculateOutcome(player: Player, context: EventContext): Outcome {
  let probability = baseCalculation();
  let quality = baseQuality();
  
  // Apply trait modifiers
  player.traits.forEach(trait => {
    const modifier = getTraitModifier(trait, context);
    probability *= modifier.probability;
    quality *= modifier.quality;
  });
  
  return { probability, quality };
}
```

### User Interface

```typescript
interface TraitDisplay {
  // Pre-match
  playerCard: {
    traitIcons: TraitIcon[],
    traitDescriptions: string[],
    tacticalSuggestions: string[] // "Use in 1v1 situations"
  },
  
  // Tactical screen
  traitWarnings: string[], // "Opponent striker has 'finisher' - mark tightly"
  traitOpportunities: string[], // "Your winger has 'speedDribbler' vs slow defender"
  
  // In-match
  eventCommentary: {
    withTrait: "Player X (attempts1v1) beats defender with pace!",
    withoutTrait: "Player X beats defender"
  },
  
  // Post-match
  traitPerformance: {
    trait: "attempts1v1",
    timesTriggered: 8,
    successRate: 0.625,
    impact: "Created 3 shots, 1 goal"
  }
}
```

---

## Balancing Guidelines

### Impact Ranges
```typescript
const BALANCING_RULES = {
  // Selection probability
  selectionModifier: {
    min: 1.0,   // No change
    max: 2.0    // 2x more likely
  },
  
  // Success probability
  successModifier: {
    min: -0.15, // -15%
    max: +0.25  // +25%
  },
  
  // Quality modifier
  qualityModifier: {
    min: -0.25, // -25%
    max: +0.30  // +30%
  },
  
  // Total stack limit
  totalModifier: {
    min: 0.50,  // Can't reduce below 50%
    max: 1.50   // Can't boost above 150%
  }
};
```

### Rarity Distribution
```typescript
const TRAIT_RARITY_DISTRIBUTION = {
  COMMON: {
    percentage: 40,
    examples: ['teamPlayer', 'consistent', 'does1_2', 'hardTackler']
  },
  
  UNCOMMON: {
    percentage: 25,
    examples: ['attempts1v1', 'playmaker', 'attemptsLongShots', 'anticipates']
  },
  
  RARE: {
    percentage: 10,
    examples: ['finisher', 'nerveless', 'technicalDribbler', 'leader']
  },
  
  VERY_RARE: {
    percentage: 3,
    examples: ['bigGamePlayer', 'isFlyGoalkeeper', 'influencer', 'flair']
  }
};
```

### Testing Checklist
- [ ] Trait impact visible in match (5-25% changes)
- [ ] Traits don't break balance (capped at ±50% total)
- [ ] Synergies reward team building (+8-15%)
- [ ] Conflicts create trade-offs (-5-12%)
- [ ] Rare traits feel special (3-5% of players)
- [ ] Common traits add flavor without dominance
- [ ] Negative traits have meaningful impact
- [ ] User can identify player by traits ("my nerveless striker")

---

## Implementation Roadmap

### Phase 1: Core Traits 🔲
**Priority:** High  
**Time:** 1 week

- [ ] Define 15-20 core traits
- [ ] Implement trait data structure
- [ ] Add trait modifiers to event selection
- [ ] Add trait modifiers to success calculation

### Phase 2: Trait Display 🔲
**Priority:** Medium  
**Time:** 3 days

- [ ] Player card trait icons
- [ ] Trait descriptions
- [ ] Match commentary integration
- [ ] Post-match trait analysis

### Phase 3: Synergies 🔲
**Priority:** Medium  
**Time:** 4 days

- [ ] Team trait analysis
- [ ] Positive synergy bonuses
- [ ] Negative conflict penalties
- [ ] UI feedback for synergies

### Phase 4: Acquisition 🔲
**Priority:** Low  
**Time:** 1 week

- [ ] Youth development traits
- [ ] Training-based development
- [ ] Experience-based earning
- [ ] Random seasonal checks

### Phase 5: Advanced Traits 🔲
**Priority:** Low (Enhancement)  
**Time:** Ongoing

- [ ] Additional trait library (30+ total)
- [ ] Dynamic trait changes
- [ ] Trait loss conditions
- [ ] Special event-triggered traits

---

## Success Criteria

### Must Have ✅
- [ ] 15-20 core traits implemented
- [ ] Traits impact event selection (observable)
- [ ] Traits impact success probability (5-25%)
- [ ] Traits displayed in player cards
- [ ] Match commentary mentions traits

### Should Have ⭐
- [ ] Team synergies calculated
- [ ] Conflict penalties applied
- [ ] Post-match trait performance report
- [ ] Tactical suggestions based on traits

### Nice to Have 💡
- [ ] Trait development system
- [ ] Dynamic trait changes
- [ ] 30+ total traits
- [ ] Special rare traits (< 1% of players)

---

**Status:** Design complete, ready for implementation! 🚀

**Next Steps:**
1. Prioritize 15 core traits for Phase 1
2. Implement trait data in player schema
3. Add trait modifiers to match engine
4. Create trait display UI components
5. Test balance and impact visibility
