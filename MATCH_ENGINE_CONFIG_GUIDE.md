# Match Engine Configuration Guide

## Overview

The match engine configuration has been refactored to centralize all tunable parameters in `server/matchEngineConfig.ts`. This makes it easier to adjust match behavior, balance gameplay, and test different scenarios without hunting through code.

## Configuration File Structure

### 1. **Match Timing & Structure** (`CONFIG.match`)
- **totalTicks**: Total simulation ticks (160 = 40 minutes)
- **minutesPerTick**: Real-time minutes per tick (0.25 = 15 seconds)
- **halfTimeTick**: When to reset accumulated fouls (tick 80 = minute 20)

### 2. **Expected Goals** (`CONFIG.expectedGoals`)
Based on UEFA futsal data (average 5.16 goals per match):
- **baseGoalsPerTeam**: 2.58 (half of match total)
- **homeAdvantage**: 1.02 (+2% boost)
- **ratingImpactPerPoint**: 0.01 (1% per rating point difference)
- **qualityMultiplierMin/Max**: 0.5 - 1.5 (prevents extreme snowballing)

### 3. **Event Probabilities** (`CONFIG.events`)
Controls how often match events occur:

#### Base Probabilities (per tick)
- **shot**: 0.15 (calibrated for ~25-30 shots/match)
- **dribble**: 0.30 (1v1 attempts)
- **tackle**: 0.20
- **foul**: 0.08 (calibrated for ~7-8 fouls/match)
- **corner**: 0.15

#### Timing Multipliers
- **earlyGame** (min 0-10): 0.8x (slower start)
- **normalGame** (min 11-30): 1.0x
- **lateGame** (min 30+): 1.2x (higher intensity)
- **veryHigh** (min 38): 1.3x
- **peakDanger** (min 39): 1.5x (highest danger)

#### Quality Impact
- **minMultiplier**: 0.95 (weak team)
- **maxMultiplier**: 1.05 (strong team)
- Minimal range prevents snowball effects

### 4. **Possession System** (`CONFIG.possession`)
- **changeChance**: 0.30 (30% chance per tick)
- **momentumImpactDivisor**: 200 (determines ±0.25 momentum effect)
- **minChance/maxChance**: 0.1 - 0.9 (prevents extremes)

### 5. **Shooting System** (`CONFIG.shooting`)
- **baseQuality**: 0.5
- **attributeWeights**:
  - shooting: 0.30
  - positioning: 0.20
- **counterAttackBonus**: 0.20 (+20% on counters)
- **momentumImpact**: 0.30 (±15% based on momentum)
- **baseVariance**: 0.16 (±8% random variance)
- **onTargetBase**: 0.75 (75% * quality = on-target chance)

### 6. **Defense System** (`CONFIG.defense`)
- **preventionRate**: 0.15 (up to 15% shot prevention)
- **qualityReduction**: 0.15 (up to 15% shot quality reduction)
- **counterPreventionMultiplier**: 0.3 (counters harder to stop)
- **attributeWeights**:
  - tackling: 0.35
  - positioning: 0.30
  - pace: 0.20
  - stamina: 0.15

### 7. **Goalkeeper System** (`CONFIG.goalkeeper`)
- **baseSaveChance**: 0.40
- **skillWeight**: 0.35 (GK skill impact)
- **qualityImpact**: 0.30 (shot quality impact)
- **minSaveChance/maxSaveChance**: 0.20 - 0.80

### 8. **Set Pieces** (`CONFIG.setPieces`)

#### Corners
- **shotChance**: 0.60 (60% lead to shots)
- **goalChance**: 0.20 (base conversion rate)

#### Free Kicks (dangerous fouls)
- **onTargetChance**: 0.70
- **baseGoalChance**: 0.45
- **shooterSkillWeight**: 0.20
- **gkSkillWeight**: 0.15
- **minGoalChance/maxGoalChance**: 0.25 - 0.75

#### Penalties (10m - 6th+ foul)
- **baseGoalChance**: 0.75 (high conversion)
- **shooterSkillWeight**: 0.15
- **gkSkillWeight**: 0.10
- **minGoalChance/maxGoalChance**: 0.20 - 0.95

