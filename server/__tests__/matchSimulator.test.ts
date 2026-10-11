import { afterEach, describe, expect, it, vi } from "vitest";
import type { GameState, Match } from "@shared/schema";
import { MatchEngine } from "../matchEngine";
import { MatchSimulator } from "../matchSimulator";
import type { IStorage } from "../storage";

const SAVE_GAME_ID = 7;
const USER_ID = 11;
const USER_TEAM_ID = 1;
const MATCH_DATE = new Date("2024-08-15T00:00:00.000Z");

function createMatch(id: number, homeTeamId: number, awayTeamId: number, played = false): Match {
  return {
    id,
    competitionId: 2,
    competitionType: "league",
    homeTeamId,
    awayTeamId,
    homeScore: played ? 3 : 0,
    awayScore: played ? 2 : 0,
    date: MATCH_DATE,
    played,
    events: [],
    homeStats: {} as Match["homeStats"],
    awayStats: {} as Match["awayStats"],
    playerRatings: {},
  };
}

function createFixture() {
  const matches = [
    createMatch(1, USER_TEAM_ID, 2, true),
    createMatch(2, 3, 4),
    createMatch(3, 5, 6),
    createMatch(4, 7, 8),
    createMatch(5, 9, 10),
  ];
  let completedWrites = 0;
  const storage = {
    getGameState: async () => ({ playerTeamId: USER_TEAM_ID }) as GameState,
    getAllMatches: async () => matches,
    getMatch: async (_saveGameId: number, _userId: number, id: number) =>
      matches.find((match) => match.id === id),
    completeMatchOnce: async (
      _saveGameId: number,
      _userId: number,
      id: number,
      result: Pick<Match, "homeScore" | "awayScore" | "events" | "homeStats" | "awayStats" | "playerRatings">
    ) => {
      const match = matches.find((candidate) => candidate.id === id);
      if (!match || match.played) return undefined;
      Object.assign(match, result, { played: true, preparationStatus: "completed" });
      completedWrites++;
      return match;
    },
  } as unknown as IStorage;

  return { matches, storage, getCompletedWrites: () => completedWrites };
}

describe("AI matchweek simulation", () => {
  afterEach(() => vi.restoreAllMocks());

  it("simulates the full AI round once across retries and preserves the user's completed fixture", async () => {
    const fixture = createFixture();
    const simulateMatch = vi.spyOn(MatchEngine.prototype, "simulateMatch").mockImplementation(
      async (saveGameId, userId, matchId) => {
        const match = await fixture.storage.getMatch(saveGameId, userId, matchId);
        const result = await fixture.storage.completeMatchOnce(saveGameId, userId, matchId, {
          homeScore: 1,
          awayScore: 0,
          events: [],
          homeStats: {} as Match["homeStats"],
          awayStats: {} as Match["awayStats"],
          playerRatings: {},
        });
        return (result ?? match) as Match;
      }
    );
    const simulator = new MatchSimulator(fixture.storage);

    const firstAttempt = await simulator.simulateAllMatchesOnDate(
      SAVE_GAME_ID,
      USER_ID,
      MATCH_DATE.toISOString(),
      USER_TEAM_ID
    );
    const retry = await simulator.simulateAllMatchesOnDate(
      SAVE_GAME_ID,
      USER_ID,
      MATCH_DATE.toISOString(),
      USER_TEAM_ID
    );

    expect(firstAttempt.matchesSimulated).toBe(4);
    expect(firstAttempt.results.map(({ matchId }) => matchId).sort()).toEqual([2, 3, 4, 5]);
    expect(retry).toEqual({ matchesSimulated: 0, results: [] });
    expect(fixture.getCompletedWrites()).toBe(4);
    expect(simulateMatch).toHaveBeenCalledTimes(4);
    expect(fixture.matches[0]).toMatchObject({
      id: 1,
      played: true,
      homeScore: 3,
      awayScore: 2,
    });
  });

  it("does not simulate a player-team fixture through the single-match resolver", async () => {
    const fixture = createFixture();
    fixture.matches[1].homeTeamId = USER_TEAM_ID;
    const simulateMatch = vi.spyOn(MatchEngine.prototype, "simulateMatch");

    const result = await new MatchSimulator(fixture.storage).simulateMatchInBackground(
      SAVE_GAME_ID,
      USER_ID,
      fixture.matches[1].id
    );

    expect(result).toBeNull();
    expect(simulateMatch).not.toHaveBeenCalled();
  });
});
