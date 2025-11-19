import type { IStorage } from "./storage";
import {
  type Match,
  type MatchEvent,
  type MatchStats,
  type Player,
  type Team,
  type PlayerWithTraits,
  type LiveMatchState,
  type OnCourtPlayer,
  type TacticalSetup,
  gameStates
} from "@shared/schema";
import { TraitEngine } from "./traitsEngine";
import { StatisticsEngine } from "./statisticsEngine";

// ============================================================================
// ENHANCED MATCH ENGINE
// ============================================================================

import { MatchEngineConfig as CONFIG } from './matchEngineConfig';
import { config } from "process";

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

export class MatchEngine {
  private storage: IStorage;
  private traitEngine: TraitEngine; // Trait-based player selection
  private statisticsEngine: StatisticsEngine; // Statistics tracking

  // Match state
  private homeTeamQuality: number = 0;
  private awayTeamQuality: number = 0;
  private homeExpectedGoals: number = 0;
  private awayExpectedGoals: number = 0;

  // Real-time match state
  private currentState: LiveMatchState | null = null;
  private isRealTimeMatch: boolean = false;

  // Debug counters
  private homePossCounter: number = 0;
  private awayPossCounter: number = 0;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.traitEngine = new TraitEngine(); // Initialize trait engine
    this.statisticsEngine = new StatisticsEngine(storage); // Initialize statistics engine
  }

  // ============================================================================
  // REAL-TIME MATCH SUPPORT
  // ============================================================================

  /**
   * Initialize a match for real-time streaming
   * Returns the initial match state
   */
  async initializeRealTimeMatch(
    saveGameId: number,
    userId: number,
    matchId: number
  ): Promise<LiveMatchState> {
    const match = await this.storage.getMatch(saveGameId, userId, matchId);
    if (!match) {
      throw new Error("Match not found");
    }

    if (match.played) {
      throw new Error("Match already played");
    }

    // Load teams and players
    const homeTeam = await this.storage.getTeam(saveGameId, userId, match.homeTeamId);
    const awayTeam = await this.storage.getTeam(saveGameId, userId, match.awayTeamId);

    if (!homeTeam || !awayTeam) {
      throw new Error("Teams not found");
    }

    const homePlayers = await this.storage.getPlayersByTeam(saveGameId, userId, match.homeTeamId);
    const awayPlayers = await this.storage.getPlayersByTeam(saveGameId, userId, match.awayTeamId);

    // Initialize match state
    const state = this.initializeMatch(
      homeTeam,
      homePlayers,
      awayTeam,
      awayPlayers,
      match.id,
      match.competitionId,
      saveGameId,
      userId
    );

    this.currentState = state;
    this.isRealTimeMatch = true;

    return state;
  }

  /**
   * Process a single tick for real-time matches
   * Must call initializeRealTimeMatch first
   */
  processTick(): void {
    if (!this.currentState || !this.isRealTimeMatch) {
      throw new Error("Real-time match not initialized. Call initializeRealTimeMatch first.");
    }

    this.simulateTick(this.currentState);
  }

  /**
   * Get current match state for real-time matches
   */
  getState(): LiveMatchState {
    if (!this.currentState) {
      throw new Error("Match not initialized");
    }
    return this.currentState;
  }

  /**
   * Apply a substitution during real-time match
   */
  applySubstitution(
    team: 'home' | 'away',
    playerOutId: number,
    playerInId: number
  ): void {
    if (!this.currentState || !this.isRealTimeMatch) {
      throw new Error("Real-time match not initialized");
    }

    const lineup = team === 'home' ? this.currentState.homeLineup : this.currentState.awayLineup;
    const bench = team === 'home'
      ? this.currentState.substitutions.homeBench
      : this.currentState.substitutions.awayBench;
    const suspendedPlayers = this.currentState.suspendedPlayers[team];

    const playerOut = lineup.find(p => p.player.id === playerOutId);
    const playerIn = bench.find(p => p.id === playerInId);

    if (!playerOut) {
      throw new Error(`Player ${playerOutId} not in lineup`);
    }
    if (!playerIn) {
      throw new Error(`Player ${playerInId} not on bench`);
    }

    // Check if player is suspended (sent off with red card)
    if (suspendedPlayers.includes(playerInId)) {
      throw new Error(`Player ${playerInId} is suspended and cannot be substituted in`);
    }

    // Perform the substitution (using existing makeSubstitution logic)
    this.makeSubstitution(this.currentState, team, playerOut);
  }

  /**
   * Change formation during real-time match
   */
  changeFormation(team: 'home' | 'away', formation: string): void {
    if (!this.currentState || !this.isRealTimeMatch) {
      throw new Error("Real-time match not initialized");
    }

    const teamId = team === 'home' ? this.currentState.homeTeamId : this.currentState.awayTeamId;

    // Formation is stored in team data, not tactics
    // This would require updating the team's formation setting
    // For now, log the change as a substitution event
    this.currentState.events.push({
      minute: this.currentState.currentMinute,
      type: 'substitution',
      teamId,
      description: `Formation changed to ${formation}`,
      playerId: 0,
      playerName: 'Manager'
    });
  }

  /**
   * Change tactics during real-time match
   */
  changeTactics(
    team: 'home' | 'away',
    tactics: Partial<TacticalSetup>
  ): void {
    if (!this.currentState || !this.isRealTimeMatch) {
      throw new Error("Real-time match not initialized");
    }

    const teamId = team === 'home' ? this.currentState.homeTeamId : this.currentState.awayTeamId;
    const teamTactics = team === 'home' ? this.currentState.homeTactics : this.currentState.awayTactics;

    if (tactics.mentality) teamTactics.mentality = tactics.mentality;
    if (tactics.pressingIntensity) teamTactics.pressingIntensity = tactics.pressingIntensity;
    if (tactics.width) teamTactics.width = tactics.width;
    if (tactics.flyGoalkeeper) teamTactics.flyGoalkeeper = tactics.flyGoalkeeper;

    // Log the change
    const changes = Object.keys(tactics).join(', ');
    this.currentState.events.push({
      minute: this.currentState.currentMinute,
      type: 'substitution',
      teamId,
      description: `Tactics changed: ${changes}`,
      playerId: 0,
      playerName: 'Manager'
    });
  }

  /**
   * Finalize real-time match and save results
   */
  async finalizeRealTimeMatch(): Promise<Match> {
    if (!this.currentState || !this.isRealTimeMatch) {
      throw new Error("Real-time match not initialized");
    }

    const state = this.currentState;

    // Calculate final player ratings
    const playerRatings: Record<number, number> = {};

    state.homeLineup.forEach(p => {
      playerRatings[p.player.id] = this.calculatePlayerRating(p, state);
    });
    state.awayLineup.forEach(p => {
      playerRatings[p.player.id] = this.calculatePlayerRating(p, state);
    });

    // Get all players for neutral ratings
    const homePlayers = await this.storage.getPlayersByTeam(state.saveGameId, state.userId, state.homeLineup[0].player.teamId);
    const awayPlayers = await this.storage.getPlayersByTeam(state.saveGameId, state.userId, state.awayLineup[0].player.teamId);

    homePlayers.forEach(p => {
      if (!playerRatings[p.id]) {
        playerRatings[p.id] = 6.0;
      }
    });
    awayPlayers.forEach(p => {
      if (!playerRatings[p.id]) {
        playerRatings[p.id] = 6.0;
      }
    });

    // Convert statistics to MatchStats format
    const homeStats: MatchStats = {
      possession: state.statistics.possession.home,
      shots: state.statistics.shots.home,
      shotsOnTarget: state.statistics.shotsOnTarget.home,
      passes: Math.floor(state.statistics.possession.home * 3),
      passAccuracy: 70 + Math.floor(Math.random() * 20),
      tackles: state.statistics.tackles.home,
      interceptions: state.statistics.interceptions.home,
      blocks: state.statistics.blocks.home,
      dribblesSuccessful: state.statistics.dribblesSuccessful.home,
      dribblesUnsuccessful: state.statistics.dribblesUnsuccessful.home,
      fouls: state.statistics.fouls.home,
      corners: state.statistics.corners.home,
      saves: state.statistics.saves.home
    };

    const awayStats: MatchStats = {
      possession: state.statistics.possession.away,
      shots: state.statistics.shots.away,
      shotsOnTarget: state.statistics.shotsOnTarget.away,
      passes: Math.floor(state.statistics.possession.away * 3),
      passAccuracy: 70 + Math.floor(Math.random() * 20),
      tackles: state.statistics.tackles.away,
      interceptions: state.statistics.interceptions.away,
      blocks: state.statistics.blocks.away,
      dribblesSuccessful: state.statistics.dribblesSuccessful.away,
      dribblesUnsuccessful: state.statistics.dribblesUnsuccessful.away,
      fouls: state.statistics.fouls.away,
      corners: state.statistics.corners.away,
      saves: state.statistics.saves.away
    };

    // Save match results
    const updatedMatch = await this.storage.updateMatch(state.saveGameId, state.userId, state.matchId, {
      homeScore: state.score.home,
      awayScore: state.score.away,
      played: true,
      events: state.events,
      homeStats,
      awayStats,
      playerRatings,
    });

    // Update player statistics
    if (updatedMatch) {
      await this.statisticsEngine.updatePlayerStatistics(state.saveGameId, state.userId, updatedMatch);
    }

    // Clean up real-time state
    this.currentState = null;
    this.isRealTimeMatch = false;

    return updatedMatch!;
  }

  // ============================================================================
  // END REAL-TIME MATCH SUPPORT
  // ============================================================================

  /**
   * Main entry point for match simulation
   * Supports both instant simulation and real-time simulation (future)
   */
  async simulateMatch(
    saveGameId: number,
    userId: number,
    matchId: number,
    realTime: boolean = false
  ): Promise<Match> {
    const match = await this.storage.getMatch(saveGameId, userId, matchId);
    if (!match) {
      throw new Error("Match not found");
    }

    if (match.played) {
      return match;
    }

    // Load teams and players
    const homeTeam = await this.storage.getTeam(saveGameId, userId, match.homeTeamId);
    const awayTeam = await this.storage.getTeam(saveGameId, userId, match.awayTeamId);

    if (!homeTeam || !awayTeam) {
      throw new Error("Teams not found");
    }

    const homePlayers = await this.storage.getPlayersByTeam(saveGameId, userId, match.homeTeamId);
    const awayPlayers = await this.storage.getPlayersByTeam(saveGameId, userId, match.awayTeamId);

    // Initialize match state
    const state = this.initializeMatch(
      homeTeam,
      homePlayers,
      awayTeam,
      awayPlayers,
      match.id,
      match.competitionId,
      saveGameId,
      userId
    );

    // Run full simulation (160 ticks)
    for (let tick = 0; tick < 160; tick++) {
      this.simulateTick(state);
    }

    // Calculate final player ratings
    const playerRatings: Record<number, number> = {};

    // Rate players who actually played
    state.homeLineup.forEach(p => {
      playerRatings[p.player.id] = this.calculatePlayerRating(p, state);
    });
    state.awayLineup.forEach(p => {
      playerRatings[p.player.id] = this.calculatePlayerRating(p, state);
    });

    // Rate players who didn't play (substitutes) with a neutral rating
    homePlayers.forEach(p => {
      if (!playerRatings[p.id]) {
        playerRatings[p.id] = 6.0; // Neutral rating for non-players
      }
    });
    awayPlayers.forEach(p => {
      if (!playerRatings[p.id]) {
        playerRatings[p.id] = 6.0; // Neutral rating for non-players
      }
    });

    // Convert statistics to MatchStats format
    const homeStats: MatchStats = {
      possession: state.statistics.possession.home,
      shots: state.statistics.shots.home,
      shotsOnTarget: state.statistics.shotsOnTarget.home,
      passes: Math.floor(state.statistics.possession.home * 3), // Estimate
      passAccuracy: 70 + Math.floor(Math.random() * 20),
      tackles: state.statistics.tackles.home,
      interceptions: state.statistics.interceptions.home,
      blocks: state.statistics.blocks.home,
      dribblesSuccessful: state.statistics.dribblesSuccessful.home,
      dribblesUnsuccessful: state.statistics.dribblesUnsuccessful.home,
      fouls: state.statistics.fouls.home,
      corners: state.statistics.corners.home,
      saves: state.statistics.saves.home
    };

    const awayStats: MatchStats = {
      possession: state.statistics.possession.away,
      shots: state.statistics.shots.away,
      shotsOnTarget: state.statistics.shotsOnTarget.away,
      passes: Math.floor(state.statistics.possession.away * 3), // Estimate
      passAccuracy: 70 + Math.floor(Math.random() * 20),
      tackles: state.statistics.tackles.away,
      interceptions: state.statistics.interceptions.away,
      blocks: state.statistics.blocks.away,
      dribblesSuccessful: state.statistics.dribblesSuccessful.away,
      dribblesUnsuccessful: state.statistics.dribblesUnsuccessful.away,
      fouls: state.statistics.fouls.away,
      corners: state.statistics.corners.away,
      saves: state.statistics.saves.away
    };

    // Save match results
    const updatedMatch = await this.storage.updateMatch(saveGameId, userId, matchId, {
      homeScore: state.score.home,
      awayScore: state.score.away,
      played: true,
      events: state.events,
      homeStats,
      awayStats,
      playerRatings,
    });

    // Update player statistics
    if (updatedMatch) {
      await this.statisticsEngine.updatePlayerStatistics(saveGameId, userId, updatedMatch);
    }

    return updatedMatch!;
  }

  /**
   * Initialize match state with teams, players, and tactical setup
   */
  private initializeMatch(
    homeTeam: Team,
    homePlayers: Player[],
    awayTeam: Team,
    awayPlayers: Player[],
    matchId: number,
    competitionId: number,
    saveGameId: number,
    userId: number
  ): LiveMatchState {
    // Calculate team qualities
    this.homeTeamQuality = this.calculateTeamQuality(homePlayers);
    this.awayTeamQuality = this.calculateTeamQuality(awayPlayers);
    this.homePossCounter = 0;
    this.awayPossCounter = 0;
    // Calculate expected goals
    const [homeXG, awayXG] = this.calculateExpectedGoals(
      this.homeTeamQuality,
      this.awayTeamQuality
    );
    this.homeExpectedGoals = homeXG;
    this.awayExpectedGoals = awayXG;

    // Convert players to match-ready format (top 5 are starters, rest are bench)
    const homeLineup = this.createLineup(homePlayers.slice(0, 5));
    const awayLineup = this.createLineup(awayPlayers.slice(0, 5));

    // Create bench players (all remaining players)
    // Create bench rosters (substitute players)
    const homeBench: PlayerWithTraits[] = homePlayers.slice(5).map(p => ({
      ...p,
      traits: p.traits || [],
      energy: 100,
      minutesPlayedThisMatch: 0
    }));
    const awayBench: PlayerWithTraits[] = awayPlayers.slice(5).map(p => ({
      ...p,
      traits: p.traits || [],
      energy: 100,
      minutesPlayedThisMatch: 0
    }));

    // Initialize match state
    const state: LiveMatchState = {
      matchId,
      saveGameId,
      userId,
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      competitionId,
      currentMinute: 0,
      currentTick: 0,
      score: { home: 0, away: 0 },
      possession: Math.random() < 0.5 ? 'home' : 'away', // Random kickoff
      momentum: {
        value: 50, // Neutral
        trend: 'neutral',
        lastUpdate: 0
      },
      counterAttack: {
        active: false,
        team: null,
        ticksRemaining: 0
      },
      lastEvent: null,
      // Substitution tracking
      substitutions: {
        used: { home: 0, away: 0 },
        homeBench,
        awayBench,
        autoSubEnabled: { home: true, away: true }, // Auto-subs on by default
        energyThreshold: CONFIG.substitutions.defaultEnergyThreshold,
      },
      statistics: {
        possession: { home: 0, away: 0 },
        shots: { home: 0, away: 0 },
        shotsOnTarget: { home: 0, away: 0 },
        fouls: { home: 0, away: 0 },
        corners: { home: 0, away: 0 },
        saves: { home: 0, away: 0 },
        tackles: { home: 0, away: 0 },
        interceptions: { home: 0, away: 0 },
        blocks: { home: 0, away: 0 },
        dribblesSuccessful: { home: 0, away: 0 },
        dribblesUnsuccessful: { home: 0, away: 0 }
      },
      accumulatedFouls: { home: 0, away: 0 },
      yellowCards: { home: [], away: [] },
      redCards: { home: [], away: [] },
      suspendedPlayers: { home: [], away: [] },
      events: [],
      homeLineup,
      awayLineup,
      // Load tactical setups from team data, default to balanced if not set
      // Support both new format (tactics.instructions) and old format (tactics.mentality)
      homeTactics: {
        mentality: homeTeam.tactics?.instructions?.mentality || homeTeam.tactics?.mentality || 'Balanced',
        pressingIntensity: homeTeam.tactics?.instructions?.pressingIntensity || homeTeam.tactics?.pressingIntensity || 'Medium',
        width: homeTeam.tactics?.width || 'Balanced',
        flyGoalkeeper: homeTeam.tactics?.instructions?.flyGoalkeeper
          ? { usage: homeTeam.tactics.instructions.flyGoalkeeper }
          : homeTeam.tactics?.flyGoalkeeper
      },
      awayTactics: {
        mentality: awayTeam.tactics?.instructions?.mentality || awayTeam.tactics?.mentality || 'Balanced',
        pressingIntensity: awayTeam.tactics?.instructions?.pressingIntensity || awayTeam.tactics?.pressingIntensity || 'Medium',
        width: awayTeam.tactics?.width || 'Balanced',
        flyGoalkeeper: awayTeam.tactics?.instructions?.flyGoalkeeper
          ? { usage: awayTeam.tactics.instructions.flyGoalkeeper }
          : awayTeam.tactics?.flyGoalkeeper
      },
      homeTeamQuality: this.homeTeamQuality,
      awayTeamQuality: this.awayTeamQuality,
      homeExpectedGoals: homeXG,
      awayExpectedGoals: awayXG,
      isPaused: false,
      speed: 1
    };

    // // Debug: Log tactics initialization
    // console.log('[MatchEngine] Tactics Initialization:', {
    //   homeTeamId: homeTeam.id,
    //   homeTeamName: homeTeam.name,
    //   homeTeamTactics: homeTeam.tactics,
    //   awayTeamId: awayTeam.id,
    //   awayTeamName: awayTeam.name,
    //   awayTeamTactics: awayTeam.tactics,
    // });

    return state;
  }

  /**
   * Calculate overall team quality (0-100 scale)
   */
  private calculateTeamQuality(players: Player[]): number {
    if (players.length === 0) return 50;

    // Average all key attributes
    const avgCurrentAbility = players.reduce((sum, p) => sum + p.currentAbility, 0) / players.length;
    const avgForm = players.reduce((sum, p) => sum + p.form, 0) / players.length;
    const avgMorale = players.reduce((sum, p) => sum + p.morale, 0) / players.length;
    const avgFitness = players.reduce((sum, p) => sum + p.fitness, 0) / players.length;

    // Weighted calculation
    let quality = avgCurrentAbility;
    quality *= (1 + (avgForm / 10) * 0.1);       // Form: ±10%
    quality *= (1 + (avgMorale / 10) * 0.05);    // Morale: ±5%
    quality *= (1 + (avgFitness / 100) * 0.05);  // Fitness: ±5%

    return Math.max(30, Math.min(100, quality));
  }

  /**
   * Apply mental trait team modifiers (leader, comeback boost)
   * Mental traits can boost entire team performance
   */
  private applyTeamMentalModifiers(lineup: OnCourtPlayer[], team: 'home' | 'away', state: LiveMatchState): number {
    let modifier = 1.0;

    // Leader boost: +8% team morale if leader present
    const players = lineup.map(p => p.player);
    const leaderBoost = this.traitEngine.getLeaderBoost(players);
    modifier += leaderBoost;

    // Comeback boost: +15% when losing with leader
    const comebackBoost = this.traitEngine.getComebackBoost(players, state.score, team);
    modifier += comebackBoost;

    return modifier;
  }

  /**
   * Calculate expected goals based on team quality
   * Uses UEFA data: Average 5.16 goals per match (2.58 per team)
   */
  private calculateExpectedGoals(homeRating: number, awayRating: number): [number, number] {
    const BASE_GOALS_PER_TEAM = CONFIG.expectedGoals.baseGoalsPerTeam;

    // Calculate rating difference impact
    const ratingDiff = homeRating - awayRating;
    const qualityMultiplier = 1 + (ratingDiff * CONFIG.expectedGoals.ratingImpactPerPoint);
    const clampedMultiplier = Math.max(
      CONFIG.expectedGoals.qualityMultiplierMin,
      Math.min(CONFIG.expectedGoals.qualityMultiplierMax, qualityMultiplier)
    );

    // Home advantage
    const homeXG = BASE_GOALS_PER_TEAM * clampedMultiplier * CONFIG.expectedGoals.homeAdvantage;
    const awayXG = BASE_GOALS_PER_TEAM * (1 / clampedMultiplier);

    return [homeXG, awayXG];
  }

  /**
   * Create lineup with match-ready player state
   */
  private createLineup(players: Player[]): OnCourtPlayer[] {
    return players.map(player => this.createOnCourtPlayer(player));
  }

  /**
   * Helper: Create OnCourtPlayer from Player with all attributes initialized
   */
  private createOnCourtPlayer(player: Player, energy: number = 100): OnCourtPlayer {
    const playerWithTraits: PlayerWithTraits = {
      ...player,
      traits: player.traits || [], // Load traits from player data
      energy,
      minutesPlayedThisMatch: 0
    };

    return {
      player: playerWithTraits,
      effectiveAttributes: {
        // Technical attributes
        shooting: player.attributes.shooting,
        passing: player.attributes.passing,
        dribbling: player.attributes.dribbling,
        ballControl: player.attributes.ballControl,
        firstTouch: player.attributes.firstTouch,

        // Physical attributes
        pace: player.attributes.pace,
        stamina: player.attributes.stamina,
        strength: player.attributes.strength,
        agility: player.attributes.agility,

        // Defensive attributes
        tackling: player.attributes.tackling,
        positioning: player.attributes.positioning,
        marking: player.attributes.marking,
        interceptions: player.attributes.interceptions,

        // Mental attributes
        vision: player.attributes.vision,
        decisionMaking: player.attributes.decisionMaking,
        composure: player.attributes.composure,
        workRate: player.attributes.workRate,

        // Goalkeeper attributes (optional)
        reflexes: player.attributes.reflexes,
        handling: player.attributes.handling,
        gkPositioning: player.attributes.gkPositioning,
        distribution: player.attributes.distribution
      },
      performance: {
        shots: 0,
        passes: 0,
        tackles: 0,
        interceptions: 0,
        fouls: 0,
        rating: 6.0
      }
    };
  }

  /**
   * Simulate one tick (15 seconds of match time)
   */
  private simulateTick(state: LiveMatchState): void {
    // Update time
    state.currentTick++;
    state.currentMinute = Math.floor(state.currentTick / 4);

    // Reset accumulated fouls at half-time
    if (state.currentTick === CONFIG.match.halfTimeTick) {
      state.accumulatedFouls = { home: 0, away: 0 };
    }

    // Update momentum with natural decay
    state.momentum.value = this.calculateMomentum(state, state.currentMinute);

    // Update possession distribution
    const possessionTick = state.possession === 'home' ? 1 : 0;
    state.statistics.possession.home += possessionTick;
    state.statistics.possession.away += (1 - possessionTick);

    // Handle counter-attack state
    if (state.counterAttack.active) {
      state.counterAttack.ticksRemaining--;
      if (state.counterAttack.ticksRemaining <= 0) {
        state.counterAttack.active = false;
        state.counterAttack.team = null;
      }
    }

    // Check for possession change
    if (!state.counterAttack.active) {
      this.updatePossession(state);
    }

    // Check for red card expiration (2 minutes passed)
    this.checkRedCardReturns(state);

    // Generate events
    this.generateTickEvents(state);

    // Update player fatigue
    this.updatePlayerFatigue(state);

    //Check for auto-substitutions
    this.checkSubstitutions(state);
  }

  /**
   * Check if any players can return from red card suspensions
   * Futsal rules: Player can return after 2 minutes OR when opponent scores
   */
  private checkRedCardReturns(state: LiveMatchState): void {
    // Check both teams
    for (const team of ['home', 'away'] as const) {
      const redCards = state.redCards[team];
      const lineup = this.getLineup(state, team);
      const bench = this.getBench(state, team);
      const suspendedPlayers = state.suspendedPlayers[team];

      // Check each active red card
      for (let i = redCards.length - 1; i >= 0; i--) {
        const redCard = redCards[i];

        // Check if time has elapsed (2 minutes = 8 ticks)
        if (redCard.canReturnAt !== null && state.currentTick >= redCard.canReturnAt) {
          // Find a substitute from bench (exclude suspended players)
          const availableSubstitute = bench.find(p =>
            p.energy > 0 && !suspendedPlayers.includes(p.id)
          );

          if (availableSubstitute && lineup.length < 5) {
            // Bring substitute on court
            // PlayerWithTraits extends Player, so it has all attributes
            const onCourtPlayer = this.createOnCourtPlayer(availableSubstitute, availableSubstitute.energy);

            lineup.push(onCourtPlayer);

            // Remove from bench
            const benchIndex = bench.findIndex(p => p.id === availableSubstitute.id);
            if (benchIndex !== -1) {
              bench.splice(benchIndex, 1);
            }

            // Remove red card from tracking
            redCards.splice(i, 1);

            // Log the return
            state.events.push({
              minute: state.currentMinute,
              type: 'substitution',
              playerId: availableSubstitute.id,
              playerName: availableSubstitute.name,
              teamId: state[`${team}TeamId`],
              description: `${availableSubstitute.name} enters to restore team to 5 players (red card time served)`
            });

            //console.log(`[MatchEngine] Team ${team} restored player: ${availableSubstitute.name} enters (red card suspension ended)`);
          }
        }
      }
    }
  }

  /**
   * Check if a team with an active red card should return to 5 players after opponent scores
   * Futsal rule: Team returns to 5 players when opponent scores (or after 2 minutes)
   */
  private checkRedCardReturnAfterGoal(state: LiveMatchState, teamThatConceded: 'home' | 'away'): void {
    const redCards = state.redCards[teamThatConceded];
    const lineup = teamThatConceded === 'home' ? state.homeLineup : state.awayLineup;
    const bench = teamThatConceded === 'home' ? state.substitutions.homeBench : state.substitutions.awayBench;
    const suspendedPlayers = state.suspendedPlayers[teamThatConceded];

    // If team has an active red card and is playing with less than 5 players, restore to 5
    for (let i = redCards.length - 1; i >= 0; i--) {
      const redCard = redCards[i];

      // Find a substitute from bench (exclude suspended players)
      const availableSubstitute = bench.find(p =>
        p.energy > 0 && !suspendedPlayers.includes(p.id)
      );

      if (availableSubstitute && lineup.length < 5) {
        // Bring substitute on court
        // PlayerWithTraits extends Player, so it has all attributes
        const onCourtPlayer = this.createOnCourtPlayer(availableSubstitute, availableSubstitute.energy);

        lineup.push(onCourtPlayer);

        // Remove from bench
        const benchIndex = bench.findIndex(p => p.id === availableSubstitute.id);
        if (benchIndex !== -1) {
          bench.splice(benchIndex, 1);
        }

        // Remove red card from tracking
        redCards.splice(i, 1);

        // Log the return
        state.events.push({
          minute: state.currentMinute,
          type: 'substitution',
          playerId: availableSubstitute.id,
          playerName: availableSubstitute.name,
          teamId: state[`${teamThatConceded}TeamId`],
          description: `${availableSubstitute.name} enters to restore team to 5 players (opponent scored)`
        });

        //console.log(`[MatchEngine] Team ${teamThatConceded} restored player: ${availableSubstitute.name} enters (red card suspension ended)`);
      }
    }
  }

  /**
   * Check if fly-goalkeeper should be active for a team
   * Based on usage setting and match context (score, time remaining)
   */
  private isFlyGoalkeeperActive(team: 'home' | 'away', state: LiveMatchState): boolean {
    const tactics = this.getTeamTactics(state, team);
    const opposingTeam = this.getOpposingTeam(team);
    const opposingTactics = this.getTeamTactics(state, opposingTeam);

    if (!tactics.flyGoalkeeper || tactics.flyGoalkeeper.usage === 'Never') {
      return false;
    }

    const usage = tactics.flyGoalkeeper.usage;
    const minute = state.currentMinute;
    const score = state.score;
    const scoreDiff = team === 'home' ? (score.home - score.away) : (score.away - score.home);

    switch (usage) {
      case 'Always':
        return true;

      case 'EndGame':
        // Activate in last 5 minutes if losing or drawing
        return minute >= 35 && scoreDiff <= 0;

      case 'Sometimes':
        // Activate randomly (10% of the time) when losing in last 10 minutes
        // OR when drawing in last 5 minutes
        if (minute >= 30 && scoreDiff < 0) {
          return Math.random() < CONFIG.flyGoalkeeper.activationChance.losing; // 20% chance when losing
        }
        if (minute >= 35 && scoreDiff === 0) {
          return Math.random() < CONFIG.flyGoalkeeper.activationChance.drawing; // 10% chance when drawing late
        }
        if (opposingTactics.pressingIntensity === 'VeryHigh') {
          return Math.random() < CONFIG.flyGoalkeeper.activationChance.counter; // 15% chance if opponent is pressing very high
        }
        return false;

      default:
        return false;
    }
  }

  /**
   * Update possession based on team qualities and momentum
   */
  private updatePossession(state: LiveMatchState): void {
    const homePossessionChance = this.homeTeamQuality / (this.homeTeamQuality + this.awayTeamQuality);
    const momentumModifier = (state.momentum.value - 50) / CONFIG.possession.momentumImpactDivisor;
    let adjustedChance = homePossessionChance + momentumModifier;

    // Apply fly-goalkeeper modifiers to possession
    const homeFlyGK = this.isFlyGoalkeeperActive('home', state);
    const awayFlyGK = this.isFlyGoalkeeperActive('away', state);

    if (homeFlyGK) {
      adjustedChance += CONFIG.flyGoalkeeper.modifiers.possession;
    }
    if (awayFlyGK) {
      adjustedChance -= CONFIG.flyGoalkeeper.modifiers.possession;
    }

    adjustedChance = Math.max(CONFIG.possession.minChance, Math.min(CONFIG.possession.maxChance, adjustedChance));

    if (Math.random() < CONFIG.possession.changeChance) {
      state.possession = Math.random() < adjustedChance ? 'home' : 'away';
    }
  }

  /**
   * Generate events for this tick
   */
  private generateTickEvents(state: LiveMatchState): void {
    const attackingTeam = state.possession;
    if (state.possession === 'home') {
      this.homePossCounter++;

    } else {
      this.awayPossCounter++;
    }
    // Priority: Counter-attack shot
    if (state.counterAttack.active && state.counterAttack.team === attackingTeam) {
      this.generateShotEvent(state, true);
      state.counterAttack.active = false;
      state.counterAttack.team = null;
      return;
    }

    // Normal event generation
    const rand = Math.random();
    const timingMultiplier = this.getTimingMultiplier(state.currentMinute);

    // Get tactical modifiers for attacking team
    const attackingModifiers = this.getTacticalModifiers(attackingTeam, state, state.currentMinute);
    const defendingTeam = attackingTeam === 'home' ? 'away' : 'home';
    const defendingModifiers = this.getTacticalModifiers(defendingTeam, state, state.currentMinute);

    // Event probabilities (modified by timing) - Balanced for realistic shot counts
    let shotProb = CONFIG.events.baseProbabilities.shot * timingMultiplier;
    let dribbleProb = CONFIG.events.baseProbabilities.dribble;
    let tackleProb = CONFIG.events.baseProbabilities.tackle;
    let foulProb = CONFIG.events.baseProbabilities.foul;
    let cornerProb = CONFIG.events.baseProbabilities.corner;

    // Adjust for team quality (minimal impact to prevent snowballing)
    // Quality mainly affects shot conversion, not shot frequency
    const qualityRatio = attackingTeam === 'home'
      ? this.homeTeamQuality / this.awayTeamQuality
      : this.awayTeamQuality / this.homeTeamQuality;
    const qualityMultiplier = CONFIG.events.qualityImpact.minMultiplier +
      qualityRatio * (CONFIG.events.qualityImpact.maxMultiplier - CONFIG.events.qualityImpact.minMultiplier);
    shotProb *= qualityMultiplier;

    // Apply team mental modifiers (leader, comeback boost)
    const attackingLineup = this.getLineup(state, attackingTeam);
    const teamMentalModifier = this.applyTeamMentalModifiers(attackingLineup, attackingTeam, state);
    shotProb *= teamMentalModifier;

    // Apply tactical modifiers
    shotProb *= attackingModifiers.shotFrequency;  // Mentality affects shot frequency
    foulProb *= defendingModifiers.foulRate;      // Pressing affects foul rate

    // Select event
    if (rand < shotProb) {
      this.generateShotEvent(state, false);
    } else if (rand < shotProb + dribbleProb) {
      this.generateDribbleEvent(state);
    } else if (rand < shotProb + dribbleProb + tackleProb) {
      this.generateTackleEvent(state);
    } else if (rand < shotProb + dribbleProb + tackleProb + foulProb) {
      this.generateFoulEvent(state);
    } else if (rand < shotProb + dribbleProb + tackleProb + foulProb + cornerProb) {
      this.generateCornerEvent(state);
    }
    // Else: No event, possession continues
  }

  /**
   * Get timing multiplier based on match minute
   * Based on UEFA data: peak danger in last minutes
   */
  private getTimingMultiplier(minute: number): number {
    if (minute <= 10) return 0.88;  // Slow start
    if (minute <= 30) return 0.98;  // Normal
    if (minute === 39) return 2.16; // Peak danger
    if (minute === 38) return 1.69; // Very high
    if (minute >= 30) return 1.15;  // High intensity
    return 1.0;
  }

  /**
   * Calculate tactical modifiers based on team tactics
   * Returns multiplier for shot frequency and defensive resistance
   */
  private getTacticalModifiers(
    team: 'home' | 'away',
    state: LiveMatchState,
    minute: number
  ): { shotFrequency: number; defense: number; foulRate: number; fatigueRate: number } {
    const tactics = this.getTeamTactics(state, team);

    // Default to balanced if no tactics specified
    const mentality = tactics?.mentality || 'Balanced';
    const pressing = tactics?.pressingIntensity || 'Medium';

    const mentalityMods = CONFIG.tacticalModifiers.mentality[mentality as keyof typeof CONFIG.tacticalModifiers.mentality];
    const pressingMods = CONFIG.tacticalModifiers.pressing[pressing as keyof typeof CONFIG.tacticalModifiers.pressing];

    // Calculate time-based multiplier (early game = first 20 mins, late game = last 10 mins)
    let timeMultiplier = 0;
    if (minute <= 20) {
      timeMultiplier = mentalityMods.earlyGame;
    } else if (minute >= 30) {
      timeMultiplier = mentalityMods.lateGame;
    }

    // Shot frequency = base mentality + time-based modifier
    const shotFrequency = 1 + mentalityMods.shotFreq + timeMultiplier;

    // Defense = base mentality modifier
    let defense = 1 + mentalityMods.defense;

    // Foul rate = pressing intensity
    const foulRate = 1 + pressingMods.fouls;

    // Fatigue rate = pressing intensity
    const fatigueRate = 1 + pressingMods.fatigue;

    // Apply fly-goalkeeper modifiers if active
    let shotFreqMultiplier = 1 + mentalityMods.shotFreq + timeMultiplier;
    if (this.isFlyGoalkeeperActive(team, state)) {
      shotFreqMultiplier += CONFIG.flyGoalkeeper.modifiers.shotFrequency;
      defense += CONFIG.flyGoalkeeper.modifiers.defensiveWeakness;
    }

    return {
      shotFrequency: shotFreqMultiplier,
      defense,
      foulRate,
      fatigueRate
    };
  }

  /**
   * Get formation modifiers for offensive/defensive balance
   */
  private getFormationModifiers(formation: string): { offensive: number; defensive: number } {
    const formationKey = formation as keyof typeof CONFIG.tacticalModifiers.formation;
    return CONFIG.tacticalModifiers.formation[formationKey] || { offensive: 1.0, defensive: 1.0 };
  }

  /**
   * Generate a shot event
   */
  private generateShotEvent(state: LiveMatchState, isCounter: boolean): void {
    const attackingTeam = state.possession;
    const defendingTeam = this.getOpposingTeam(attackingTeam);

    // Calculate defensive resistance
    const defendingLineup = this.getLineup(state, defendingTeam);
    const defensiveResistance = this.calculateDefensiveResistance(defendingLineup, state, defendingTeam);

    // Check if defense prevents shot (10-20% prevention rate based on resistance)
    const preventionChance = (defensiveResistance / 100) * 0.15; // Up to 15% base prevention

    // Counter-attacks are harder to prevent (defense out of position)
    const adjustedPrevention = isCounter ? preventionChance * 0.3 : preventionChance;

    if (Math.random() < adjustedPrevention) {
      // Shot blocked/prevented by defense
      const defender = this.selectDefender(defendingLineup, 'intercept', defendingTeam, state);
      defender.performance.rating += CONFIG.performanceRatings.blockBonus;

      // Track block statistic
      state.statistics.blocks[defendingTeam]++;

      const event = this.createEvent(
        state,
        'block',
        defender,
        defendingTeam,
        `${defender.player.name} blocks the shot attempt!`
      );
      this.addEvent(state, event);
      return; // Shot prevented, exit
    }

    // Select shooter
    const lineup = this.getLineup(state, attackingTeam);
    const shooter = this.selectShooter(lineup, 'finish', attackingTeam, state);

    // Calculate shot quality
    let quality = this.calculateShotQuality(shooter, state);
    if (isCounter) {
      quality += CONFIG.shooting.counterAttackBonus; // Counter-attack bonus
    }

    // Reduce shot quality based on defensive resistance (8-15% reduction)
    const qualityReduction = (defensiveResistance / 200) * CONFIG.defense.qualityReduction; // Up to 15% reduction
    quality *= (1 - qualityReduction);

    quality = Math.max(0.3, Math.min(1.2, quality)); // Ensure reasonable range

    // Calculate shot probabilities
    const onTargetProb = CONFIG.shooting.onTargetBase * quality;
    let saveProb = CONFIG.goalkeeper.baseSaveChance;

    // Fly-goalkeeper vulnerability: counter-attacks are much more dangerous
    if (isCounter && this.isFlyGoalkeeperActive(defendingTeam, state)) {
      saveProb *= (1 - CONFIG.flyGoalkeeper.modifiers.counterVulnerability);
    }

    // Resolve the shot
    const context: ShotContext = {
      shotType: isCounter ? 'counter_attack' : 'open_play',
      isCounter,
      onTargetProb,
      saveProb,
      assistProb: CONFIG.shooting.assistProbability,
      quality,
      shooter,
      attackingTeam
    };

    this.resolveShotAttempt(state, context);
  }

  /**
   * Calculate shot quality (0-1 scale)
   */
  private calculateShotQuality(player: OnCourtPlayer, state: LiveMatchState): number {
    let quality = CONFIG.shooting.baseQuality; // Base

    // Player attributes (using fatigue-modified effective attributes)
    quality += (player.effectiveAttributes.shooting / 200) * CONFIG.shooting.attributeWeights.shooting;
    quality += (player.effectiveAttributes.positioning / 200) * CONFIG.shooting.attributeWeights.positioning;
    quality += (player.effectiveAttributes.composure / 200) * CONFIG.shooting.attributeWeights.composure;
    quality += (player.effectiveAttributes.strength / 200) * CONFIG.shooting.attributeWeights.strength;
    // Momentum effect on shot quality (±15%)
    // Determine which team the player belongs to
    const isHomePlayer = state.homeLineup.some(p => p.player.id === player.player.id);
    const teamMomentum = isHomePlayer ? state.momentum.value : (100 - state.momentum.value);
    const momentumModifier = ((teamMomentum - 50) / 100) * CONFIG.shooting.momentumImpact; // ±0.15 (±15%)
    quality *= (1 + momentumModifier);

    // Mental trait performance modifiers
    const mentalModifier = this.traitEngine.getMentalTraitModifier(player.player, {
      minute: state.currentMinute,
      score: state.score,
      isImportantMatch: false, // TODO: Add important match tracking
      actionType: 'shot',
      team: isHomePlayer ? 'home' : 'away'
    });
    quality *= mentalModifier;

    // Apply variance modifier for consistent/inconsistent players
    const baseVariance = (Math.random() - 0.5) * 0.16; // -0.08 to +0.08
    const varianceMultiplier = this.traitEngine.getVarianceModifier(player.player);
    const variance = baseVariance * varianceMultiplier;
    quality += variance;

    return Math.max(0.1, Math.min(1.0, quality));
  }

  /**
   * Generate a 1v1 dribble event (attacker vs defender)
   */
  private generateTackleEvent(state: LiveMatchState): void {
    const attackingTeam = state.possession;
    const defendingTeam = this.getOpposingTeam(attackingTeam);

    // Select attacker attempting the dribble (trait-based: attemptsToDribble, playsWithFlair, beatPlayerRepeatedly)
    const attackingLineup = this.getLineup(state, attackingTeam);
    const attacker = this.selectPlayerForAction(
      '1v1',
      attackingLineup,
      attackingTeam,
      state
    );

    // Select defender attempting the tackle (trait-based: hardTackler, anticipates)
    const defendingLineup = this.getLineup(state, defendingTeam);
    const defender = this.selectDefender(
      defendingLineup,
      'tackle',
      defendingTeam,
      state
    );

    // Calculate 1v1 success based on attacker's dribbling vs defender's tackling
    const attackerSkill = attacker.effectiveAttributes.dribbling / 200;
    const defenderSkill = defender.effectiveAttributes.tackling / 200;

    // 50% base + skill differential (attacker favored slightly in futsal)
    const attackerWinProb = 0.45 + (attackerSkill * 0.35) - (defenderSkill * 0.25);

    if (Math.random() < attackerWinProb) {
      // Attacker wins 1v1 - beats defender
      attacker.performance.rating += CONFIG.performanceRatings.dribbleSuccessBonus;
      defender.performance.rating += CONFIG.performanceRatings.dribbleDefensePenalty;

      // Attacker keeps possession and might create a chance
      // No explicit event, but momentum shift
      this.updateMomentum(state, attackingTeam, 3);
    } else {
      // Defender wins 1v1 - successful tackle or interception
      state.possession = defendingTeam;
      defender.performance.rating += CONFIG.performanceRatings.dribbleDefenseBonus;
      attacker.performance.rating += CONFIG.performanceRatings.dribbleFailPenalty;

      // 40% chance it's an interception (reading the pass) vs tackle (winning 1v1)
      const isInterception = Math.random() < 0.4;

      if (isInterception) {
        // Interception - read the pass
        state.statistics.interceptions[defendingTeam]++;

        state.events.push({
          minute: state.currentMinute,
          type: 'interception',
          playerId: defender.player.id,
          playerName: defender.player.name,
          teamId: state[`${defendingTeam}TeamId`],
          description: `${defender.player.name} intercepts the pass!`
        });
      } else {
        // Tackle - wins 1v1
        state.statistics.tackles[defendingTeam]++;
        defender.performance.tackles++;

        state.events.push({
          minute: state.currentMinute,
          type: 'tackle',
          playerId: defender.player.id,
          playerName: defender.player.name,
          teamId: state[`${defendingTeam}TeamId`],
          description: `${defender.player.name} wins the ball!`
        });
      }

      // Trigger counter-attack
      state.counterAttack = {
        active: true,
        team: defendingTeam,
        ticksRemaining: 2
      };

      this.updateMomentum(state, defendingTeam, 5);
    }
  }

  // ============================================================================
  // FOUL EVENT HELPERS
  // ============================================================================

  /**
   * Determine foul severity based on timing and game context
   */
  private determineFoulSeverity(state: LiveMatchState): {
    severity: 'light' | 'moderate' | 'severe';
    isDangerous: boolean;
    cardProbability: number;
  } {
    const isCriticalMoment = state.currentMinute > 35;
    const isDesperateDefense = Math.abs(state.score.home - state.score.away) <= 1;

    // Determine if dangerous position
    const isDangerous = Math.random() < (0.30 + (isCriticalMoment ? CONFIG.fouls.lateGameDangerousBonus : 0));

    // Calculate card probability
    let cardProb = CONFIG.fouls.cards.baseCardChance;
    if (isCriticalMoment) cardProb += CONFIG.fouls.cards.lateGameBonus;
    if (isDesperateDefense) cardProb += CONFIG.fouls.cards.closeGameBonus;

    // Determine severity
    const severityRand = Math.random();
    let severity: 'light' | 'moderate' | 'severe';
    if (severityRand < CONFIG.fouls.severity.light) {
      severity = 'light';
    } else if (severityRand < CONFIG.fouls.severity.moderate + CONFIG.fouls.severity.light) {
      severity = 'moderate';
    } else {
      severity = 'severe';
    }

    return { severity, isDangerous, cardProbability: cardProb };
  }

  /**
   * Process card issuance for a foul
   * Returns true if a card was issued, false otherwise
   */
  private processFoulCard(
    state: LiveMatchState,
    fouler: OnCourtPlayer,
    defendingTeam: 'home' | 'away',
    attackingTeam: 'home' | 'away',
    severity: 'light' | 'moderate' | 'severe',
    cardProbability: number
  ): boolean {
    if (Math.random() >= cardProbability) {
      // No card issued
      return false;
    }

    let cardType: 'yellow' | 'red';
    let isSecondYellow = false;

    // Check if player already has a yellow card
    const yellowCards = state.yellowCards[defendingTeam];
    const hasYellowCard = yellowCards.includes(fouler.player.id);

    // Determine card type based on severity
    if (severity === 'severe') {
      cardType = 'red';
    } else if (severity === 'moderate') {
      cardType = Math.random() < CONFIG.fouls.cards.redCardChance ? 'red' : 'yellow';
    } else {
      cardType = Math.random() < 0.99 ? 'yellow' : 'red';
    }

    // Second yellow = red card
    if (cardType === 'yellow' && hasYellowCard) {
      cardType = 'red';
      isSecondYellow = true;
    }

    // Create card event
    const cardEmoji = cardType === 'yellow' ? '🟨' : '🟥';
    const severityDesc = severity === 'severe' ? ' (serious foul play)' : '';
    const secondYellowDesc = isSecondYellow ? ' (second yellow)' : '';

    const event = this.createEvent(
      state,
      `${cardType}_card` as any,
      fouler,
      defendingTeam,
      `${cardEmoji} ${cardType.toUpperCase()} CARD for ${fouler.player.name}${severityDesc}${secondYellowDesc}!`
    );
    this.addEvent(state, event);

    // Process card consequences
    if (cardType === 'red') {
      this.processRedCard(state, fouler, defendingTeam, attackingTeam);
    } else {
      this.processYellowCard(state, fouler, defendingTeam);
    }

    return true; // Card was issued
  }

  /**
   * Process red card consequences
   */
  private processRedCard(
    state: LiveMatchState,
    fouler: OnCourtPlayer,
    defendingTeam: 'home' | 'away',
    attackingTeam: 'home' | 'away'
  ): void {
    const lineup = this.getLineup(state, defendingTeam);
    const bench = this.getBench(state, defendingTeam);
    const index = lineup.findIndex(p => p.player.id === fouler.player.id);

    if (index !== -1) {
      // Remove player from lineup
      const expelledPlayer = lineup.splice(index, 1)[0];

      // Add to red card tracking
      const redCardRecord = {
        playerId: fouler.player.id,
        playerName: fouler.player.name,
        tickIssued: state.currentTick,
        canReturnAt: state.currentTick + CONFIG.redCard.returnAfterTicks,
        returnCondition: 'time' as const
      };

      state.redCards[defendingTeam].push(redCardRecord);

      // Add to suspended players list
      state.suspendedPlayers[defendingTeam].push(fouler.player.id);

      // Move expelled player to bench
      bench.push(expelledPlayer.player);

      // Red card rating penalty
      fouler.performance.rating += CONFIG.ratings.weights.redCard;
    }

    // Significant momentum swing
    this.updateMomentum(state, attackingTeam, 20);
  }

  /**
   * Process yellow card consequences
   */
  private processYellowCard(
    state: LiveMatchState,
    fouler: OnCourtPlayer,
    defendingTeam: 'home' | 'away'
  ): void {
    const yellowCards = state.yellowCards[defendingTeam];
    if (!yellowCards.includes(fouler.player.id)) {
      yellowCards.push(fouler.player.id);
    }
    fouler.performance.rating += CONFIG.ratings.weights.yellowCard;
  }

  /**
   * Handle accumulated fouls and 10m penalty
   */
  private handleAccumulatedFouls(state: LiveMatchState, defendingTeam: 'home' | 'away', fouler: OnCourtPlayer): boolean {
    const accumulatedFouls = state.statistics.fouls[defendingTeam];
    
    if (accumulatedFouls >= CONFIG.fouls.accumulatedFoulPenaltyThreshold) {
      // 10m penalty kick awarded
      state.events.push({
        minute: state.currentMinute,
        type: 'foul',
        playerId: fouler.player.id,
        playerName: fouler.player.name,
        teamId: this.getTeamId(state, defendingTeam),
        description: `🚨 10m PENALTY AWARDED! ${fouler.player.name} commits ${accumulatedFouls}th team foul`
      });

      // Generate penalty kick immediately
      this.generatePenaltyKick(state);
      return true; // Foul handling complete
    }
    
    return false; // Continue with normal foul processing
  }

  /**
   * Handle dangerous foul consequences (free kick chance)
   */
  private processDangerousFoul(
    state: LiveMatchState,
    isDangerous: boolean,
    attackingTeam: 'home' | 'away'
  ): void {
    if (isDangerous && Math.random() < 0.5) {
      this.generateFreeKickShot(state);
    } else {
      this.updateMomentum(state, attackingTeam, 5);
    }
  }

  /**
   * Generate a foul event
   */
  private generateFoulEvent(state: LiveMatchState): void {
    const attackingTeam = state.possession;
    const defendingTeam = this.getOpposingTeam(attackingTeam);

    // Select fouler (trait-based: hardTackler, aggressive)
    const fouler = this.selectDefender(
      this.getLineup(state, defendingTeam),
      'tackle',
      defendingTeam,
      state
    );

    // Update statistics
    state.statistics.fouls[defendingTeam]++;
    state.accumulatedFouls[defendingTeam]++;
    fouler.performance.fouls++;
    fouler.performance.rating -= CONFIG.ratings.weights.fouls;

    // Check if this triggers 10m penalty (6th+ accumulated foul)
    if (this.handleAccumulatedFouls(state, defendingTeam, fouler)) {
      return; // Penalty generated, foul handling complete
    }

    // Regular foul - determine severity and context
    const { severity, isDangerous, cardProbability } = this.determineFoulSeverity(state);

    // Process card if warranted (returns true if card was issued)
    const cardIssued = this.processFoulCard(state, fouler, defendingTeam, attackingTeam, severity, cardProbability);

    // If no card was issued, create simple foul event
    if (!cardIssued) {
      const event = this.createEvent(
        state,
        'foul' as any,
        fouler,
        defendingTeam,
        `Foul by ${fouler.player.name}`
      );
      this.addEvent(state, event);
    }

    // Handle dangerous foul consequences
    this.processDangerousFoul(state, isDangerous, attackingTeam);
  }


  /**
   * Generate a direct free-kick shot (from dangerous foul position)
   * Lower quality than 10m penalties (wall present, less favorable angle)
   */
  private generateFreeKickShot(state: LiveMatchState): void {
    const attackingTeam = state.possession;
    const defendingTeam = this.getOpposingTeam(attackingTeam);

    // Select shooter
    const attackers = this.getLineup(state, attackingTeam);
    const shooter = this.selectShooter(attackers, 'finish', attackingTeam, state);

    // Calculate shot quality
    const shooterSkill = this.calculateShotQuality(shooter, state);

    // Apply mental trait modifier for free kicks
    const isHomePlayer = attackingTeam === 'home';
    const mentalModifier = this.traitEngine.getMentalTraitModifier(shooter.player, {
      minute: state.currentMinute,
      score: state.score,
      isImportantMatch: false,
      actionType: 'freeKick',
      team: isHomePlayer ? 'home' : 'away'
    });

    const goalkeeper = this.getGoalkeeper(state, defendingTeam);
    const gkSkill = this.calculateGKEffectiveness(goalkeeper);

    let shotQuality = CONFIG.setPieces.freeKick.baseGoalChance +
      (shooterSkill * CONFIG.setPieces.freeKick.shooterSkillWeight) -
      (gkSkill * CONFIG.setPieces.freeKick.gkSkillWeight);
    shotQuality *= mentalModifier;
    shotQuality = Math.max(
      CONFIG.setPieces.freeKick.minGoalChance,
      Math.min(CONFIG.setPieces.freeKick.maxGoalChance, shotQuality)
    );

    // Calculate shot probabilities
    const onTargetProb = CONFIG.setPieces.freeKick.onTargetChance;
    const saveProb = CONFIG.goalkeeper.baseSaveChance * (goalkeeper.player.attributes.reflexes || 20) / 200;

    // Resolve the shot
    const context: ShotContext = {
      shotType: 'free_kick',
      onTargetProb,
      saveProb,
      assistProb: 0, // No assists from direct free kicks
      quality: shotQuality,
      shooter,
      attackingTeam
    };

    this.resolveShotAttempt(state, context);
  }

  /**
   * Generate a penalty kick from 10m (6th+ accumulated foul)
   * These are high-probability shots with no wall
   */
  private generatePenaltyKick(state: LiveMatchState): void {
    const attackingTeam = state.possession;
    const defendingTeam = this.getOpposingTeam(attackingTeam);

    // Select shooter
    const attackers = this.getLineup(state, attackingTeam);
    const shooter = this.selectShooter(attackers, 'finish', attackingTeam, state);

    // Calculate shot quality
    const shooterSkill = this.calculateShotQuality(shooter, state);
    const goalkeeper = this.getGoalkeeper(state, defendingTeam);
    const gkSkill = this.calculateGKEffectiveness(goalkeeper);

    // Apply mental trait modifier for penalty kicks
    const isHomePlayer = attackingTeam === 'home';
    const mentalModifier = this.traitEngine.getMentalTraitModifier(shooter.player, {
      minute: state.currentMinute,
      score: state.score,
      isImportantMatch: false,
      actionType: 'penalty',
      team: isHomePlayer ? 'home' : 'away'
    });

    let goalProbability = CONFIG.setPieces.penalty.baseGoalChance +
      (shooterSkill * CONFIG.setPieces.penalty.shooterSkillWeight) -
      (gkSkill * CONFIG.setPieces.penalty.gkSkillWeight);
    goalProbability *= mentalModifier;
    goalProbability = Math.max(
      CONFIG.setPieces.penalty.minGoalChance,
      Math.min(CONFIG.setPieces.penalty.maxGoalChance, goalProbability)
    );

    // Calculate shot probabilities
    const onTargetProb = 0.9; // 90% chance penalty is on target
    const saveProb = 1.0 - goalProbability; // Save probability is inverse of goal probability

    // Resolve the shot
    const context: ShotContext = {
      shotType: 'penalty_10m',
      onTargetProb,
      saveProb,
      assistProb: 0, // No assists from penalties
      quality: goalProbability,
      shooter,
      attackingTeam
    };

    this.resolveShotAttempt(state, context);
  }

  /**
   * Generate a corner event
   */
  private generateCornerEvent(state: LiveMatchState): void {
    const attackingTeam = state.possession;
    const defendingTeam = this.getOpposingTeam(attackingTeam);

    state.statistics.corners[attackingTeam]++;

    const event = this.createEvent(
      state,
      'corner',
      null,
      attackingTeam,
      `Corner for ${attackingTeam === 'home' ? 'home' : 'away'} team`
    );
    this.addEvent(state, event);

    // 60% chance corner leads to a shot attempt (set piece)
    if (Math.random() < CONFIG.setPieces.corner.shotChance) {
      const attackingLineup = this.getLineup(state, attackingTeam);
      const shooter = this.selectShooter(attackingLineup, 'finish', attackingTeam, state);
      
      // Calculate defensive resistance (corners face organized defense)
      const defendingLineup = this.getLineup(state, defendingTeam);
      const defensiveResistance = this.calculateDefensiveResistance(defendingLineup, state, defendingTeam);

      // Set piece shot quality (base + attributes - defense)
      let quality: number = CONFIG.setPieces.corner.baseQuality;
      quality *= this.calculateShotQuality(shooter, state);

      // Defensive resistance impact (set pieces face organized defense)
      const qualityReduction = (defensiveResistance / 200) * CONFIG.setPieces.corner.qualityReduction;
      quality *= (1 - qualityReduction);

      quality = Math.max(CONFIG.setPieces.corner.minQuality, Math.min(CONFIG.setPieces.corner.maxQuality, quality));

      // Calculate shot probabilities
      const onTargetProb = CONFIG.setPieces.corner.onTargetChance * quality;
      const saveProb = CONFIG.goalkeeper.baseSaveChance;

      // Resolve the shot
      const context: ShotContext = {
        shotType: 'corner',
        onTargetProb,
        saveProb,
        assistProb: 0, // No assists from corner kicks
        quality,
        shooter,
        attackingTeam
      };

      this.resolveShotAttempt(state, context);
    }
  }

  /**
   * Generate a 1v1 dribble event
   */
  private generateDribbleEvent(state: LiveMatchState): void {
    const attackingTeam = state.possession;
    const defendingTeam = this.getOpposingTeam(attackingTeam);

    // Select attacker attempting dribble (trait-based: attemptsToDribble, playsWithFlair)
    const attackingLineup = this.getLineup(state, attackingTeam);
    const attacker = this.selectPlayerForAction('1v1', attackingLineup, attackingTeam, state);

    // Select defender (trait-based: hardTackler, anticipates, marksOpponentTightly)
    const defendingLineup = this.getLineup(state, defendingTeam);
    const defender = this.selectDefender(defendingLineup, 'tackle', defendingTeam, state);

    // Calculate dribble success probability
    const attackerSkill = (attacker.effectiveAttributes.dribbling + attacker.effectiveAttributes.pace) / 2;
    const defenderSkill = (defender.effectiveAttributes.tackling + defender.effectiveAttributes.positioning) / 2;

    let successProb = 0.5 + ((attackerSkill - defenderSkill) / 200); // ±25% based on skill diff
    successProb = Math.max(0.25, Math.min(0.75, successProb)); // Clamp to 25-75%

    if (Math.random() < successProb) {
      // Successful dribble
      attacker.performance.rating += CONFIG.performanceRatings.oneVsOneWinBonus;
      defender.performance.rating += CONFIG.performanceRatings.oneVsOneLosePenalty;

      // Track successful dribble statistic
      state.statistics.dribblesSuccessful[attackingTeam]++;

      state.events.push({
        minute: state.currentMinute,
        type: 'dribble',
        playerId: attacker.player.id,
        playerName: attacker.player.name,
        teamId: state[`${attackingTeam}TeamId`],
        description: `${attacker.player.name} beats ${defender.player.name}!`
      });

      // Small momentum gain
      this.updateMomentum(state, attackingTeam, 2);
    } else {
      // Failed dribble - defender wins ball (becomes a tackle)
      state.possession = defendingTeam;

      // Track unsuccessful dribble for attacker
      state.statistics.dribblesUnsuccessful[attackingTeam]++;

      // Also track as a tackle for defender
      state.statistics.tackles[defendingTeam]++;
      defender.performance.tackles++;
      defender.performance.rating += CONFIG.performanceRatings.oneVsOneDefenseBonus;
      attacker.performance.rating += CONFIG.performanceRatings.oneVsOneDefensePenalty;

      // Trigger counter-attack
      state.counterAttack = {
        active: true,
        team: defendingTeam,
        ticksRemaining: 2
      };

      state.events.push({
        minute: state.currentMinute,
        type: 'tackle',
        playerId: defender.player.id,
        playerName: defender.player.name,
        teamId: state[`${defendingTeam}TeamId`],
        description: `${defender.player.name} wins the ball from ${attacker.player.name}!`
      });

      this.updateMomentum(state, defendingTeam, 4);
    }
  }

  /**
   * Update momentum based on events
   */
  private updateMomentum(state: LiveMatchState, team: 'home' | 'away', change: number): void {
    if (team === 'home') {
      state.momentum.value = Math.max(0, Math.min(100, state.momentum.value + change));
    } else {
      state.momentum.value = Math.max(0, Math.min(100, state.momentum.value - change));
    }

    // Update last momentum change time
    state.momentum.lastUpdate = state.currentMinute;

    // Update momentum trend
    if (state.momentum.value > 60) {
      state.momentum.trend = 'home';
    } else if (state.momentum.value < 40) {
      state.momentum.trend = 'away';
    } else {
      state.momentum.trend = 'neutral';
    }
  }

  /**
   * Update player fatigue each tick with intensity-based decay
   * Also recover stamina for bench players
   */
  private updatePlayerFatigue(state: LiveMatchState): void {
    // Calculate match intensity (affects fatigue rate)
    const intensity = this.calculateMatchIntensity(state, state.currentMinute);
    const intensityMultiplier = intensity / 100; // 0-1 scale

    // Base fatigue: 0.5% per tick = 2% per minute (4 ticks/minute)
    // With intensity, can reach 1% per tick = 4% per minute in high-intensity moments
    const baseFatiguePerTick = 0.5;

    // Bench recovery: 0.4% per tick = 1.6% per minute (slower than decay, but allows rotation)
    const baseRecoveryPerTick = 0.4;

    // Get tactical fatigue modifiers
    const homeFatigueModifier = this.getTacticalModifiers('home', state, state.currentMinute).fatigueRate;
    const awayFatigueModifier = this.getTacticalModifiers('away', state, state.currentMinute).fatigueRate;

    state.homeLineup.forEach(player => {
      // Fatigue = base * intensity * tactics * fitness * stamina
      // Stamina attribute (1-200): High stamina = less fatigue
      const staminaAttribute = player.player.attributes.stamina || 100;
      const staminaMultiplier = 1.5 - (staminaAttribute / 400); // Range: 1.0 (200 stamina) to 1.5 (1 stamina)

      const fitnessMultiplier = 1 + ((100 - player.player.fitness) / 100);
      const fatiguePerTick = baseFatiguePerTick * (1 + intensityMultiplier) * homeFatigueModifier * fitnessMultiplier * staminaMultiplier;

      player.player.energy = Math.max(0, player.player.energy - fatiguePerTick);
      player.player.minutesPlayedThisMatch = state.currentMinute;

      // Apply fatigue to effective attributes (50%-100% effectiveness)
      this.applyFatigueToAttributes(player);
    });

    state.awayLineup.forEach(player => {
      // Fatigue = base * intensity * tactics * fitness * stamina

      const staminaAttribute = player.player.attributes.stamina || 100;
      const staminaMultiplier = 1.5 - (staminaAttribute / 400); // Range: 1.0 (200 stamina) to 1.5 (1 stamina)

      const fitnessMultiplier = 1 + ((100 - player.player.fitness) / 100);
      let fatiguePerTick;
      if (player.player.position === 'Goalkeeper') {
        // Goalkeepers fatigue at 20% the rate
        fatiguePerTick = (baseFatiguePerTick * 0.2) * (1 + intensityMultiplier) * awayFatigueModifier * fitnessMultiplier * staminaMultiplier;
      } else {
        fatiguePerTick = baseFatiguePerTick * (1 + intensityMultiplier) * awayFatigueModifier * fitnessMultiplier * staminaMultiplier;
      }

      player.player.energy = Math.max(0, player.player.energy - fatiguePerTick);
      player.player.minutesPlayedThisMatch = state.currentMinute;

      // Apply fatigue to effective attributes (50%-100% effectiveness)
      this.applyFatigueToAttributes(player);
    });

    // Bench players recover stamina based on their stamina attribute
    // High stamina players recover faster
    state.substitutions.homeBench.forEach(player => {
      const staminaAttribute = player.attributes.stamina || 100;
      const staminaRecoveryBonus = (staminaAttribute / 200) * 0.3; // Range: 0 to +0.3 (0% to +30% bonus)
      const recoveryPerTick = baseRecoveryPerTick * (1 + staminaRecoveryBonus);
      player.energy = Math.min(100, player.energy + recoveryPerTick);
    });

    state.substitutions.awayBench.forEach(player => {
      const staminaAttribute = player.attributes.stamina || 100;
      const staminaRecoveryBonus = (staminaAttribute / 200) * 0.3; // Range: 0 to +0.3 (0% to +30% bonus)
      const recoveryPerTick = baseRecoveryPerTick * (1 + staminaRecoveryBonus);
      player.energy = Math.min(100, player.energy + recoveryPerTick);
    });
  }

  /**
   * Apply fatigue penalty to player's effective attributes
   * At 100% energy: 100% effectiveness
   * At 0% energy: 50% effectiveness (severe degradation)
   */
  private applyFatigueToAttributes(player: OnCourtPlayer): void {
    const energyRatio = player.player.energy / 100;
    // degradation: 0.5 at 0% energy, 1.0 at 100% energy
    const degradation = 0.5 + (energyRatio * 0.5);

    const baseAttrs = player.player.attributes;

    player.effectiveAttributes = {
      // Technical skills: 30% max degradation (70% effectiveness at 0% energy)
      shooting: baseAttrs.shooting * (0.7 + energyRatio * 0.3),
      passing: baseAttrs.passing * (0.7 + energyRatio * 0.3),
      dribbling: baseAttrs.dribbling * (0.7 + energyRatio * 0.3),
      ballControl: baseAttrs.ballControl * (0.7 + energyRatio * 0.3),
      firstTouch: baseAttrs.firstTouch * (0.7 + energyRatio * 0.3),
      tackling: baseAttrs.tackling * (0.7 + energyRatio * 0.3),

      // Physical attributes: pace most affected, stamina affects recovery rate
      pace: baseAttrs.pace * (0.5 + energyRatio * 0.5), // 50% max degradation
      stamina: baseAttrs.stamina * (0.8 + energyRatio * 0.2), // 20% degradation
      strength: baseAttrs.strength * (0.6 + energyRatio * 0.4), // 40% degradation
      agility: baseAttrs.agility * (0.6 + energyRatio * 0.4), // 40% degradation

      // Defensive attributes: 25% max degradation
      interceptions: baseAttrs.interceptions * (0.75 + energyRatio * 0.25),

      // Positioning/Marking: 20% max degradation (least affected, more mental)
      positioning: baseAttrs.positioning * (0.8 + energyRatio * 0.2),
      marking: baseAttrs.marking * (0.8 + energyRatio * 0.2),

      // Mental attributes: 15% max degradation (most resistant to fatigue)
      vision: baseAttrs.vision * (0.85 + energyRatio * 0.15),
      decisionMaking: baseAttrs.decisionMaking * (0.85 + energyRatio * 0.15),
      composure: baseAttrs.composure * (0.85 + energyRatio * 0.15),
      workRate: baseAttrs.workRate * (0.85 + energyRatio * 0.15),

      // Goalkeeper attributes: less affected by fatigue (mostly positioning/mental)
      reflexes: baseAttrs.reflexes ? baseAttrs.reflexes * (0.75 + energyRatio * 0.25) : undefined,
      handling: baseAttrs.handling ? baseAttrs.handling * (0.8 + energyRatio * 0.2) : undefined,
      gkPositioning: baseAttrs.gkPositioning ? baseAttrs.gkPositioning * (0.85 + energyRatio * 0.15) : undefined,
      distribution: baseAttrs.distribution ? baseAttrs.distribution * (0.8 + energyRatio * 0.2) : undefined
    };
  }

  /**
   * Calculate match intensity (0-100)
   * Higher intensity = faster fatigue accumulation
   * Factors: score differential, time period, momentum swings
   */
  private calculateMatchIntensity(state: LiveMatchState, minute: number): number {
    let intensity = 50; // Base intensity

    // Score differential (close games are more intense)
    const scoreDiff = Math.abs(state.score.home - state.score.away);
    if (scoreDiff === 0) {
      intensity += 20; // Tied game: very intense
    } else if (scoreDiff === 1) {
      intensity += 10; // One-goal game: intense
    }
    // 2+ goal difference: lower intensity (coasting/desperation)

    // Time period (late game is more intense)
    if (minute >= 35) {
      intensity += 15; // Final 5 minutes: maximum intensity
    } else if (minute >= 30) {
      intensity += 10; // Minutes 30-35: high intensity
    }

    // Momentum swings (large swings indicate chaotic, intense play)
    const momentumFromCenter = Math.abs(state.momentum.value - 50);
    if (momentumFromCenter > 30) {
      intensity += 10; // One team dominating: high intensity
    }

    // Clamp to 0-100 range
    return Math.min(100, Math.max(0, intensity));
  }

  /**
   * Calculate defensive resistance (0-100 scale)
   * Higher values mean stronger defense
   */
  private calculateDefensiveResistance(
    defendingLineup: OnCourtPlayer[],
    state: LiveMatchState,
    defendingTeam: 'home' | 'away'
  ): number {
    if (defendingLineup.length === 0) return 50;

    // Average defensive attributes
    const avgTackling = defendingLineup.reduce((sum, p) => sum + p.effectiveAttributes.tackling, 0) / defendingLineup.length;
    const avgPositioning = defendingLineup.reduce((sum, p) => sum + p.effectiveAttributes.positioning, 0) / defendingLineup.length;
    const avgMarking = defendingLineup.reduce((sum, p) => sum + p.effectiveAttributes.marking, 0) / defendingLineup.length;

    // Base resistance (0-200 scale)
    let resistance = (avgTackling + avgPositioning + avgMarking) / 3;

    // Apply tactical defensive modifier
    const defenseModifiers = this.getTacticalModifiers(defendingTeam, state, state.currentMinute);
    resistance *= defenseModifiers.defense;

    // Red card penalty - being down a player significantly weakens defense
    if (defendingLineup.length < 5) {
      const playerDeficit = 5 - defendingLineup.length;
      resistance *= Math.pow(0.75, playerDeficit); // -25% per missing player
    }

    return Math.max(20, Math.min(100, resistance));
  }

  /**
   * Calculate player rating (6.0-10.0 scale)
   */
  private calculatePlayerRating(player: OnCourtPlayer, state: LiveMatchState): number {
    let rating = 6.5; // Base rating

    // Positive contributions
    rating += player.performance.shots * 0.05;  // Reduced from 0.1
    rating += player.performance.tackles * 0.08; // Slightly reduced from 0.1
    rating += player.performance.interceptions * 0.1;

    // Negative contributions
    rating -= player.performance.fouls * 0.15; // Reduced from 0.2

    // Additional rating from performance.rating (accumulated during match)
    rating += player.performance.rating - 6.0; // Subtract base to avoid double-counting

    return Math.max(1.0, Math.min(10.0, rating));
  }

  /**
   * Select a random player from lineup
   */
  private selectRandomPlayer(lineup: OnCourtPlayer[]): OnCourtPlayer {
    const outfield = lineup.filter(p => p.player.position !== 'Goalkeeper');
    if (outfield.length === 0) return lineup[0];
    return outfield[Math.floor(Math.random() * outfield.length)];
  }

  /**
   * Select a player from lineup weighted by a specific attribute
   */
  private selectWeightedPlayer(
    lineup: OnCourtPlayer[],
    weightFn: (p: OnCourtPlayer) => number
  ): OnCourtPlayer {
    // Calculate total weight
    const weights = lineup.map(p => weightFn(p));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    if (totalWeight === 0) {
      return lineup[Math.floor(Math.random() * lineup.length)];
    }

    // Select player based on weighted probability
    let random = Math.random() * totalWeight;
    for (let i = 0; i < lineup.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return lineup[i];
      }
    }

    return lineup[lineup.length - 1]; // Fallback
  }

  // ============================================================================
  // TRAIT-BASED PLAYER SELECTION
  // ============================================================================

  /**
   * Select player for action based on traits
   * Uses trait engine to weight selection by trait relevance
   * 
   * @param action - Action type (e.g., 'finish', '1v1', 'tackle')
   * @param lineup - Available players
   * @param team - Team identifier ('home' or 'away')
   * @param state - Match state (needed to check fly-goalkeeper status)
   * @param excludeGK - Whether to exclude goalkeeper (default true, ignored if fly-GK active)
   * @returns Selected player based on trait weighting
   */
  private selectPlayerForAction(
    action: string,
    lineup: OnCourtPlayer[],
    team: 'home' | 'away',
    state: LiveMatchState,
    excludeGK: boolean = true
  ): OnCourtPlayer {
    let available = lineup;

    // If fly-goalkeeper is active, include GK in selection (they're playing as 6th outfield player)
    const flyGKActive = this.isFlyGoalkeeperActive(team, state);

    if (excludeGK && !flyGKActive) {
      available = lineup.filter(p => p.player.position !== 'Goalkeeper');
      if (available.length === 0) available = lineup; // Fallback if no outfield players
    }
    // If fly-GK is active, all 5 players (including GK) are available

    // Use trait engine to select player based on action type
    const selected = this.traitEngine.selectPlayerForAction(action, available.map(p => p.player));

    // Find the OnCourtPlayer object matching the selected player
    return available.find(p => p.player.id === selected.id) || available[0];
  }

  /**
   * Select shooter with trait-based weighting
   * Combines attribute weighting with trait-based selection
   */
  private selectShooter(
    lineup: OnCourtPlayer[],
    shotType: 'finish' | '1v1' | 'longShot',
    team: 'home' | 'away',
    state: LiveMatchState
  ): OnCourtPlayer {
    // Map shot type to trait action
    const actionMap = {
      'finish': 'finish',
      '1v1': '1v1',
      'longShot': 'longShot'
    };

    return this.selectPlayerForAction(actionMap[shotType], lineup, team, state);
  }

  /**
   * Select defender with trait-based weighting
   */
  private selectDefender(
    lineup: OnCourtPlayer[],
    actionType: 'tackle' | 'intercept' | 'mark' = 'tackle',
    team: 'home' | 'away',
    state: LiveMatchState
  ): OnCourtPlayer {
    return this.selectPlayerForAction(actionType, lineup, team, state);
  }

  // ============================================================================
  // SUBSTITUTION SYSTEM
  // ============================================================================

  /**
   * Check if any players need to be substituted due to low energy
   * Auto-substitution triggers at energy threshold (default 30%)
   * Skip first 2 minutes (let game settle) and last 2 minutes (too late)
   * Maximum 5 substitutions per tick per team (whole lineup can be swapped)
   */
  private checkSubstitutions(state: LiveMatchState): void {
    const minute = state.currentMinute;

    // Don't substitute too early or too late
    if (minute < 2 || minute > 38) return;

    // Check home team substitutions (max 5 per tick)
    if (state.substitutions.autoSubEnabled.home && state.substitutions.homeBench.length > 0) {
      let subsThisTick = 0;
      const maxSubsPerTick = 5;

      for (const player of state.homeLineup) {
        if (subsThisTick >= maxSubsPerTick) break;

        if (player.player.energy < state.substitutions.energyThreshold) {
          // Player is exhausted, try to substitute
          if (state.substitutions.homeBench.length > 0) {
            this.makeSubstitution(state, 'home', player);
            subsThisTick++;
          }
        }
      }
    }

    // Check away team substitutions (max 5 per tick)
    if (state.substitutions.autoSubEnabled.away && state.substitutions.awayBench.length > 0) {
      let subsThisTick = 0;
      const maxSubsPerTick = 5;

      for (const player of state.awayLineup) {
        if (subsThisTick >= maxSubsPerTick) break;

        if (player.player.energy < state.substitutions.energyThreshold) {
          // Player is exhausted, try to substitute
          if (state.substitutions.awayBench.length > 0) {
            this.makeSubstitution(state, 'away', player);
            subsThisTick++;
          }
        }
      }
    }
  }

  /**
   * Make a substitution: replace tired player with fresh bench player
   * Unlimited substitutions (futsal rules)
   * Position matching: try to replace with same position, fallback to any
   */
  private makeSubstitution(state: LiveMatchState, team: 'home' | 'away', tiredPlayer: OnCourtPlayer): void {
    const bench = this.getBench(state, team);
    const lineup = this.getLineup(state, team);
    const suspendedPlayers = state.suspendedPlayers[team];

    if (bench.length === 0) return; // No substitutes available

    // Filter out suspended players from available substitutes
    const availableBench = bench.filter(p => !suspendedPlayers.includes(p.id));

    if (availableBench.length === 0) return; // No available substitutes (all suspended)

    // Try to find a player in the same position
    let substitute = availableBench.find(p => p.position === tiredPlayer.player.position);

    // If no exact position match, find the freshest player regardless of position
    if (!substitute) {
      // Find player with highest energy
      let maxEnergy = -1;
      for (const player of availableBench) {
        if (player.energy > maxEnergy) {
          maxEnergy = player.energy;
          substitute = player;
        }
      }
    }

    if (!substitute) return; // Should never happen, but safety check

    // Remove substitute from bench
    const substituteIdx = bench.findIndex(p => p.id === substitute!.id);
    if (substituteIdx === -1) return;
    bench.splice(substituteIdx, 1);

    // Find tired player index in lineup
    const lineupIdx = lineup.findIndex(p => p.player.id === tiredPlayer.player.id);
    if (lineupIdx === -1) return; // Should never happen

    // Convert substitute to OnCourtPlayer using helper
    const freshPlayer = this.createOnCourtPlayer(substitute, 100); // Fresh player with 100% energy

    // Replace tired player with fresh player
    lineup[lineupIdx] = freshPlayer;

    // Put tired player on bench (convert OnCourtPlayer back to PlayerWithTraits)
    bench.push(tiredPlayer.player);

    // Update substitution count
    if (team === 'home') {
      state.substitutions.used.home++;
    } else {
      state.substitutions.used.away++;
    }

    // Generate substitution event
    const teamId = this.getTeamId(state, team);
    state.events.push({
      minute: state.currentMinute,
      type: 'substitution',
      teamId,
      playerId: freshPlayer.player.id,
      playerName: freshPlayer.player.name,
      description: `${tiredPlayer.player.name} OFF, ${freshPlayer.player.name} ON (${Math.round(tiredPlayer.player.energy)}% energy)`
    });

    // Momentum boost from fresh legs (+5)
    this.updateMomentum(state, team, 5);
  }

  // ============================================================================
  // MOMENTUM SYSTEM
  // ============================================================================

  /**
   * Calculate momentum value with natural decay toward equilibrium (50)
   * Considers score differential, fatigue impact, and home advantage
   */
  private calculateMomentum(state: LiveMatchState, minute: number): number {
    let momentum = state.momentum.value;

    // Natural decay toward 50 (equilibrium)
    const decayRate = 1.5;
    if (momentum > 50) {
      momentum = Math.max(50, momentum - decayRate);
    } else if (momentum < 50) {
      momentum = Math.min(50, momentum + decayRate);
    }

    // Score differential impact (losing team gets slight momentum boost from desperation)
    const scoreDiff = state.score.home - state.score.away;
    if (scoreDiff > 0) {
      momentum += scoreDiff === 1 ? 1 : scoreDiff === 2 ? 0 : -2;
    } else if (scoreDiff < 0) {
      momentum += scoreDiff === -1 ? -1 : scoreDiff === -2 ? 0 : 2;
    }

    // Fatigue impact (more tired team loses momentum)
    const homeFatigue = this.calculateTeamFatigue(state.homeLineup);
    const awayFatigue = this.calculateTeamFatigue(state.awayLineup);
    const fatigueImpact = (awayFatigue - homeFatigue) / 10; // Convert to momentum scale
    momentum += fatigueImpact;

    // Home advantage (constant slight bias)
    momentum += 0.5;

    // Clamp to 0-100 range
    return Math.max(0, Math.min(100, momentum));
  }

  /**
   * Apply momentum changes based on match events
   * Different events have different momentum impacts
   */
  private applyEventMomentum(event: MatchEvent, state: LiveMatchState): void {
    // Map event types to config momentum values
    const eventTypeMap: Record<string, keyof typeof CONFIG.momentum.events> = {
      'goal': 'goal',
      'shot': 'shot',
      'tackle': 'tackle',
      'interception': 'interception',
      'block': 'block',
      'foul': 'foul',
      'yellow_card': 'yellowCard',
      'red_card': 'redCard',
      'corner': 'corner',
      'dribble': 'dribbleSuccess'
    };

    const configKey = eventTypeMap[event.type];
    const change = configKey ? CONFIG.momentum.events[configKey] : 0;

    if (change !== 0) {
      // Apply change based on which team generated the event
      if (event.teamId === state.homeTeamId) {
        state.momentum.value += change;
      } else {
        state.momentum.value -= change;
      }

      // Update last change time
      state.momentum.lastUpdate = state.currentMinute;

      // Clamp to valid range
      state.momentum.value = Math.max(0, Math.min(100, state.momentum.value));

      // Update trend based on current value
      if (state.momentum.value > 60) {
        state.momentum.trend = 'home';
      } else if (state.momentum.value < 40) {
        state.momentum.trend = 'away';
      } else {
        state.momentum.trend = 'neutral';
      }
    }
  }

  /**
   * Calculate average team fatigue (0-100, where 100 = completely exhausted)
   */
  private calculateTeamFatigue(lineup: OnCourtPlayer[]): number {
    if (lineup.length === 0) return 0;

    const totalEnergyLoss = lineup.reduce((sum, p) => sum + (100 - p.player.energy), 0);
    return totalEnergyLoss / lineup.length;
  }

  /**
   * Calculate goalkeeper effectiveness multiplier (0.7-1.3 scale)
   * Based on GK-specific attributes: reflexes, handling, positioning, composure
   */
  private calculateGKEffectiveness(goalkeeper: OnCourtPlayer): number {
    const attrs = goalkeeper.effectiveAttributes;

    // Use GK-specific attributes if available, otherwise use field player attributes as fallback
    const reflexes = attrs.reflexes ?? 60; // Fallback to agility
    const handling = attrs.handling ?? 40; // Fallback to ball control
    const gkPositioning = attrs.gkPositioning ?? 30; // Fallback to positioning
    const composure = attrs.composure;

    // Calculate average GK skill (0-200 scale)
    const avgGKSkill = (reflexes * CONFIG.goalkeeper.skillWeight.reflexes + handling * CONFIG.goalkeeper.skillWeight.handling + gkPositioning * CONFIG.goalkeeper.skillWeight.positioning + composure * CONFIG.goalkeeper.skillWeight.composure) / (CONFIG.goalkeeper.skillWeight.reflexes + CONFIG.goalkeeper.skillWeight.handling + CONFIG.goalkeeper.skillWeight.positioning + CONFIG.goalkeeper.skillWeight.composure);
    const effectiveness = avgGKSkill / 200 * 0.6 + 0.6; // Scale to 0.6-1.2 range

    return Math.max(0.6, Math.min(1.2, effectiveness));
  }

  // ============================================================================
  // SHOT RESOLUTION SYSTEM
  // ============================================================================

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
    
    shooter.performance.rating += CONFIG.ratings.weights.missedShots;
    
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

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

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
   * Get goalkeeper for specified team
   * Falls back to first player if no goalkeeper found
   */
  private getGoalkeeper(state: LiveMatchState, team: 'home' | 'away'): OnCourtPlayer {
    const lineup = this.getLineup(state, team);
    return lineup.find(p => p.player.position === 'Goalkeeper') || lineup[0];
  }

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

}