### 9. **Fouls & Cards** (`CONFIG.fouls`)
- **accumulatedFoulPenaltyThreshold**: 6 (triggers 10m penalty)
- **resetAtHalfTime**: true
- **dangerousFoulChance**: 0.30 (30% of fouls are dangerous)
- **lateGameDangerousBonus**: 0.10 (+10% when minute > 35)

#### Cards
- **baseCardChance**: 0.25 (25% base)
- **lateGameBonus**: 0.10 (+10% in critical moments)
- **closeGameBonus**: 0.10 (+10% in tight games)
- **redCardChance**: 0.15 (from severe fouls)

#### Severity Distribution
- **light**: 0.70 (70%)
- **moderate**: 0.25 (25%)
- **severe**: 0.05 (5% - can lead to red cards)

### 10. **Red Cards** (`CONFIG.redCard`)
Futsal-specific rules:
- **returnAfterTicks**: 8 (2 minutes)
- **returnOnOpponentGoal**: true
- **permanentSuspension**: true (expelled player never returns)

### 11. **1v1 Dribbles** (`CONFIG.dribble`)
- **baseSuccessChance**: 0.50
- **attackerSkillWeight**: 0.35
- **defenderSkillWeight**: 0.25
- **minSuccessChance/maxSuccessChance**: 0.25 - 0.75

### 12. **Momentum System** (`CONFIG.momentum`)
- **startingValue**: 50 (neutral)
- **decayRate**: 0.5 (per minute toward equilibrium)
- **equilibrium**: 50

#### Event Changes
- goal: +15 / -15
- shotOnTarget: +2
- shotOffTarget: -1
- save: +3
- tackle: +1
- dribbleSuccess: +2
- foul: -1
- corner: +1
- redCard: -8

#### Other Factors
- **scoreDifferentialImpact**: 3 (±3 per goal difference)
- **fatigueImpact**: 0.15 weight
- **homeAdvantageBoost**: +2

### 13. **Fatigue System** (`CONFIG.fatigue`)
- **basePerTick**: 0.625% (100% energy over 160 ticks)
- **intensityImpact**: 0.7 - 1.3 multiplier
- **awayFatiguePenalty**: 1.05 (+5% for away team)
- **benchRecoveryPerTick**: 1.25% (faster than fatigue)
- **fitnessWeight**: 0.005 (0.5% per fitness point)
- **staminaWeight**: 0.003 (0.3% per stamina point)

#### Attribute Penalty
- **maxEffectiveness**: 1.0 (100% energy = 100% attributes)
- **minEffectiveness**: 0.5 (0% energy = 50% attributes)

