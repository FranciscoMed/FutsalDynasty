import type { IStorage } from "./storage";
import type { Match, SimulationSummary, SimulationResult } from "@shared/schema";
import { simulateQuick } from "./lightweightMatchEngine";

/**
 * Match Simulator
 * Handles background simulation of AI matches
 */
export class MatchSimulator {
  constructor(private storage: IStorage) {}

  /**
   * Simulate a single match in the background without detailed events
   */
  async simulateMatchInBackground(
    saveGameId: number,
    userId: number,
    matchId: number
  ): Promise<SimulationResult | null> {
    try {
      const match = await this.storage.getMatch(saveGameId, userId, matchId);
      if (!match) {
        console.error(`Match ${matchId} not found`);
        return null;
      }

      // Skip if already played
      if (match.played) {
        return null;
      }

      // Get teams and players
      const homePlayers = await this.storage.getPlayersByTeam(saveGameId, userId, match.homeTeamId);
      const awayPlayers = await this.storage.getPlayersByTeam(saveGameId, userId, match.awayTeamId);

      if (homePlayers.length === 0 || awayPlayers.length === 0) {
        console.error(`Missing players for match ${matchId}`);
        return null;
      }

      // Simulate match quickly
      const result = simulateQuick(homePlayers, awayPlayers);

      // Update match in database
      await this.storage.updateMatch(saveGameId, userId, matchId, {
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        played: true,
        events: [], // No events for background matches
        homeStats: {
          possession: 50,
          shots: result.homeScore * 3 + Math.floor(Math.random() * 5),
          shotsOnTarget: result.homeScore * 2 + Math.floor(Math.random() * 3),
          passes: 200 + Math.floor(Math.random() * 100),
          passAccuracy: 70 + Math.floor(Math.random() * 20),
          tackles: 10 + Math.floor(Math.random() * 10),
          corners: Math.floor(Math.random() * 8),
          fouls: Math.floor(Math.random() * 15) + 5,
          saves: result.awayScore + Math.floor(Math.random() * 3),
        },
        awayStats: {
          possession: 50,
          shots: result.awayScore * 3 + Math.floor(Math.random() * 5),
          shotsOnTarget: result.awayScore * 2 + Math.floor(Math.random() * 3),
          passes: 200 + Math.floor(Math.random() * 100),
          passAccuracy: 70 + Math.floor(Math.random() * 20),
          tackles: 10 + Math.floor(Math.random() * 10),
          corners: Math.floor(Math.random() * 8),
          fouls: Math.floor(Math.random() * 15) + 5,
          saves: result.homeScore + Math.floor(Math.random() * 3),
        },
        playerRatings: {}, // No individual ratings for background matches
      });

      console.log(
        `✓ Simulated match ${matchId}: ${match.homeTeamId} ${result.homeScore}-${result.awayScore} ${match.awayTeamId}`
      );

      return {
        matchId,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        competitionId: match.competitionId,
      };
    } catch (error) {
      console.error(`Error simulating match ${matchId}:`, error);
      return null;
    }
  }

  /**
   * Simulate all matches on a given date (excluding user team matches)
   */
  async simulateAllMatchesOnDate(
    saveGameId: number,
    userId: number,
    date: string,
    playerTeamId: number
  ): Promise<SimulationSummary> {
    try {
      // Get all matches on this date
      const allMatches = await this.storage.getAllMatches(saveGameId, userId);
      const matchDate = new Date(date).toISOString().split("T")[0];

      const matchesOnDate = allMatches.filter((match) => {
        const mDate = new Date(match.date).toISOString().split("T")[0];
        return mDate === matchDate && !match.played;
      });

      if (matchesOnDate.length === 0) {
        return { matchesSimulated: 0, results: [] };
      }

      // Filter out user team matches
      const matchesToSimulate = matchesOnDate.filter(
        (match) =>
          !this.shouldSkipMatch(match, playerTeamId)
      );

      console.log(
        `Found ${matchesOnDate.length} matches on ${matchDate}, simulating ${matchesToSimulate.length} (${matchesOnDate.length - matchesToSimulate.length} involve user team)`
      );

      // Simulate all matches in parallel for speed
      const simulationPromises = matchesToSimulate.map((match) =>
        this.simulateMatchInBackground(saveGameId, userId, match.id)
      );

      const results = await Promise.all(simulationPromises);

      // Filter out null results (failed simulations)
      const successfulResults = results.filter(
        (result): result is SimulationResult => result !== null
      );

      console.log(
        `✅ Successfully simulated ${successfulResults.length} matches on ${matchDate}`
      );

      return {
        matchesSimulated: successfulResults.length,
        results: successfulResults,
      };
    } catch (error) {
      console.error(`Error simulating matches on ${date}:`, error);
      return { matchesSimulated: 0, results: [] };
    }
  }

  /**
   * Determine if a match should be skipped (user team involved)
   */
  private shouldSkipMatch(match: Match, playerTeamId: number): boolean {
    // Skip if already played
    if (match.played) {
      return true;
    }

    // Skip if user team is involved
    if (match.homeTeamId === playerTeamId || match.awayTeamId === playerTeamId) {
      return true;
    }

    return false;
  }
}
