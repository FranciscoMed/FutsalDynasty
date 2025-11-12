import type { PlayerTrait, PlayerWithTraits } from '../shared/schema';

/**
 * Phase 5: Player Traits System
 * 
 * CRITICAL DESIGN PRINCIPLE:
 * - Most traits affect WHO gets selected for actions (1.3x-2.0x selection multipliers)
 * - Traits DO NOT affect success rates (attributes determine success)
 * - EXCEPTIONS: Mental traits (nerveless/choker) and GK traits affect success rates
 * 
 * Example: 
 * - "finisher" trait makes player 1.6x more likely to be selected for finishing chances
 * - Once selected, all players use identical success formula based on shooting attribute
 * - nerveless trait is an EXCEPTION: +15% success in pressure situations
 */

export class TraitEngine {
  /**
   * Trait selection multipliers
   * Values >1.0 increase probability of being selected for relevant actions
   * Most traits: 1.3x-2.0x more likely to perform their specialty
   */
  private readonly traitSelectionWeights: Record<PlayerTrait, number> = {
    // Offensive traits (selection multipliers)
    attempts1v1: 1.5,               // 1.5x likely for 1v1 dribbles
    finisher: 1.6,                  // 1.6x likely for finishing chances
    attemptsLongShots: 1.4,         // 1.4x likely for long shots
    playsWithFlair: 1.3,            // 1.3x likely for skill moves
    beatPlayerRepeatedly: 1.4,      // 1.4x likely for repeat dribbles
    triesKillerBalls: 1.5,          // 1.5x likely for through balls
    
    // Playmaking traits (selection multipliers)
    playmaker: 1.4,                 // 1.4x likely for creative play
    does1_2: 1.4,                   // 1.4x likely for one-twos
    looksForPass: 1.4,              // 1.4x likely to pass vs shoot
    
    // Defensive traits (selection multipliers)
    hardTackler: 1.5,               // 1.5x likely to attempt tackles
    anticipates: 1.4,               // 1.4x likely for interceptions
    marksOpponentTightly: 1.5,      // 1.5x likely for tight marking
    
    // Mental/Performance traits (DON'T affect selection, affect success rates)
    nerveless: 1.0,                 // No selection change (affects success in pressure)
    choker: 1.0,                    // No selection change (affects success in pressure)
    classy: 1.0,                    // No selection change (reduces mistakes)
    bigMatchPlayer: 1.0,            // No selection change (performs in big matches)
    consistentPerformer: 1.0,       // No selection change (reduces variance)
    inconsistent: 1.0,              // No selection change (increases variance)
    
    // Teamwork traits (selection multipliers)
    selfish: 1.4,                   // 1.4x likely to shoot vs pass
    leader: 1.0,                    // No selection change (team morale boost)
    communicator: 1.0,              // No selection change (team coordination)
    
    // Goalkeeper traits (DON'T affect selection for saves, affect success rates)
    isFlyGoalkeeper: 2.0           // 2.0x likely to come out as field player
  };

  /**
   * Map action types to relevant traits
   * When an action occurs, only players with relevant traits get selection bonuses
   */
  private readonly traitActionRelevance: Record<string, PlayerTrait[]> = {
    // Offensive actions
    '1v1': ['attempts1v1', 'beatPlayerRepeatedly', 'playsWithFlair'],
    'finish': ['finisher'],
    'longShot': ['attemptsLongShots'],
    'skillMove': ['playsWithFlair'],
    'creativePass': ['playmaker'],
    'oneTwo': ['does1_2'],
    'teamPlay': ['playmaker', 'looksForPass'],
    
    // Choice between pass/shoot
    'passVsShoot_pass': ['looksForPass'],
    'passVsShoot_shoot': ['selfish', 'finisher'],
    
    // Defensive actions
    'tackle': ['hardTackler'],
    'intercept': ['anticipates'],
    'mark': ['marksOpponentTightly'],
    
    // Goalkeeper actions
    'gk_comeOut': ['isFlyGoalkeeper'],
  };

