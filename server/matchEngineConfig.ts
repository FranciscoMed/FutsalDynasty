/**
 * MATCH ENGINE CONFIGURATION
 * 
 * Centralized configuration for all match simulation parameters.
 * Modify these values to adjust match behavior, difficulty, and realism.
 */

import { min } from "drizzle-orm";
import { on } from "events";
import { AsteriskSquare } from "lucide-react";

export const MatchEngineConfig = {
  // ============================================================================
  // MATCH TIMING & STRUCTURE
  // ============================================================================
  match: {
    /** Total ticks per match (1 tick = 15 seconds) */
    totalTicks: 160,
    /** Minutes per tick */
    minutesPerTick: 0.25,
    /** Half-time tick (minute 20) */
    halfTimeTick: 80,
  },

  // ============================================================================
  // EXPECTED GOALS (UEFA DATA-BASED)
  // ============================================================================
  expectedGoals: {
    /** Average goals per team per match (UEFA futsal average: 2.58) */
    baseGoalsPerTeam: 2.58,
    /** Home advantage multiplier */
    homeAdvantage: 1.02, // +2%
    /** Rating difference impact per point (1% per rating point) */
    ratingImpactPerPoint: 0.01,
    /** Min/max quality multiplier range */
    qualityMultiplierMin: 0.5,
    qualityMultiplierMax: 1.5,
  },

  // ============================================================================
  // EVENT PROBABILITIES
  // ============================================================================
  events: {
    /** Base probability per tick for each event type (before modifiers) */
    baseProbabilities: {
      /** Shot attempts (per tick) - calibrated for ~25-30 shots/match */
      shot: 0.15,
      /** 1v1 dribble attempts */
      dribble: 0.30,
      /** Tackle attempts */
      tackle: 0.20,
      /** Fouls - calibrated for ~7-8 fouls/match */
      foul: 0.08,
      /** Corner kicks */
      corner: 0.15,
    },

    /** Event timing multipliers by game period */
    timingMultipliers: {
      earlyGame: { minute: 10, multiplier: 0.8 }, // Minutes 0-10: slower
      normalGame: { minute: 30, multiplier: 1.0 }, // Minutes 11-30: normal
      peakDanger: { minute: 39, multiplier: 1.5 }, // Minute 39: peak
      veryHigh: { minute: 38, multiplier: 1.3 },   // Minute 38: very high
      lateGame: { minute: 30, multiplier: 1.2 },   // Minutes 30+: high
    },

    /** Quality impact on event frequency (minimal to prevent snowballing) */
    qualityImpact: {
      /** Range for quality-based shot frequency adjustment */
      minMultiplier: 0.95,
      maxMultiplier: 1.05,
    },
  },

  // ============================================================================
  // POSSESSION SYSTEM
  // ============================================================================
  possession: {
    /** Chance of possession change per tick */
    changeChance: 0.40,
    /** Momentum impact range on possession (±0.25) */
    momentumImpactDivisor: 200,
    /** Min/max possession chance (to prevent extremes) */
    minChance: 0.1,
    maxChance: 0.95,
  },

  // ============================================================================
  // SHOT QUALITY & CONVERSION
  // ============================================================================
  shooting: {
    /** Base shot quality */
    baseQuality: 0.3,
    /** Attribute weights for shot quality */
    attributeWeights: {
      shooting: 0.30,
      positioning: 0.10,
      composure: 0.10,
      strength: 0.25,
    },
    /** Counter-attack bonus */
    counterAttackBonus: 0.15,
    /** Momentum impact on shot quality (±15%) */
    momentumImpact: 0.30,
    /** Base variance range (±8%) */
    baseVariance: 0.16,
    /** On-target probability (quality-adjusted) */
    onTargetBase: 0.4,
    assistProbability: 0.8,
    /** Min/max shot quality bounds */
    minQuality: 0.1,
    maxQuality: 1.0,
  },

  // ============================================================================
  // DEFENSE SYSTEM
  // ============================================================================
  defense: {
    /** Shot prevention base rate (up to 15% based on resistance) */
    preventionRate: 0.15,
    /** Shot quality reduction (up to 25% based on resistance) */
    qualityReduction: 0.25,
    /** Counter-attack prevention difficulty (30% of normal) */
    counterPreventionMultiplier: 0.3,
    /** Attribute weights for defensive resistance */
    attributeWeights: {
      tackling: 0.35,
      positioning: 0.30,
      pace: 0.20,
      stamina: 0.15,
    },
  },

  // ============================================================================
  // GOALKEEPER SYSTEM
  // ============================================================================
  goalkeeper: {
    /** Save probability calculation */
    baseSaveChance: 0.40,
    /** GK skill weight in save calculation */
    skillWeight: {
      reflexes: 0.35,
      handling: 0.15,
      positioning: 0.25,
      composure: 0.25,
    },

    /** Min/max save probability */
    minSaveChance: 0.20,
    maxSaveChance: 0.80,
  },

  // ============================================================================
  // SET PIECES
  // ============================================================================
  setPieces: {
    /** Corner conversion rates */
    corner: {
      /** Chance corner leads to shot */
      shotChance: 0.60,
      /** Base goal probability from corner */
      goalChance: 0.20,
      // Base shot quality from corner
      baseQuality: 0.3,
      //Quality Reduction from corner
      qualityReduction: 0.2,
      minQuality: 0.1,
      maxQuality: 0.8,
      onTargetChance: 0.35,
    },

    /** Free kick (dangerous foul) */
    freeKick: {
      /** On-target probability */
      onTargetChance: 0.70,
      /** Base goal chance */
      baseGoalChance: 0.45,
      /** Shooter skill weight */
      shooterSkillWeight: 0.20,
      /** GK skill weight */
      gkSkillWeight: 0.15,
      /** Min/max goal probability */
      minGoalChance: 0.25,
      maxGoalChance: 0.75,
    },

    /** Penalty kick (10m - 6th+ foul) */
    penalty: {
      /** Base goal chance (high probability) */
      baseGoalChance: 0.5,
      /** Shooter skill weight */
      shooterSkillWeight: 0.15,
      /** GK skill weight */
      gkSkillWeight: 0.25,
      /** Min/max goal probability */
      minGoalChance: 0.20,
      maxGoalChance: 0.95,
    },
  },

  // ============================================================================
  // FOULS & CARDS
  // ============================================================================
  fouls: {
    /** 6th+ foul triggers 10m penalty */
    accumulatedFoulPenaltyThreshold: 6,
    /** Accumulated fouls reset at half-time */
    resetAtHalfTime: true,

    /** Dangerous foul probability */
    dangerousFoulChance: 0.30,
    /** Late game bonus to dangerous fouls */
    lateGameDangerousBonus: 0.10,

    /** Card probabilities */
    cards: {
      /** Base card probability */
      baseCardChance: 0.15,
      /** Late game bonus */
      lateGameBonus: 0.10,
      /** Close game bonus */
      closeGameBonus: 0.15,
      /** Red card chance (from severe fouls) */
      redCardChance: 0.05,
    },

    /** Foul severity distribution */
    severity: {
      light: 0.70,      // 70% light fouls
      moderate: 0.25,   // 25% moderate (light + moderate = 95%)
      severe: 0.05,     // 5% severe fouls
    },
  },

  // ============================================================================
  // RED CARDS (FUTSAL RULES)
  // ============================================================================
  redCard: {
    /** Ticks until team can return to 5 players (2 minutes = 8 ticks) */
    returnAfterTicks: 8,
    /** Team returns to 5 players when opponent scores */
    returnOnOpponentGoal: true,
    /** Expelled player unavailable for rest of match */
    permanentSuspension: true,
  },

  // ============================================================================
  // 1v1 DRIBBLES
  // ============================================================================
  dribble: {
    /** Base success probability */
    baseSuccessChance: 0.50,
    /** Attacker skill weight */
    attackerSkillWeight: 0.35,
    /** Defender skill weight */
    defenderSkillWeight: 0.25,
    /** Attribute weights */
    attributes: {
      attacker: {
        dribbling: 0.50,
        pace: 0.50,
      },
      defender: {
        tackling: 0.50,
        positioning: 0.50,
      },
    },
    /** Min/max success probability */
    minSuccessChance: 0.25,
    maxSuccessChance: 0.75,
  },

  // ============================================================================
  // MOMENTUM SYSTEM
  // ============================================================================
  momentum: {
    /** Starting momentum (neutral) */
    startingValue: 50,
    /** Natural decay rate toward equilibrium (per minute) */
    decayRate: 0.5,
    /** Equilibrium point */
    equilibrium: 50,

    /** Event momentum changes */
    events: {
      goal: 25,
      shot: 3,
      shotOnTarget: 2,
      shotOffTarget: -1,
      save: 3,
      tackle: 5,
      interception: 4,
      block: 6,
      dribbleSuccess: 3,
      foul: -2,
      corner: 2,
      yellowCard: -5,
      redCard: -20,
    },

    /** Score differential impact */
    scoreDifferentialImpact: 3, // ±3 per goal difference

    /** Fatigue impact on momentum */
    fatigueImpact: {
      weight: 0.15,
      divisor: 100,
    },

    /** Home advantage boost */
    homeAdvantageBoost: 2,
  },

  // ============================================================================
  // FATIGUE SYSTEM
  // ============================================================================
  fatigue: {
    /** Base fatigue per tick (percentage) */
    basePerTick: 0.625, // 100% energy lost over 160 ticks

    /** Match intensity multiplier range */
    intensityImpact: {
      min: 0.7,  // Low intensity (blowout)
      max: 1.3,  // High intensity (close game)
    },

    /** Home/away fatigue difference */
    awayFatiguePenalty: 1.05, // +5% for away team

    /** Bench recovery rate (per tick) */
    benchRecoveryPerTick: 1.25, // Faster recovery than fatigue

    /** Fitness/stamina impact */
    fitnessWeight: 0.005,   // 0.5% per fitness point
    staminaWeight: 0.003,   // 0.3% per stamina point

    /** Fatigue penalty on attributes */
    attributePenalty: {
      /** At 100% energy: 100% effectiveness */
      maxEffectiveness: 1.0,
      /** At 0% energy: 50% effectiveness */
      minEffectiveness: 0.5,
    },
  },

  // ============================================================================
  // SUBSTITUTION SYSTEM
  // ============================================================================
  substitutions: {
    /** Auto-substitution energy threshold */
    defaultEnergyThreshold: 50,
    /** Unlimited subs (futsal rules) */
    unlimited: true,
    /** Don't sub in first/last 2 minutes */
    minMinute: 2,
    maxMinute: 38,
    /** Max substitutions per tick per team */
    maxPerTickPerTeam: 5,
  },

  // ============================================================================
  // PLAYER RATING SYSTEM
  // ============================================================================
  ratings: {
    /** Base rating (neutral performance) */
    baseRating: 6.5,
    /** Performance component weights */
    weights: {
      goals: 1.0,
      assists: 0.7,
      shots: 0.05,
      shotsOnTarget: 0.15,
      missedShots: -0.1,
      saves: 0.15,
      penaltySaves: 0.4,
      goalsConceded: -0.2,
      tackles: 0.1,
      interceptions: 0.1,
      dribblesSuccessful: 0.1,
      fouls: -0.1,
      yellowCard: -0.2,
      redCard: -1.0,
    },
    /** Energy impact on final rating */
    energyImpact: 0.005, // 0.5% per energy point
    /** Rating bounds */
    minRating: 6.0,
    maxRating: 10.0,
  },

  // ============================================================================
  // FLY-GOALKEEPER SYSTEM
  // ============================================================================
  flyGoalkeeper: {
    /** Usage thresholds */
    usage: {
      /** When losing (any time) */
      losing: {
        minMinute: 0,
        scoreDiffThreshold: -1,
      },
      /** When drawing in last 10 minutes */
      late: {
        minMinute: 30,
        scoreDiffThreshold: 0,
      },
      /** Counter opponent's fly-GK */
      counter: {
        enabled: true,
      },
    },

    /** Activation probabilities */
    activationChance: {
      losing: 0.20,     // 20% when losing
      drawing: 0.10,    // 10% when drawing late
      counter: 0.15,    // 15% to counter opponent pressure
    },

    /** Performance modifiers */
    modifiers: {
      possession: 0.5,              // +50% possession
      shotFrequency: 0.20,           // +20% shot frequency
      counterVulnerability: 0.40,    // +40% opponent counter goal probability
      defensiveWeakness: 0.10,      // -10% defensive resistance
    },
  },

  // ============================================================================
  // TEAM QUALITY CALCULATION
  // ============================================================================
  teamQuality: {
    /** Attribute weights */
    weights: {
      currentAbility: 0.9,
      form: 0.10,      // ±10% impact
      morale: 0.05,    // ±5% impact
      fitness: 0.05,   // ±5% impact
    },
    /** Form/morale/fitness divisors */
    divisors: {
      form: 10,
      morale: 10,
      fitness: 100,
    },
    /** Quality bounds */
    minQuality: 30,
    maxQuality: 200,
  },

  // ============================================================================
  // COUNTER-ATTACK SYSTEM
  // ============================================================================
  counterAttack: {
    /** Counter-attack triggers on successful tackles/interceptions */
    triggerChance: 0.15, // 15% chance
    /** Duration in ticks */
    durationTicks: 2,
    /** Shot probability during counter */
    shotProbability: 0.70, // High chance of shot
  },

  // ============================================================================
  // TACTICAL MODIFIERS
  // ============================================================================
  tacticalModifiers: {
    /** Mentality modifiers affect timing, shot frequency, and defense */
    mentality: {
      VeryDefensive: { earlyGame: -0.08, lateGame: 0.05, shotFreq: -0.15, defense: 0.15 },
      Defensive: { earlyGame: -0.04, lateGame: 0.05, shotFreq: -0.12, defense: 0.08 },
      Balanced: { earlyGame: 0, lateGame: 0, shotFreq: 0, defense: 0 },
      Attacking: { earlyGame: 0.04, lateGame: -0.03, shotFreq: 0.15, defense: -0.08 },
      VeryAttacking: { earlyGame: 0.08, lateGame: -0.05, shotFreq: 0.2, defense: -0.25 }
    },
    /** Pressing intensity affects fouls, turnovers, and fatigue */
    pressing: {
      Low: { fouls: -0.15, turnovers: -0.10, fatigue: -0.08 },
      Medium: { fouls: 0, turnovers: 0, fatigue: 0 },
      High: { fouls: 0.20, turnovers: 0.15, fatigue: 0.15 },
      VeryHigh: { fouls: 0.4, turnovers: 0.30, fatigue: 0.35 }
    },
    /** Width affects wing play, central play, and compactness */
    width: {
      Narrow: { wings: -0.25, central: 0.25, compactness: 0.15 },
      Balanced: { wings: 0, central: 0, compactness: 0 },
      Wide: { wings: 0.30, central: -0.20, compactness: -0.15 }
    },
    /** Formation affects offensive and defensive capabilities */
    formation: {
      '4-0': { offensive: 0.70, defensive: 1.30 },
      '3-1': { offensive: 0.85, defensive: 1.15 },
      '2-2': { offensive: 1.00, defensive: 1.00 },
      '1-3': { offensive: 1.15, defensive: 0.85 }
    }
  },

  // ============================================================================
  // PERFORMANCE RATINGS (Additional bonuses/penalties not in main ratings)
  // ============================================================================
  performanceRatings: {
    // Defensive actions
    blockBonus: 0.05,
    tackleWonBonus: 0.10,
    tackleLostPenalty: -0.08,
    
    // Dribbling
    dribbleSuccessBonus: 0.10,
    dribbleFailPenalty: -0.15,
    dribbleDefenseBonus: 0.10,
    dribbleDefensePenalty: -0.15,
    
    // 1v1 situations
    oneVsOneWinBonus: 0.08,
    oneVsOneLosePenalty: -0.05,
    oneVsOneDefenseBonus: 0.10,
    oneVsOneDefensePenalty: -0.08,
  },

  // ============================================================================
  // ATTRIBUTE THRESHOLDS
  // ============================================================================
  attributeThresholds: {
    low: 10,
    medium: 50,
    high: 70,
    elite: 85,
  },

  // ============================================================================
  // PROBABILITY CLAMPS
  // ============================================================================
  probabilityClamps: {
    min: 0.0,
    max: 1.0,
    minGoalChance: 0.05,
    maxGoalChance: 0.95,
  },

} as const;

/**
 * Type-safe configuration access
 */
export type MatchEngineConfigType = typeof MatchEngineConfig;

/**
 * Helper to validate configuration values are reasonable
 */
export function validateMatchEngineConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate probabilities are between 0 and 1
  const validateProb = (value: number, name: string) => {
    if (value < 0 || value > 1) {
      errors.push(`${name} must be between 0 and 1, got ${value}`);
    }
  };

  validateProb(MatchEngineConfig.possession.changeChance, 'possession.changeChance');
  validateProb(MatchEngineConfig.shooting.onTargetBase, 'shooting.onTargetBase');
  validateProb(MatchEngineConfig.goalkeeper.baseSaveChance, 'goalkeeper.baseSaveChance');

  // Validate ranges
  if (MatchEngineConfig.expectedGoals.qualityMultiplierMin >= MatchEngineConfig.expectedGoals.qualityMultiplierMax) {
    errors.push('qualityMultiplierMin must be less than qualityMultiplierMax');
  }

  if (MatchEngineConfig.ratings.minRating >= MatchEngineConfig.ratings.maxRating) {
    errors.push('minRating must be less than maxRating');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
