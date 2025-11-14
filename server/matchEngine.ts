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
// ENHANCED MATCH ENGINE - Phase 1-5 Implementation
// ============================================================================

import { MatchEngineConfig as CONFIG } from './matchEngineConfig';

export class MatchEngine {
  private storage: IStorage;
  private traitEngine: TraitEngine; // Phase 5: Trait-based player selection
  private statisticsEngine: StatisticsEngine; // Statistics tracking

  // Match state
  private homeTeamQuality: number = 0;
  private awayTeamQuality: number = 0;
  private homeExpectedGoals: number = 0;
  private awayExpectedGoals: number = 0;

  // Real-time match state (Phase 6)
  private currentState: LiveMatchState | null = null;
  private isRealTimeMatch: boolean = false;

  // Debug counters
  private homePossCounter: number = 0;
  private awayPossCounter: number = 0;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.traitEngine = new TraitEngine(); // Phase 5: Initialize trait engine
    this.statisticsEngine = new StatisticsEngine(storage); // Initialize statistics engine
  }

  // ============================================================================
  // PHASE 6: REAL-TIME MATCH SUPPORT
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
  // END PHASE 6: REAL-TIME MATCH SUPPORT
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

    // Phase 4: Create bench players (all remaining players)
    const homeBench = homePlayers.slice(5).map(p => ({
      ...p,
      traits: [] as any,
      energy: 100,
      minutesPlayedThisMatch: 0
    }));
    const awayBench = awayPlayers.slice(5).map(p => ({
      ...p,
      traits: [] as any,
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
      // Phase 4: Substitution tracking
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
      // Phase 3: Load tactical setups from team data, default to balanced if not set
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
   * Phase 5.3: Mental traits can boost entire team performance
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
    return players.map(player => {
      const playerWithTraits: PlayerWithTraits = {
        ...player,
        traits: [], // TODO: Load from player data in future
        energy: 100,
        minutesPlayedThisMatch: 0
      };

      return {
        player: playerWithTraits,
        effectiveAttributes: {
          shooting: player.attributes.shooting,
          passing: player.attributes.passing,
          dribbling: player.attributes.dribbling,
          pace: player.attributes.pace,
          tackling: player.attributes.tackling,
          positioning: player.attributes.positioning,
          marking: player.attributes.marking
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
    });
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

    // Phase 4: Update momentum with natural decay
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

    // Phase 4: Check for auto-substitutions (after fatigue update)
    this.checkSubstitutions(state);

    // Update player fatigue
    this.updatePlayerFatigue(state);
  }

  /**
   * Check if any players can return from red card suspensions
   * Futsal rules: Player can return after 2 minutes OR when opponent scores
   */
  private checkRedCardReturns(state: LiveMatchState): void {
    // Check both teams
    for (const team of ['home', 'away'] as const) {
      const redCards = state.redCards[team];
      const lineup = team === 'home' ? state.homeLineup : state.awayLineup;
      const bench = team === 'home' ? state.substitutions.homeBench : state.substitutions.awayBench;
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
            const onCourtPlayer: OnCourtPlayer = {
              player: availableSubstitute,
              effectiveAttributes: {
                shooting: availableSubstitute.attributes.shooting,
                passing: availableSubstitute.attributes.passing,
                dribbling: availableSubstitute.attributes.dribbling,
                pace: availableSubstitute.attributes.pace,
                tackling: availableSubstitute.attributes.tackling,
                positioning: availableSubstitute.attributes.positioning,
                marking: availableSubstitute.attributes.marking,
              },
              performance: {
                shots: 0,
                passes: 0,
                tackles: 0,
                interceptions: 0,
                fouls: 0,
                rating: 7.0,
              }
            };

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
        const onCourtPlayer: OnCourtPlayer = {
          player: availableSubstitute,
          effectiveAttributes: {
            shooting: availableSubstitute.attributes.shooting,
            passing: availableSubstitute.attributes.passing,
            dribbling: availableSubstitute.attributes.dribbling,
            pace: availableSubstitute.attributes.pace,
            tackling: availableSubstitute.attributes.tackling,
            positioning: availableSubstitute.attributes.positioning,
            marking: availableSubstitute.attributes.marking,
          },
          performance: {
            shots: 0,
            passes: 0,
            tackles: 0,
            interceptions: 0,
            fouls: 0,
            rating: 7.0,
          }
        };

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
    const tactics = team === 'home' ? state.homeTactics : state.awayTactics;
    const opposingTactics = team === 'home' ? state.awayTactics : state.homeTactics;

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
      console.log(`[MatchEngine] Home team fly-goalkeeper active: ${adjustedChance.toFixed(2)}`);
    }
    if (awayFlyGK) {
      adjustedChance -= CONFIG.flyGoalkeeper.modifiers.possession;
      console.log(`[MatchEngine] Away team fly-goalkeeper active: ${adjustedChance.toFixed(2)}`);
    }

    adjustedChance = Math.max(CONFIG.possession.minChance, Math.min(CONFIG.possession.maxChance, adjustedChance));

    if (Math.random() < CONFIG.possession.changeChance) {
      state.possession = Math.random() < adjustedChance ? 'home' : 'away';

      console.log(`[MatchEngine] Possession changed to ${state.possession} (Chance: ${adjustedChance.toFixed(2)})`);
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
    console.log(`[MatchEngine] Tick ${state.currentTick} - Possession: ${state.possession} (Home Poss Count: ${this.homePossCounter}, Away Poss Count: ${this.awayPossCounter})`);

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

    // Phase 3: Get tactical modifiers for attacking team
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

    // Phase 5.3: Apply team mental modifiers (leader, comeback boost)
    const attackingLineup = attackingTeam === 'home' ? state.homeLineup : state.awayLineup;
    const teamMentalModifier = this.applyTeamMentalModifiers(attackingLineup, attackingTeam, state);
    shotProb *= teamMentalModifier;

    // Phase 3: Apply tactical modifiers
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
   * Phase 3: Calculate tactical modifiers based on team tactics
   * Returns multiplier for shot frequency and defensive resistance
   */
  private getTacticalModifiers(
    team: 'home' | 'away',
    state: LiveMatchState,
    minute: number
  ): { shotFrequency: number; defense: number; foulRate: number; fatigueRate: number } {
    const tactics = team === 'home' ? state.homeTactics : state.awayTactics;

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
   * Phase 3: Get formation modifiers for offensive/defensive balance
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
    const defendingTeam = attackingTeam === 'home' ? 'away' : 'home';

    // Calculate defensive resistance
    const defendingLineup = defendingTeam === 'home' ? state.homeLineup : state.awayLineup;
    const defensiveResistance = this.calculateDefensiveResistance(defendingLineup, state, defendingTeam);

    // Check if defense prevents shot (10-20% prevention rate based on resistance)
    const preventionChance = (defensiveResistance / 100) * 0.15; // Up to 15% base prevention

    // Counter-attacks are harder to prevent (defense out of position)
    const adjustedPrevention = isCounter ? preventionChance * 0.3 : preventionChance;

    if (Math.random() < adjustedPrevention) {
      // Shot blocked/prevented by defense
      // Phase 5: Select defender (trait-based: anticipates, staysBackAtAllTimes)
      const defender = this.selectDefender(defendingLineup, 'intercept', defendingTeam, state);
      defender.performance.rating += 0.05; // Small bonus for preventing shot

      // Track block statistic
      state.statistics.blocks[defendingTeam]++;

      state.events.push({
        minute: state.currentMinute,
        type: 'block',
        playerId: defender.player.id,
        playerName: defender.player.name,
        teamId: state[`${defendingTeam}TeamId`],
        description: `${defender.player.name} blocks the shot attempt!`
      });
      return; // Shot prevented, exit
    }

    // Phase 5: Select shooter (trait-based: finisher, playsWithFlair, attemptsLongShots)
    const lineup = attackingTeam === 'home' ? state.homeLineup : state.awayLineup;
    const shooter = this.selectShooter(lineup, 'finish', attackingTeam, state);

    // Calculate shot quality
    let quality = this.calculateShotQuality(shooter, state);
    if (isCounter) {
      quality += 0.20; // Counter-attack bonus
    }

    // Reduce shot quality based on defensive resistance (8-15% reduction)
    const qualityReduction = (defensiveResistance / 100) * 0.15; // Up to 15% reduction
    quality *= (1 - qualityReduction);

    quality = Math.max(0.3, Math.min(1.0, quality)); // Ensure reasonable range

    // Update statistics
    state.statistics.shots[attackingTeam]++;
    shooter.performance.shots++;

    // Check if on target (higher base rate for futsal)
    const onTargetProb = CONFIG.shooting.onTargetBase * quality;
    const isOnTarget = Math.random() < onTargetProb;

    if (isOnTarget) {
      state.statistics.shotsOnTarget[attackingTeam]++;

      // Check goalkeeper save
      const goalkeeper = defendingTeam === 'home'
        ? state.homeLineup.find(p => p.player.position === 'Goalkeeper')
        : state.awayLineup.find(p => p.player.position === 'Goalkeeper');

      if (goalkeeper) {
        const saveProb = CONFIG.goalkeeper.minSaveChance * (goalkeeper.player.attributes.reflexes || 20) / 20;  // Further reduced from 0.25
        if (Math.random() < saveProb) {
          // Saved!
          state.statistics.saves[defendingTeam]++;
          goalkeeper.performance.rating += CONFIG.ratings.weights.saves; // Small bonus for save
          shooter.performance.rating += CONFIG.ratings.weights.shotsOnTarget; // Small penalty for not scoring
          state.events.push({
            minute: state.currentMinute,
            type: 'shot',
            playerId: shooter.player.id,
            playerName: shooter.player.name,
            teamId: state[`${attackingTeam}TeamId`],
            description: `${shooter.player.name}'s shot is saved!`,
            shotQuality: quality,
            isCounter
          });
          return;
        } else {
          // Failed to save
          goalkeeper.performance.rating += CONFIG.ratings.weights.goalsConceded; // Penalty for conceding
        }
      }

      // Check for goal
      let goalProb = 0.7 * quality;  // Increased to 0.70 for better conversion

      // Fly-goalkeeper vulnerability: counter-attacks are much more dangerous
      if (isCounter && this.isFlyGoalkeeperActive(defendingTeam, state)) {
        goalProb *= (1 + CONFIG.flyGoalkeeper.modifiers.counterVulnerability);
      }

      if (Math.random() < goalProb) {
        // GOAL!
        state.score[attackingTeam]++;
        shooter.performance.rating += CONFIG.ratings.weights.goals;

        // Check for red card player returns (opponent scored)
        this.checkRedCardReturnAfterGoal(state, defendingTeam);

        // Penalty for defending team - all players lose rating for conceding
        const defendingLineup = defendingTeam === 'home' ? state.homeLineup : state.awayLineup;
        defendingLineup.forEach(p => {
          p.performance.rating -= CONFIG.ratings.weights.goalsConceded; // Team penalty for goal conceded
        });

        // Determine if there's an assist
        let assisterId: number | undefined;
        let assisterName: string | undefined;
        const assistProb = 0.80;

        if (Math.random() < assistProb) {
          // Select a random teammate
          // Goalkeepers can assist but with reduced weight
          const lineup = attackingTeam === 'home' ? state.homeLineup : state.awayLineup;
          const potentialAssisters = lineup.filter(
            p => p.player.id !== shooter.player.id
          );

          if (potentialAssisters.length > 0) {
            // Weight selection by passing and positioning attributes
            // Goalkeepers get 25% weight to reflect their reduced involvement in assists
            const weights = potentialAssisters.map(p => {
              const passing = p.effectiveAttributes.passing || 10;
              const positioning = p.effectiveAttributes.positioning || 10;
              const baseWeight = (passing + positioning) / 2;

              // Reduce weight for goalkeepers
              return p.player.position === 'Goalkeeper' ? baseWeight * 0.25 : baseWeight;
            });

            const totalWeight = weights.reduce((sum, w) => sum + w, 0);
            let random = Math.random() * totalWeight;

            for (let i = 0; i < potentialAssisters.length; i++) {
              random -= weights[i];
              if (random <= 0) {
                const assister = potentialAssisters[i];
                assisterId = assister.player.id;
                assisterName = assister.player.name;
                assister.performance.rating += 0.3; // Assist bonus
                break;
              }
            }
          }
        }

        // Check if goal was scored against fly-goalkeeper
        const isFlyGKGoal = isCounter && this.isFlyGoalkeeperActive(defendingTeam, state);
        const goalDescription = `GOAL! ${shooter.player.name} scores!${assisterName ? ` (Assist: ${assisterName})` : ''}${isCounter ? ' (Counter-attack)' : ''}${isFlyGKGoal ? ' - GK out of position!' : ''}`;

        state.events.push({
          minute: state.currentMinute,
          type: 'goal',
          playerId: shooter.player.id,
          playerName: shooter.player.name,
          teamId: state[`${attackingTeam}TeamId`],
          assistId: assisterId,
          assistName: assisterName,
          description: goalDescription,
          shotQuality: quality,
          isCounter,
          goalContext: isFlyGKGoal ? 'counter_vs_flyGK' : (isCounter ? 'counter_attack' : 'open_play')
        });

        // Update momentum
        this.updateMomentum(state, attackingTeam, 15);
        return;
      }
    }

    // Miss or woodwork - small penalty for not scoring
    shooter.performance.rating -= 0.03;
    state.events.push({
      minute: state.currentMinute,
      type: 'shot',
      playerId: shooter.player.id,
      playerName: shooter.player.name,
      teamId: state[`${attackingTeam}TeamId`],
      description: `${shooter.player.name} shoots ${isOnTarget ? 'wide' : 'off target'}!`,
      shotQuality: quality,
      isCounter
    });
  }

  /**
   * Calculate shot quality (0-1 scale)
   */
  private calculateShotQuality(player: OnCourtPlayer, state: LiveMatchState): number {
    let quality = 0.5; // Base

    // Player attributes (using fatigue-modified effective attributes)
    quality += (player.effectiveAttributes.shooting / 100) * 0.3;
    quality += (player.effectiveAttributes.positioning / 100) * 0.2;

    // Phase 4: Momentum effect on shot quality (±15%)
    // Determine which team the player belongs to
    const isHomePlayer = state.homeLineup.some(p => p.player.id === player.player.id);
    const teamMomentum = isHomePlayer ? state.momentum.value : (100 - state.momentum.value);
    const momentumModifier = ((teamMomentum - 50) / 100) * 0.30; // ±0.15 (±15%)
    quality *= (1 + momentumModifier);

    // Phase 5.3: Mental trait performance modifiers
    const mentalModifier = this.traitEngine.getMentalTraitModifier(player.player, {
      minute: state.currentMinute,
      score: state.score,
      isImportantMatch: false, // TODO: Add important match tracking
      actionType: 'shot',
      team: isHomePlayer ? 'home' : 'away'
    });
    quality *= mentalModifier;

    // Phase 5.3: Apply variance modifier for consistent/inconsistent players
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
    const defendingTeam = attackingTeam === 'home' ? 'away' : 'home';

    // Phase 5: Select attacker attempting the dribble (trait-based: attemptsToDribble, playsWithFlair, beatPlayerRepeatedly)
    const attackingLineup = attackingTeam === 'home' ? state.homeLineup : state.awayLineup;
    const attacker = this.selectPlayerForAction(
      '1v1',
      attackingLineup,
      attackingTeam,
      state
    );

    // Phase 5: Select defender attempting the tackle (trait-based: hardTackler, anticipates)
    const defendingLineup = defendingTeam === 'home' ? state.homeLineup : state.awayLineup;
    const defender = this.selectDefender(
      defendingLineup,
      'tackle',
      defendingTeam,
      state
    );

    // Calculate 1v1 success based on attacker's dribbling vs defender's tackling
    const attackerSkill = attacker.effectiveAttributes.dribbling / 100;
    const defenderSkill = defender.effectiveAttributes.tackling / 100;

    // 50% base + skill differential (attacker favored slightly in futsal)
    const attackerWinProb = 0.45 + (attackerSkill * 0.35) - (defenderSkill * 0.25);

    if (Math.random() < attackerWinProb) {
      // Attacker wins 1v1 - beats defender
      attacker.performance.rating += 0.1; // Reward for winning dribble
      defender.performance.rating -= 0.15; // Penalty for losing defensive duel

      // Attacker keeps possession and might create a chance
      // No explicit event, but momentum shift
      this.updateMomentum(state, attackingTeam, 3);
    } else {
      // Defender wins 1v1 - successful tackle or interception
      state.possession = defendingTeam;
      defender.performance.rating += 0.1; // Reward for winning defensive duel
      attacker.performance.rating -= 0.15; // Penalty for losing dribble attempt

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

  /**
   * Generate a foul event
   */
  private generateFoulEvent(state: LiveMatchState): void {
    const attackingTeam = state.possession;
    const defendingTeam = attackingTeam === 'home' ? 'away' : 'home';

    // Phase 5: Select fouler (trait-based: hardTackler, aggressive)
    const fouler = this.selectDefender(
      defendingTeam === 'home' ? state.homeLineup : state.awayLineup,
      'tackle',
      defendingTeam,
      state
    );

    // Update statistics
    state.statistics.fouls[defendingTeam]++;
    state.accumulatedFouls[defendingTeam]++;
    fouler.performance.fouls++;
    fouler.performance.rating -= CONFIG.ratings.weights.fouls;

    // Check if this is the 6th+ accumulated foul (triggers 10m penalty)
    if (state.accumulatedFouls[defendingTeam] >= CONFIG.fouls.accumulatedFoulPenaltyThreshold) {
      // Trigger penalty kick from 10m (no wall)
      state.events.push({
        minute: state.currentMinute,
        type: 'foul',
        playerId: fouler.player.id,
        playerName: fouler.player.name,
        teamId: state[`${defendingTeam}TeamId`],
        description: `⚠️ Foul by ${fouler.player.name} - 10m PENALTY AWARDED (${state.accumulatedFouls[defendingTeam]} fouls)`
      });

      // Immediately execute the penalty kick
      this.generatePenaltyKick(state);
      return;
    }

    // Regular foul (under 6 accumulated fouls)
    // Determine foul severity based on timing and situation
    const isCriticalMoment = state.currentMinute > 35; // Late game fouls
    const isDesperateDefense = Math.abs(state.score.home - state.score.away) <= 1; // Close game

    // Determine if this foul is in a dangerous position (30% chance)
    // Dangerous fouls have a chance to generate a direct free-kick shot
    const isDangerousFoul = Math.random() < (0.30 + (isCriticalMoment ? CONFIG.fouls.lateGameDangerousBonus : 0));

    // Calculate card probability
    let cardProb = CONFIG.fouls.cards.baseCardChance; // Base %
    if (isCriticalMoment) cardProb += CONFIG.fouls.cards.lateGameBonus; // +% late in game
    if (isDesperateDefense) cardProb += CONFIG.fouls.cards.closeGameBonus; // +% in close games

    // Determine severity: light, moderate, or severe
    const severityRand = Math.random();
    let severity: 'light' | 'moderate' | 'severe';
    if (severityRand < CONFIG.fouls.severity.light) {
      severity = 'light'; // % light fouls
    } else if (severityRand < CONFIG.fouls.severity.moderate + CONFIG.fouls.severity.light) {
      severity = 'moderate'; // % moderate fouls
    } else {
      severity = 'severe'; // % severe fouls
    }

    // Determine card type based on severity
    if (Math.random() < cardProb) {
      let cardType: 'yellow' | 'red';
      let isSecondYellow = false;

      // Check if player already has a yellow card
      const yellowCards = state.yellowCards[defendingTeam];
      const hasYellowCard = yellowCards.includes(fouler.player.id);

      if (severity === 'severe') {
        cardType = 'red'; // Severe fouls always get red
      } else if (severity === 'moderate') {
        cardType = Math.random() < CONFIG.fouls.cards.redCardChance ? 'red' : 'yellow'; // % yellow, % red
      } else {
        cardType = Math.random() < 0.99 ? 'yellow' : 'red'; // 95% yellow, 5% red (rare)
      }

      // Second yellow = red card
      if (cardType === 'yellow' && hasYellowCard) {
        cardType = 'red';
        isSecondYellow = true;
        //console.log(`[MatchEngine] Second yellow card for ${fouler.player.name}, upgraded to RED CARD.`);
      }

      const cardEmoji = cardType === 'yellow' ? '🟨' : '🟥';
      const severityDesc = severity === 'severe' ? ' (serious foul play)' : '';
      const secondYellowDesc = isSecondYellow ? ' (second yellow)' : '';

      state.events.push({
        minute: state.currentMinute,
        type: `${cardType}_card` as any,
        playerId: fouler.player.id,
        playerName: fouler.player.name,
        teamId: state[`${defendingTeam}TeamId`],
        description: `${cardEmoji} ${cardType.toUpperCase()} CARD for ${fouler.player.name}${severityDesc}${secondYellowDesc}!`
      });

      if (cardType === 'red') {
        // Red card: remove player from lineup temporarily (plays with 4 players)
        const lineup = defendingTeam === 'home' ? state.homeLineup : state.awayLineup;
        const bench = defendingTeam === 'home' ? state.substitutions.homeBench : state.substitutions.awayBench;
        const index = lineup.findIndex(p => p.player.id === fouler.player.id);

        if (index !== -1) {
          // Remove player from lineup
          const expelledPlayer = lineup.splice(index, 1)[0];

          // Add to red card tracking (can return after 2 minutes OR when opponent scores)
          const redCardRecord = {
            playerId: fouler.player.id,
            playerName: fouler.player.name,
            tickIssued: state.currentTick,
            canReturnAt: state.currentTick + 8, // 2 minutes = 8 ticks (4 ticks per minute)
            returnCondition: 'time' as const
          };

          state.redCards[defendingTeam].push(redCardRecord);

          // Add to suspended players list (cannot be selected for substitution)
          state.suspendedPlayers[defendingTeam].push(fouler.player.id);

          // Move expelled player to bench (keeps their energy level)
          bench.push(expelledPlayer.player);

          // Red card rating penalty
          fouler.performance.rating += CONFIG.ratings.weights.redCard;

          //console.log(`[MatchEngine] RED CARD: ${fouler.player.name} sent off. Team ${defendingTeam} plays with ${lineup.length} players. Can return at ${redCardRecord.canReturnAt}`);
        }

        // Significant momentum swing for red card
        this.updateMomentum(state, attackingTeam, 20);
      } else {
        // Yellow card: track player and apply rating penalty
        if (!yellowCards.includes(fouler.player.id)) {
          yellowCards.push(fouler.player.id);
        }
        fouler.performance.rating += CONFIG.ratings.weights.yellowCard;
      }
    } else {
      // No card, just foul
      state.events.push({
        minute: state.currentMinute,
        type: 'foul',
        playerId: fouler.player.id,
        playerName: fouler.player.name,
        teamId: state[`${defendingTeam}TeamId`],
        description: `Foul by ${fouler.player.name}`
      });
    }

    // Check if dangerous foul warrants a direct free-kick attempt
    if (isDangerousFoul) {
      // 50% chance the attacking team attempts a direct shot from the free-kick
      if (Math.random() < 0.50) {
        this.generateFreeKickShot(state);
      }
    }
  }

  /**
   * Generate a direct free-kick shot (from dangerous foul position)
   * Lower quality than 10m penalties (wall present, less favorable angle)
   */
  private generateFreeKickShot(state: LiveMatchState): void {
    const attackingTeam = state.possession;
    const defendingTeam = attackingTeam === 'home' ? 'away' : 'home';

    // Phase 5: Select shooter (trait-based: finisher, nerveless, attemptsLongShots)
    const attackers = attackingTeam === 'home' ? state.homeLineup : state.awayLineup;
    const shooter = this.selectShooter(attackers, 'finish', attackingTeam, state);

    // Select goalkeeper
    const defenders = defendingTeam === 'home' ? state.homeLineup : state.awayLineup;
    const goalkeeper = defenders.find(p => p.player.position === 'Goalkeeper') || defenders[0];

    // Lower probability than 10m penalty (wall is present, angle may be worse)
    const shooterSkill = shooter.effectiveAttributes.shooting / 100;
    const gkSkill = (goalkeeper.effectiveAttributes.positioning / 100);

    // Phase 5.3: Apply mental trait modifier for free kicks
    const isHomePlayer = attackingTeam === 'home';
    const mentalModifier = this.traitEngine.getMentalTraitModifier(shooter.player, {
      minute: state.currentMinute,
      score: state.score,
      isImportantMatch: false,
      actionType: 'freeKick',
      team: isHomePlayer ? 'home' : 'away'
    });

    let shotQuality = CONFIG.setPieces.freeKick.baseGoalChance +
      (shooterSkill * CONFIG.setPieces.freeKick.shooterSkillWeight) -
      (gkSkill * CONFIG.setPieces.freeKick.gkSkillWeight);
    shotQuality *= mentalModifier;
    shotQuality = Math.max(
      CONFIG.setPieces.freeKick.minGoalChance,
      Math.min(CONFIG.setPieces.freeKick.maxGoalChance, shotQuality)
    );

    // Update statistics
    state.statistics.shots[attackingTeam]++;
    shooter.performance.shots++;

    // Check if on target (70% chance for free kicks)
    const onTargetProb = CONFIG.setPieces.freeKick.onTargetChance;
    const isOnTarget = Math.random() < onTargetProb;

    if (isOnTarget) {
      state.statistics.shotsOnTarget[attackingTeam]++;

      // Check goalkeeper save (higher save rate than 10m penalties)
      const saveProb = 0.30 * (goalkeeper.player.attributes.reflexes || 20) / 20;

      if (Math.random() < saveProb) {
        // Saved!
        state.statistics.saves[defendingTeam]++;
        goalkeeper.performance.rating += 0.15;
        shooter.performance.rating -= 0.05;

        state.events.push({
          minute: state.currentMinute,
          type: 'shot',
          playerId: shooter.player.id,
          playerName: shooter.player.name,
          teamId: state[`${attackingTeam}TeamId`],
          description: `${shooter.player.name}'s free-kick is saved by ${goalkeeper.player.name}!`,
          shotQuality
        });
        return;
      }

      // Check for goal
      const goalProb = 0.55 * shotQuality;
      if (Math.random() < goalProb) {
        // GOAL from free-kick!
        state.score[attackingTeam]++;
        shooter.performance.rating += 0.7; // Bonus for free-kick goal

        // Check for red card player returns (opponent scored)
        this.checkRedCardReturnAfterGoal(state, defendingTeam);

        defenders.forEach(p => p.performance.rating -= 0.15);
        if (goalkeeper) goalkeeper.performance.rating -= 0.25;

        state.events.push({
          minute: state.currentMinute,
          type: 'goal',
          playerId: shooter.player.id,
          playerName: shooter.player.name,
          teamId: state[`${attackingTeam}TeamId`],
          description: `⚽ FREE-KICK GOAL! ${shooter.player.name} scores from the free-kick!`,
          shotQuality,
          goalContext: 'free_kick',
          assistId: undefined,
          assistName: undefined
        });

        this.updateMomentum(state, attackingTeam, 20);
        return;
      }
    }

    // Miss or off target
    shooter.performance.rating -= 0.03;
    state.events.push({
      minute: state.currentMinute,
      type: 'shot',
      playerId: shooter.player.id,
      playerName: shooter.player.name,
      teamId: state[`${attackingTeam}TeamId`],
      description: `${shooter.player.name}'s free-kick ${isOnTarget ? 'goes wide' : 'misses the target'}`,
      shotQuality
    });
  }

  /**
   * Generate a penalty kick from 10m (6th+ accumulated foul)
   * These are high-probability shots with no wall
   */
  private generatePenaltyKick(state: LiveMatchState): void {
    const attackingTeam = state.possession;
    const defendingTeam = attackingTeam === 'home' ? 'away' : 'home';

    // Phase 5: Select shooter (trait-based: finisher, nerveless, consistentPerformer)
    const attackers = attackingTeam === 'home' ? state.homeLineup : state.awayLineup;
    const shooter = this.selectShooter(attackers, 'finish', attackingTeam, state);

    // Select goalkeeper
    const defenders = defendingTeam === 'home' ? state.homeLineup : state.awayLineup;
    const goalkeeper = defenders.find(p => p.player.position === 'Goalkeeper') || defenders[0];

    // High probability shot - 10m penalty with no wall
    const shooterSkill = shooter.effectiveAttributes.shooting / 100;
    const gkSkill = goalkeeper.effectiveAttributes.positioning / 100;

    // Phase 5.3: Apply mental trait modifier for penalty kicks
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

    const isGoal = Math.random() < goalProbability;

    // Update statistics
    state.statistics.shots[attackingTeam]++;
    state.statistics.shotsOnTarget[attackingTeam]++;
    shooter.performance.shots++;

    if (isGoal) {
      // GOAL!
      state.score[attackingTeam]++;
      shooter.performance.rating += 0.5;

      // Check for red card player returns (opponent scored)
      this.checkRedCardReturnAfterGoal(state, defendingTeam);

      // Penalty for all defending players (goal conceded)
      defenders.forEach(p => {
        p.performance.rating -= 0.15;
      });

      // Additional penalty for goalkeeper
      goalkeeper.performance.rating -= 0.2;

      state.events.push({
        minute: state.currentMinute,
        type: 'goal',
        playerId: shooter.player.id,
        playerName: shooter.player.name,
        teamId: state[`${attackingTeam}TeamId`],
        description: `⚽ 10m free-kick GOAL! ${shooter.player.name} scores from 10m penalty!`,
        assistId: undefined,
        assistName: undefined,
        shotQuality: goalProbability,
        isCounter: false,
        goalContext: 'penalty_10m'
      });

      this.updateMomentum(state, attackingTeam, 15);
    } else {
      // Save or miss
      state.statistics.saves[defendingTeam]++;
      shooter.performance.rating -= 0.05;
      goalkeeper.performance.rating += 0.1;

      state.events.push({
        minute: state.currentMinute,
        type: 'shot',
        playerId: shooter.player.id,
        playerName: shooter.player.name,
        teamId: state[`${attackingTeam}TeamId`],
        description: `10m penalty saved by ${goalkeeper.player.name}!`
      });

      this.updateMomentum(state, defendingTeam, 5);
    }
  }

  /**
   * Generate a corner event
   */
  private generateCornerEvent(state: LiveMatchState): void {
    const attackingTeam = state.possession;
    const defendingTeam = attackingTeam === 'home' ? 'away' : 'home';

    state.statistics.corners[attackingTeam]++;

    state.events.push({
      minute: state.currentMinute,
      type: 'corner',
      playerId: 0,
      playerName: '',
      teamId: state[`${attackingTeam}TeamId`],
      description: `Corner for ${attackingTeam === 'home' ? 'home' : 'away'} team`
    });

    // 60% chance corner leads to a shot attempt (set piece)
    if (Math.random() < 0.60) {
      const attackingLineup = attackingTeam === 'home' ? state.homeLineup : state.awayLineup;
      // Phase 5: Select shooter (trait-based: finisher, attemptsLongShots)
      const shooter = this.selectShooter(attackingLineup, 'finish', attackingTeam, state);

      // Calculate defensive resistance (corners face organized defense)
      const defendingLineup = defendingTeam === 'home' ? state.homeLineup : state.awayLineup;
      const defensiveResistance = this.calculateDefensiveResistance(defendingLineup, state, defendingTeam);

      // Set piece shot quality (base + attributes - defense)
      let quality = 0.55; // Base set piece quality
      quality += (shooter.effectiveAttributes.shooting / 100) * 0.25;

      // Defensive resistance impact (set pieces face organized defense)
      const qualityReduction = (defensiveResistance / 100) * 0.40; // Up to 40% reduction for set pieces
      quality *= (1 - qualityReduction);

      quality = Math.max(0.3, Math.min(0.85, quality));

      // Update statistics
      state.statistics.shots[attackingTeam]++;
      shooter.performance.shots++;

      // Check if on target
      const onTargetProb = 0.70 * quality; // Set pieces slightly less accurate
      const isOnTarget = Math.random() < onTargetProb;

      if (isOnTarget) {
        state.statistics.shotsOnTarget[attackingTeam]++;

        // Check goalkeeper save
        const goalkeeper = defendingTeam === 'home'
          ? state.homeLineup.find(p => p.player.position === 'Goalkeeper')
          : state.awayLineup.find(p => p.player.position === 'Goalkeeper');

        if (goalkeeper) {
          const saveProb = 0.22 * (goalkeeper.player.attributes.reflexes || 20) / 20;
          if (Math.random() < saveProb) {
            // Saved!
            state.statistics.saves[defendingTeam]++;
            goalkeeper.performance.rating += 0.10;
            shooter.performance.rating -= 0.05;
            state.events.push({
              minute: state.currentMinute,
              type: 'shot',
              playerId: shooter.player.id,
              playerName: shooter.player.name,
              teamId: state[`${attackingTeam}TeamId`],
              description: `${shooter.player.name}'s corner kick shot is saved!`,
              shotQuality: quality
            });
            return;
          }
        }

        // Check for goal
        const goalProb = 0.65 * quality;
        if (Math.random() < goalProb) {
          // GOAL from corner!
          state.score[attackingTeam]++;
          shooter.performance.rating += 0.6; // Bonus for set piece goal

          // Check for red card player returns (opponent scored)
          this.checkRedCardReturnAfterGoal(state, defendingTeam);

          defendingLineup.forEach(p => p.performance.rating -= 0.15);
          if (goalkeeper) goalkeeper.performance.rating -= 0.20;

          state.events.push({
            minute: state.currentMinute,
            type: 'goal',
            playerId: shooter.player.id,
            playerName: shooter.player.name,
            teamId: state[`${attackingTeam}TeamId`],
            description: `⚽ GOAL! ${shooter.player.name} scores from the corner!`,
            shotQuality: quality,
            goalContext: 'corner'
          });

          this.updateMomentum(state, attackingTeam, 25);
        } else {
          // On target but no goal
          state.events.push({
            minute: state.currentMinute,
            type: 'shot',
            playerId: shooter.player.id,
            playerName: shooter.player.name,
            teamId: state[`${attackingTeam}TeamId`],
            description: `${shooter.player.name}'s corner kick shot goes wide`,
            shotQuality: quality
          });
        }
      } else {
        // Off target
        state.events.push({
          minute: state.currentMinute,
          type: 'shot',
          playerId: shooter.player.id,
          playerName: shooter.player.name,
          teamId: state[`${attackingTeam}TeamId`],
          description: `${shooter.player.name}'s corner kick misses`,
          shotQuality: quality
        });
      }
    }
  }

  /**
   * Generate a 1v1 dribble event
   */
  private generateDribbleEvent(state: LiveMatchState): void {
    const attackingTeam = state.possession;
    const defendingTeam = attackingTeam === 'home' ? 'away' : 'home';

    // Phase 5: Select attacker attempting dribble (trait-based: attemptsToDribble, playsWithFlair)
    const attackingLineup = attackingTeam === 'home' ? state.homeLineup : state.awayLineup;
    const attacker = this.selectPlayerForAction('1v1', attackingLineup, attackingTeam, state);

    // Phase 5: Select defender (trait-based: hardTackler, anticipates, marksOpponentTightly)
    const defendingLineup = defendingTeam === 'home' ? state.homeLineup : state.awayLineup;
    const defender = this.selectDefender(defendingLineup, 'tackle', defendingTeam, state);

    // Calculate dribble success probability
    const attackerSkill = (attacker.effectiveAttributes.dribbling + attacker.effectiveAttributes.pace) / 2;
    const defenderSkill = (defender.effectiveAttributes.tackling + defender.effectiveAttributes.positioning) / 2;

    let successProb = 0.5 + ((attackerSkill - defenderSkill) / 200); // ±25% based on skill diff
    successProb = Math.max(0.25, Math.min(0.75, successProb)); // Clamp to 25-75%

    if (Math.random() < successProb) {
      // Successful dribble
      attacker.performance.rating += 0.08; // Small reward
      defender.performance.rating -= 0.05; // Small penalty

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
      defender.performance.rating += 0.10;
      attacker.performance.rating -= 0.08;

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

    // Phase 4: Update last momentum change time
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
   * Phase 4: Update player fatigue each tick with intensity-based decay
   * Also recover stamina for bench players
   */
  private updatePlayerFatigue(state: LiveMatchState): void {
    // Phase 4: Calculate match intensity (affects fatigue rate)
    const intensity = this.calculateMatchIntensity(state, state.currentMinute);
    const intensityMultiplier = intensity / 100; // 0-1 scale

    // Base fatigue: 0.5% per tick = 2% per minute (4 ticks/minute)
    // With intensity, can reach 1% per tick = 4% per minute in high-intensity moments
    const baseFatiguePerTick = 0.5;

    // Bench recovery: 0.4% per tick = 1.6% per minute (slower than decay, but allows rotation)
    const baseRecoveryPerTick = 0.4;

    // Phase 3: Get tactical fatigue modifiers
    const homeFatigueModifier = this.getTacticalModifiers('home', state, state.currentMinute).fatigueRate;
    const awayFatigueModifier = this.getTacticalModifiers('away', state, state.currentMinute).fatigueRate;

    state.homeLineup.forEach(player => {
      // Phase 4: Fatigue = base * intensity * tactics * fitness * stamina
      // Stamina attribute (1-200): High stamina = less fatigue
      const staminaAttribute = player.player.attributes.stamina || 100;
      const staminaMultiplier = 1.5 - (staminaAttribute / 400); // Range: 1.0 (200 stamina) to 1.5 (1 stamina)

      const fitnessMultiplier = 1 + ((100 - player.player.fitness) / 100);
      const fatiguePerTick = baseFatiguePerTick * (1 + intensityMultiplier) * homeFatigueModifier * fitnessMultiplier * staminaMultiplier;

      player.player.energy = Math.max(0, player.player.energy - fatiguePerTick);
      player.player.minutesPlayedThisMatch = state.currentMinute;

      // Phase 4: Apply fatigue to effective attributes (50%-100% effectiveness)
      this.applyFatigueToAttributes(player);
    });

    state.awayLineup.forEach(player => {
      // Phase 4: Fatigue = base * intensity * tactics * fitness * stamina

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

      // Phase 4: Apply fatigue to effective attributes (50%-100% effectiveness)
      this.applyFatigueToAttributes(player);
    });

    // Phase 4: Bench players recover stamina based on their stamina attribute
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
   * Phase 4: Apply fatigue penalty to player's effective attributes
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
      tackling: baseAttrs.tackling * (0.7 + energyRatio * 0.3),

      // Pace: 50% max degradation (most affected by fatigue)
      pace: baseAttrs.pace * (0.5 + energyRatio * 0.5),

      // Positioning/Marking: 20% max degradation (least affected, more mental)
      positioning: baseAttrs.positioning * (0.8 + energyRatio * 0.2),
      marking: baseAttrs.marking * (0.8 + energyRatio * 0.2)
    };
  }

  /**
   * Phase 4: Calculate match intensity (0-100)
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

    // Base resistance (0-100 scale)
    let resistance = (avgTackling + avgPositioning + avgMarking) / 3;

    // Phase 3: Apply tactical defensive modifier
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
  // PHASE 5: TRAIT-BASED PLAYER SELECTION
  // ============================================================================

  /**
   * Phase 5: Select player for action based on traits
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
   * Phase 5: Select shooter with trait-based weighting
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
   * Phase 5: Select defender with trait-based weighting
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
  // PHASE 4: SUBSTITUTION SYSTEM
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
    const bench = team === 'home' ? state.substitutions.homeBench : state.substitutions.awayBench;
    const lineup = team === 'home' ? state.homeLineup : state.awayLineup;
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

    // Convert substitute to OnCourtPlayer
    const freshPlayer: OnCourtPlayer = {
      player: {
        ...substitute,
        traits: [],
        energy: 100, // Fresh player
        minutesPlayedThisMatch: 0
      },
      effectiveAttributes: {
        shooting: substitute.attributes.shooting,
        passing: substitute.attributes.passing,
        dribbling: substitute.attributes.dribbling,
        pace: substitute.attributes.pace,
        tackling: substitute.attributes.tackling,
        positioning: substitute.attributes.positioning,
        marking: substitute.attributes.marking
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
    const teamId = team === 'home' ? state.homeTeamId : state.awayTeamId;
    state.events.push({
      minute: state.currentMinute,
      type: 'substitution',
      teamId,
      playerId: freshPlayer.player.id,
      playerName: freshPlayer.player.name,
      description: `${tiredPlayer.player.name} OFF, ${freshPlayer.player.name} ON (${Math.round(tiredPlayer.player.energy)}% energy)`
    });

    // Phase 4: Momentum boost from fresh legs (+5)
    this.updateMomentum(state, team, 5);
  }

  // ============================================================================
  // PHASE 4: MOMENTUM SYSTEM
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

  // ============================================================================
  // LEGACY METHODS (for backward compatibility)
  // ============================================================================

  /**
   * @deprecated Use calculateTeamQuality instead
   */
  private calculateTeamRating(players: Player[]): number {
    return this.calculateTeamQuality(players);
  }
}