  /**
   * Select which player performs an action based on traits
   * ONLY affects WHO gets selected, NOT success rate (except mental/GK traits)
   * 
   * @param action - The type of action being performed
   * @param availablePlayers - List of players who could perform the action
   * @returns The selected player (weighted by trait relevance)
   */
  selectPlayerForAction(
    action: string,
    availablePlayers: PlayerWithTraits[]
  ): PlayerWithTraits {
    if (availablePlayers.length === 0) {
      throw new Error('No players available for action');
    }

    if (availablePlayers.length === 1) {
      return availablePlayers[0];
    }

    // Calculate selection weight for each player
    const weighted = availablePlayers.map(player => {
      let weight = 1.0; // Base weight

      // Check if player has traits relevant to this action
      const relevantTraits = this.traitActionRelevance[action] || [];
      player.traits.forEach(trait => {
        if (relevantTraits.includes(trait)) {
          weight *= this.traitSelectionWeights[trait];
        }
      });

      return { player, weight };
    });

    // Select player using weighted random selection
    return this.selectWeighted(weighted);
  }

  /**
   * Weighted random selection
   */
  private selectWeighted(
    weighted: Array<{ player: PlayerWithTraits; weight: number }>
  ): PlayerWithTraits {
    const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);

    if (totalWeight === 0) {
      // All weights are 0, select randomly
      return weighted[Math.floor(Math.random() * weighted.length)].player;
    }

    let random = Math.random() * totalWeight;
    for (const item of weighted) {
      random -= item.weight;
      if (random <= 0) {
        return item.player;
      }
    }

