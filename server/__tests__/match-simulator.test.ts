import { afterEach, describe, expect, it, vi } from "vitest";
import type { Match } from "@shared/schema";
import { MatchEngine } from "../matchEngine";
import { MatchSimulator } from "../matchSimulator";
import type { IStorage } from "../storage";

const SAVE_GAME_ID = 17;
const USER_ID = 23;
const PLAYER_TEAM_ID = 1;
const COMPETITION_ID = 5;
const MATCHDAY = new Date("2024-08-08T12:00:00.000Z");

afterEach(() => {
  vi.restoreAllMocks();
});

function createMatch(
  id: number,
  homeTeamId: number,
  awayTeamId: number,
  options: { date?: Date; competitionId?: number; result?: [number, number] } = {},
): Match {
  return {
    id,
    competitionId: options.competitionId ?? COMPETITION_ID,
    competitionType: "league",
    homeTeamId,
    awayTeamId,
    homeScore: options.result?.[0] ?? 0,
    awayScore: options.result?.[1] ?? 0,
    date: options.date ?? MATCHDAY,
    played: options.result !== undefined,
    events: [],
    homeStats: {} as Match["homeStats"],
    awayStats: {} as Match["awayStats"],
    playerRatings: {},
  };
}

describe("AI match simulation", () => {
  it("persists each unplayed AI fixture once without touching the player's result or other rounds", async () => {
    const userMatch = createMatch(1, PLAYER_TEAM_ID, 2, { result: [2, 1] });
    const fixtures = [
      userMatch,
      createMatch(2, 3, 4),
      createMatch(3, 5, 6),
      createMatch(4, 7, 8, { result: [4, 0] }),
      createMatch(5, 9, 10, { date: new Date("2024-08-15T12:00:00.000Z") }),
      createMatch(6, 11, 12, { competitionId: 99 }),
    ];
    const storage = {
      getAllMatches: vi.fn(async () => fixtures),
      getMatch: vi.fn(async (_saveGameId: number, _userId: number, matchId: number) =>
        fixtures.find(match => match.id === matchId)),
    } as unknown as IStorage;
    const simulationCalls: number[] = [];
    vi.spyOn(MatchEngine.prototype, "simulateMatch").mockImplementation(async (_saveGameId, _userId, matchId) => {
      const match = fixtures.find(fixture => fixture.id === matchId);
      if (!match) throw new Error("Match not found");
      simulationCalls.push(match.id);
      match.played = true;
      match.homeScore = 1;
      match.awayScore = 0;
      return match;
    });
    const simulator = new MatchSimulator(storage);

    const first = await simulator.simulateAllMatchesOnDate(
      SAVE_GAME_ID,
      USER_ID,
      MATCHDAY.toISOString(),
      PLAYER_TEAM_ID,
      COMPETITION_ID,
    );
    const retry = await simulator.simulateAllMatchesOnDate(
      SAVE_GAME_ID,
      USER_ID,
      MATCHDAY.toISOString(),
      PLAYER_TEAM_ID,
      COMPETITION_ID,
    );

    expect(first.matchesSimulated).toBe(2);
    expect(first.results.map(result => result.matchId)).toEqual([2, 3]);
    expect(retry).toEqual({ matchesSimulated: 0, results: [] });
    expect(simulationCalls).toEqual([2, 3]);
    expect(userMatch).toMatchObject({ played: true, homeScore: 2, awayScore: 1 });
    expect(fixtures.find(match => match.id === 4)).toMatchObject({ played: true, homeScore: 4, awayScore: 0 });
    expect(fixtures.find(match => match.id === 5)?.played).toBe(false);
    expect(fixtures.find(match => match.id === 6)?.played).toBe(false);
  });

  it("propagates failed fixture simulations so matchweek progression cannot succeed partially", async () => {
    const fixtures = [createMatch(2, 3, 4)];
    const storage = {
      getAllMatches: vi.fn(async () => fixtures),
      getMatch: vi.fn(async () => fixtures[0]),
    } as unknown as IStorage;
    vi.spyOn(MatchEngine.prototype, "simulateMatch")
      .mockRejectedValue(new Error("Simulation failed"));
    const simulator = new MatchSimulator(storage);

    await expect(simulator.simulateAllMatchesOnDate(
      SAVE_GAME_ID,
      USER_ID,
      MATCHDAY.toISOString(),
      PLAYER_TEAM_ID,
      COMPETITION_ID,
    )).rejects.toThrow("Simulation failed");
  });
});