### 14. **Substitution System** (`CONFIG.substitutions`)
- **defaultEnergyThreshold**: 50 (auto-sub at <50% energy)
- **unlimited**: true (futsal rules)
- **minMinute**: 2 (don't sub in first 2 minutes)
- **maxMinute**: 38 (don't sub in last 2 minutes)
- **maxPerTickPerTeam**: 5 (can swap entire lineup)

### 15. **Player Rating System** (`CONFIG.ratings`)
- **baseRating**: 6.5 (neutral performance)
- **weights**:
  - goals: 1.0
  - assists: 0.5
  - shots: 0.05
  - shotsOnTarget: 0.10
  - saves: 0.15
  - tackles: 0.08
  - interceptions: 0.08
  - dribblesSuccessful: 0.10
  - fouls: -0.10
- **energyImpact**: 0.005 (0.5% per energy point)
- **minRating/maxRating**: 6.0 - 10.0

### 16. **Fly-Goalkeeper System** (`CONFIG.flyGoalkeeper`)

#### Usage Thresholds
- **losing**: minMinute 0, scoreDiff -1
- **late**: minMinute 30, scoreDiff 0
- **counter**: enabled

#### Activation Chances
- **losing**: 0.20 (20%)
- **drawing**: 0.10 (10% late game)
- **counter**: 0.15 (15% to counter opponent)

#### Performance Modifiers
- **possession**: +0.30 (+30%)
- **shotFrequency**: +0.25 (+25%)
- **counterVulnerability**: +0.50 (+50% opponent counter goals)
- **defensiveWeakness**: -0.40 (-40% resistance)

### 17. **Team Quality Calculation** (`CONFIG.teamQuality`)
- **weights**:
  - currentAbility: 1.0
  - form: 0.10 (±10%)
  - morale: 0.05 (±5%)
  - fitness: 0.05 (±5%)
- **minQuality/maxQuality**: 30 - 100

### 18. **Counter-Attack System** (`CONFIG.counterAttack`)
- **triggerChance**: 0.15 (15% on successful tackle/interception)
- **durationTicks**: 2
- **shotProbability**: 0.70 (high chance of shot)

## How to Use

### Adjusting Match Difficulty
To make matches **harder**:
- Reduce `CONFIG.shooting.baseQuality`
- Increase `CONFIG.goalkeeper.baseSaveChance`
- Increase `CONFIG.defense.preventionRate`

To make matches **easier**:
- Increase `CONFIG.shooting.baseQuality`
- Reduce `CONFIG.goalkeeper.baseSaveChance`
- Reduce `CONFIG.defense.preventionRate`

### Adjusting Match Pace
For **faster** matches:
- Increase `CONFIG.events.baseProbabilities` values
- Increase `CONFIG.possession.changeChance`

For **slower** matches:
- Decrease `CONFIG.events.baseProbabilities` values
- Decrease `CONFIG.possession.changeChance`

### Balancing Scoring
If goals are too **high**:
- Reduce `CONFIG.expectedGoals.baseGoalsPerTeam`
- Reduce `CONFIG.shooting.onTargetBase`
- Increase `CONFIG.goalkeeper.baseSaveChance`

If goals are too **low**:
- Increase `CONFIG.expectedGoals.baseGoalsPerTeam`
- Increase `CONFIG.shooting.onTargetBase`
- Reduce `CONFIG.goalkeeper.baseSaveChance`

### Testing Changes
1. Modify values in `matchEngineConfig.ts`
2. Run tests: `npm test -- --run matchEngine-phase1`
3. Check match statistics (shots, goals, fouls, etc.)
4. Iterate based on results

### Validation
The config includes a `validateMatchEngineConfig()` function that checks:
- Probabilities are between 0 and 1
- Min values < Max values
- Logical consistency

Run validation:
```typescript
import { validateMatchEngineConfig } from './matchEngineConfig';
const result = validateMatchEngineConfig();
if (!result.valid) {
  console.error('Config errors:', result.errors);
}
```

## Example Modifications

### Creating a "Simulation" Mode (Realistic)
```typescript
// Lower scoring, more defensive
CONFIG.shooting.baseQuality = 0.45; // Reduce from 0.5
CONFIG.goalkeeper.baseSaveChance = 0.45; // Increase from 0.40
CONFIG.events.baseProbabilities.shot = 0.12; // Reduce from 0.15
CONFIG.expectedGoals.baseGoalsPerTeam = 2.3; // Reduce from 2.58
```

### Creating an "Arcade" Mode (High-Scoring)
```typescript
// Higher scoring, more action
CONFIG.shooting.baseQuality = 0.60; // Increase from 0.5
CONFIG.goalkeeper.baseSaveChance = 0.30; // Reduce from 0.40
CONFIG.events.baseProbabilities.shot = 0.20; // Increase from 0.15
CONFIG.expectedGoals.baseGoalsPerTeam = 3.5; // Increase from 2.58
```

### Increasing Tactical Impact
```typescript
// Make tactics more influential
// Edit tacticalModifiers in matchEngine.ts:
mentality.VeryAttacking.shotFreq = 0.30; // Increase from 0.20
mentality.VeryDefensive.defense = 0.25; // Increase from 0.15
pressing.VeryHigh.fouls = 0.50; // Increase from 0.40
```

## Best Practices

1. **Make Small Changes**: Adjust values by 10-20% at a time
2. **Test Thoroughly**: Run at least 10-20 matches to see patterns
3. **Document Changes**: Note what you changed and why
4. **Use Version Control**: Commit before major config changes
5. **Balance Holistically**: Changing one value often affects others

## Current Calibration

The current configuration is calibrated for:
- **Realistic futsal scoring**: ~5-6 goals per match
- **Balanced possession**: Quality difference matters but isn't overwhelming
- **Tactical variety**: Different tactics produce noticeable differences
- **Fatigue matters**: Late-game substitutions are important
- **Set pieces dangerous**: Fouls and corners create scoring chances

## Future Enhancements

Potential additions to configuration:
- Difficulty presets (Easy, Normal, Hard, Realistic)
- Competition-specific modifiers (Champions League boost)
- Weather effects
- Crowd pressure
- Referee strictness settings
- Player trait influence multipliers