    // Fallback (should never reach here)
    return weighted[weighted.length - 1].player;
  }

  /**
   * Apply mental trait modifiers to success probability
   * EXCEPTION: Mental traits (nerveless/choker) affect success rates
   * 
   * @param baseSuccess - Base success probability (0-1)
   * @param player - Player performing the action
   * @param isPressure - Whether this is a high-pressure situation (late game, close score)
   * @param isPenalty - Whether this is a penalty kick
   * @returns Modified success probability
   */
  applyMentalTraitModifiers(
    baseSuccess: number,
    player: PlayerWithTraits,
    isPressure: boolean = false,
    isPenalty: boolean = false
  ): number {
    let modifier = 1.0;

    // Nerveless trait: +15% in pressure, +20% on penalties
    if (player.traits.includes('nerveless')) {
      if (isPenalty) {
        modifier += 0.20; // +20% penalty conversion
      } else if (isPressure) {
        modifier += 0.15; // +15% quality in pressure
      }
    }

    // Choker trait: -25% in pressure, -30% on penalties
    if (player.traits.includes('choker')) {
      if (isPenalty) {
        modifier -= 0.30; // -30% penalty conversion
      } else if (isPressure) {
        modifier -= 0.25; // -25% quality in pressure
      }
    }

    // Classy trait: +8% overall (fewer mistakes)
    if (player.traits.includes('classy')) {
      modifier += 0.08;
    }

    // Big match player: +10% in important matches (to be determined by context)
    // This would require additional context about match importance
    // For now, skipping this implementation

    return Math.max(0.05, Math.min(0.95, baseSuccess * modifier));
  }

  /**
   * Apply goalkeeper trait modifiers to save probability
   * EXCEPTION: GK traits affect save success rates
   * 
   * @param baseSave - Base save probability (0-1)
   * @param goalkeeper - Goalkeeper attempting save
   * @param shotStrength - Shot strength (0-1, 1 = strongest)
   * @param isOneVsOne - Whether this is a 1v1 situation
   * @param isAerial - Whether this is an aerial/cross situation
   * @returns Modified save probability
   */
  applyGoalkeeperTraitModifiers(
    baseSave: number,
    goalkeeper: PlayerWithTraits,
    shotStrength: number = 0.5,
    isOneVsOne: boolean = false,
    isAerial: boolean = false
  ): number {
    let modifier = 1.0;


    // Note: rushesShotStopper trait from plan is not in current schema
    // If added later, implement: +10% weak shots, -5% strong shots, +15% 1v1

    return Math.max(0.05, Math.min(0.95, baseSave * modifier));
  }

  /**
   * Check if pressure situation exists
   * Pressure = late game (min 35-40) with close score
   * 
   * @param situation - Either legacy params OR situation object
   * @returns Whether this is a pressure situation
   */
  isPressureSituation(
    situation: number | { minute: number; score: { home: number; away: number } },
    scoreDiff?: number
  ): boolean {
    // Handle legacy call format (minute, scoreDiff)
    if (typeof situation === 'number') {
      const minute = situation;
      const diff = scoreDiff ?? 0;
      return minute >= 35 && diff <= 1;
    }
    
    // Handle new situation object format
    if (situation.minute < 35) return false;
    const diff = Math.abs(situation.score.home - situation.score.away);
    return diff <= 1;
  }

  /**
   * Apply team trait synergies
   * Positive: Multiple teamPlayers, multiple playmakers
   * Negative: Multiple selfish players
   * 
   * @param players - Team lineup
   * @returns Synergy modifier (0.9-1.1 scale)
   */
  calculateTeamTraitSynergies(players: PlayerWithTraits[]): number {
    const traitCounts = this.countTraits(players);
    let modifier = 1.0;

    // Positive synergies
    if (traitCounts.playmaker >= 2) {
      modifier += 0.08; // +8% with 2+ playmakers
    }

    if (traitCounts.teamPlayer >= 3) {
      modifier += 0.10; // +10% with 3+ team players
    }

    // Negative synergies
    if (traitCounts.selfish >= 2) {
      modifier -= 0.08 * (traitCounts.selfish - 1); // -8% per extra selfish player
    }

    if (traitCounts.playmaker >= 1 && traitCounts.selfish >= 1) {
      modifier -= 0.05; // -5% when playmaker + selfish conflict
    }

    return Math.max(0.8, Math.min(1.2, modifier));
  }

  /**
   * Count trait occurrences in team
   */
  private countTraits(players: PlayerWithTraits[]): Record<string, number> {
    const counts: Record<string, number> = {};

    players.forEach(player => {
      player.traits.forEach(trait => {
        counts[trait] = (counts[trait] || 0) + 1;
      });
    });

    return counts;
  }

  /**
   * Get trait description for UI display
   */
  getTraitDescription(trait: PlayerTrait): string {
    const descriptions: Record<PlayerTrait, string> = {
      // Offensive
      attempts1v1: 'More likely to attempt 1v1 dribbles',
      finisher: 'More likely to be in finishing positions',
      attemptsLongShots: 'More likely to shoot from distance',
      playsWithFlair: 'More likely to attempt skill moves',
      beatPlayerRepeatedly: 'More likely to dribble past same opponent',
      triesKillerBalls: 'More likely to attempt through balls',

      // Playmaking
      playmaker: 'More likely for creative play',
      does1_2: 'More likely for one-two combinations',
      looksForPass: 'More likely to pass than shoot',

      // Defensive
      hardTackler: 'More likely to attempt tackles',
      anticipates: 'More likely to intercept passes',
      marksOpponentTightly: 'More likely to mark closely',
      
      // Mental (exceptions - affect success)
      nerveless: 'Performs better under pressure',
      choker: 'Performs worse under pressure',
      classy: 'Fewer mistakes overall',
      bigMatchPlayer: 'Performs better in important matches',
      consistentPerformer: 'Reliable performances',
      inconsistent: 'Unpredictable performances',
      
      // Teamwork
      selfish: 'More likely to shoot than pass',
      leader: 'Boosts team morale',
      communicator: 'Improves team coordination',
      
      // Goalkeeper
      isFlyGoalkeeper: 'Can come out as field player late game',
    };

    return descriptions[trait] || 'Unknown trait';
  }

  // ============================================================================
  // PHASE 5.3: MENTAL TRAIT PERFORMANCE MODIFIERS
  // ============================================================================
  // These are EXCEPTIONS to the "selection-only" rule. Mental traits affect
  // success rates based on match context (pressure situations, match importance)

  /**
   * Get mental trait performance modifier for current situation
   * @param player - Player to check traits for
   * @param situation - Match situation context
   * @returns Multiplier to apply to success calculations (0.5-1.5 range)
   */
  getMentalTraitModifier(
    player: PlayerWithTraits,
    situation: {
      minute: number;
      score: { home: number; away: number };
      isImportantMatch?: boolean;
      actionType: 'shot' | 'pass' | 'penalty' | 'freeKick' | 'save';
      team: 'home' | 'away';
    }
  ): number {
    let modifier = 1.0;
    
    // Check for pressure situation (late game + close score)
    const isPressure = this.isPressureSituation(situation);
    const isLateGame = situation.minute >= 35;
    
    // nerveless: Performs better under pressure
    if (player.traits.includes('nerveless')) {
      if (isLateGame) {
        modifier += 0.15; // +15% in late game
      }
      if (['penalty', 'freeKick'].includes(situation.actionType)) {
        modifier += 0.20; // +20% on set pieces
      }
      if (situation.isImportantMatch) {
        modifier += 0.10; // +10% in important matches
      }
    }
    
    // choker: Performs worse under pressure
    if (player.traits.includes('choker')) {
      if (isLateGame) {
        modifier -= 0.25; // -25% in late game
      }
      if (['penalty', 'freeKick'].includes(situation.actionType)) {
        modifier -= 0.30; // -30% on set pieces
      }
      if (situation.isImportantMatch) {
        modifier -= 0.15; // -15% in important matches
      }
    }
    
    // classy: Better execution (especially passing)
    if (player.traits.includes('classy')) {
      if (situation.actionType === 'pass') {
        modifier += 0.08; // +8% pass accuracy
      } else {
        modifier += 0.04; // +4% for other actions
      }
    }
    
    // bigMatchPlayer: Performs better in important matches
    if (player.traits.includes('bigMatchPlayer') && situation.isImportantMatch) {
      modifier += 0.10; // +10% in important matches
    }
    
    // Ensure modifier stays in reasonable range
    return Math.max(0.5, Math.min(1.5, modifier));
  }

  /**
   * Get team-wide leader boost
   * Leaders improve team morale and performance
   * @param lineup - Team lineup to check for leaders
   * @returns Team morale boost (0-0.08)
   */
  getLeaderBoost(lineup: PlayerWithTraits[]): number {
    const hasLeader = lineup.some(p => p.traits.includes('leader'));
    if (!hasLeader) return 0;
    
    // +8% team morale when leader present
    return 0.08;
  }

  /**
   * Get comeback boost when team is losing
   * Leaders inspire team to fight back
   * @param lineup - Team lineup to check for leaders
   * @param score - Current score
   * @param team - Which team (home/away)
   * @returns Comeback boost (0-0.15)
   */
  getComebackBoost(
    lineup: PlayerWithTraits[],
    score: { home: number; away: number },
    team: 'home' | 'away'
  ): number {
    const hasLeader = lineup.some(p => p.traits.includes('leader'));
    if (!hasLeader) return 0;
    
    // Check if team is losing
    const isLosing = team === 'home' 
      ? score.home < score.away 
      : score.away < score.home;
    
    if (!isLosing) return 0;
    
    // +15% when losing with leader
    return 0.15;
  }

  /**
   * Get variance modifier for consistent/inconsistent players
   * Affects how much performance fluctuates match-to-match
   * @param player - Player to check traits for
   * @returns Variance multiplier (0.5 = more consistent, 2.0 = more volatile)
   */
  getVarianceModifier(player: PlayerWithTraits): number {
    if (player.traits.includes('consistentPerformer')) {
      return 0.5; // -50% variance (more reliable)
    }
    if (player.traits.includes('inconsistent')) {
      return 2.0; // +100% variance (more volatile)
    }
    return 1.0; // Normal variance
  }
}
