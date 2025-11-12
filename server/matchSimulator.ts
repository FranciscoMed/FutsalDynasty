import type { IStorage } from "./storage";
import type { Match, SimulationSummary, SimulationResult } from "@shared/schema";
import { MatchEngine } from "./matchEngine";

/**
 * Match Simulator
 * Handles background simulation of AI matches using the full MatchEngine
 */
export class MatchSimulator {
  private matchEngine: MatchEngine;

  constructor(private storage: IStorage) {
    this.matchEngine = new MatchEngine(storage);
  }

  /**
   * Simulate a single match in the background using the full match engine
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

      // Simulate the match using the full match engine
      const simulatedMatch = await this.matchEngine.simulateMatch(
        saveGameId,
        userId,
        matchId,
        false // Not real-time
      );

      console.log(
        `✓ Simulated match ${matchId}: Team ${simulatedMatch.homeTeamId} ${simulatedMatch.homeScore}-${simulatedMatch.awayScore} Team ${simulatedMatch.awayTeamId}`
      );

      return {
        matchId,
        homeTeamId: simulatedMatch.homeTeamId,
        awayTeamId: simulatedMatch.awayTeamId,
        homeScore: simulatedMatch.homeScore!,
        awayScore: simulatedMatch.awayScore!,
        competitionId: simulatedMatch.competitionId,
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
