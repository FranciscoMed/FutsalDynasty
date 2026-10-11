import { afterEach, describe, expect, it, vi } from "vitest";
import type { Competition, GameState, LeagueStanding, Match } from "@shared/schema";
import { CompetitionEngine } from "../competitionEngine";
import { MatchSimulator } from "../matchSimulator";
import type { IStorage } from "../storage";

const SAVE_GAME_ID = 17;
const USER_ID = 23;
const PLAYER_TEAM_ID = 1;
const COMPETITION_ID = 5;
const PREVIOUS_MATCHDAY = new Date("2024-08-01T12:00:00.000Z");
const CURRENT_MATCHDAY = new Date("2024-08-08T12:00:00.000Z");

afterEach(() => {
  vi.restoreAllMocks();
});

function createMatch(
  id: number,
  homeTeamId: number,
  awayTeamId: number,
  date: Date,
  result?: { homeScore: number; awayScore: number },
): Match {
  return {
    id,
    competitionId: COMPETITION_ID,
    competitionType: "league",
    homeTeamId,
    awayTeamId,
    homeScore: result?.homeScore ?? 0,
    awayScore: result?.awayScore ?? 0,
    date,
    played: result !== undefined,
    events: [],
    homeStats: {} as Match["homeStats"],
    awayStats: {} as Match["awayStats"],
    playerRatings: {},
  };
}

function createStanding(teamId: number): LeagueStanding {
  return {
    teamId,
    teamName: `Team ${teamId}`,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
    form: [],
  };
}

function createFixture() {
  const userMatch = createMatch(1, 1, 2, CURRENT_MATCHDAY, { homeScore: 2, awayScore: 1 });
  const fixtures = [
    createMatch(2, 1, 5, PREVIOUS_MATCHDAY, { homeScore: 2, awayScore: 0 }),
    userMatch,
    createMatch(3, 3, 4, CURRENT_MATCHDAY),
    createMatch(4, 5, 6, CURRENT_MATCHDAY, { homeScore: 1, awayScore: 1 }),
    createMatch(5, 7, 8, CURRENT_MATCHDAY),
  ];
  const competition: Competition = {
    id: COMPETITION_ID,
    name: "Premier Division",
    type: "league",
    season: 2024,
    teams: [1, 2, 3, 4, 5, 6, 7, 8],
    fixtures,
    standings: [1, 2, 3, 4, 5, 6, 7, 8].map(createStanding),
    currentMatchday: 0,
    totalMatchdays: 22,
  };

  return { fixtures, competition, userMatch };
}

function createStorage(fixtures: Match[], competition: Competition, userMatch: Match) {
  let currentCompetition = competition;
  const storage = {
    getMatch: vi.fn(async () => userMatch),
    getGameState: vi.fn(async () => ({ playerTeamId: PLAYER_TEAM_ID }) as GameState),
    getCompetition: vi.fn(async () => currentCompetition),
    getMatchesByCompetition: vi.fn(async () => fixtures),
    updateCompetition: vi.fn(async (_saveGameId: number, _userId: number, _id: number, update: Partial<Competition>) => {
      currentCompetition = { ...currentCompetition, ...update };
      return currentCompetition;
    }),
  };

  return { storage: storage as unknown as IStorage, getCompetition: () => currentCompetition };
}

describe("league matchweek completion", () => {
  it("resolves every remaining AI fixture and rebuilds standings from persisted results", async () => {
    const { fixtures, competition, userMatch } = createFixture();
    const { storage, getCompetition } = createStorage(fixtures, competition, userMatch);
    const simulatedFixtureIds: number[] = [];
    vi.spyOn(MatchSimulator.prototype, "simulateAllMatchesOnDate").mockImplementation(async () => {
      for (const fixture of fixtures) {
        if (fixture.date.toISOString().slice(0, 10) !== "2024-08-08" || fixture.played || fixture.homeTeamId === PLAYER_TEAM_ID || fixture.awayTeamId === PLAYER_TEAM_ID) {
          continue;
        }
        simulatedFixtureIds.push(fixture.id);
        fixture.played = true;
        fixture.homeScore = fixture.id === 3 ? 0 : 5;
        fixture.awayScore = fixture.id === 3 ? 3 : 0;
      }
      return { matchesSimulated: simulatedFixtureIds.length, results: [] };
    });

    const engine = new CompetitionEngine(storage);
    const completed = await engine.completeMatchweek(SAVE_GAME_ID, USER_ID, userMatch.id);
    const userResult = { played: userMatch.played, homeScore: userMatch.homeScore, awayScore: userMatch.awayScore };

    expect(simulatedFixtureIds).toEqual([3, 5]);
    expect(completed.currentMatchday).toBe(2);
    expect(completed.standings.find(team => team.teamId === 1)).toMatchObject({
      played: 2,
      won: 2,
      points: 6,
      goalsFor: 4,
      goalsAgainst: 1,
      goalDifference: 3,
    });
    expect(completed.standings.find(team => team.teamId === 5)).toMatchObject({
      played: 2,
      drawn: 1,
      lost: 1,
      points: 1,
    });

    const retry = await engine.completeMatchweek(SAVE_GAME_ID, USER_ID, userMatch.id);

    expect(simulatedFixtureIds).toEqual([3, 5]);
    expect(userMatch).toMatchObject(userResult);
    expect(retry.standings).toEqual(getCompetition().standings);
    expect(retry.currentMatchday).toBe(2);
    expect(storage.updateCompetition).toHaveBeenCalledTimes(2);
  });

  it("does not resolve AI fixtures until the player's result is persisted", async () => {
    const { fixtures, competition, userMatch } = createFixture();
    userMatch.played = false;
    const { storage } = createStorage(fixtures, competition, userMatch);
    const simulate = vi.spyOn(MatchSimulator.prototype, "simulateAllMatchesOnDate");
    const engine = new CompetitionEngine(storage);

    await expect(engine.completeMatchweek(SAVE_GAME_ID, USER_ID, userMatch.id))
      .rejects.toThrow(/player's match must be completed/i);

    expect(simulate).not.toHaveBeenCalled();
    expect(storage.updateCompetition).not.toHaveBeenCalled();
  });

  it("does not publish standings when any AI fixture fails to resolve", async () => {
    const { fixtures, competition, userMatch } = createFixture();
    const { storage } = createStorage(fixtures, competition, userMatch);
    vi.spyOn(MatchSimulator.prototype, "simulateAllMatchesOnDate")
      .mockRejectedValue(new Error("AI simulation failed"));
    const engine = new CompetitionEngine(storage);

    await expect(engine.completeMatchweek(SAVE_GAME_ID, USER_ID, userMatch.id))
      .rejects.toThrow("AI simulation failed");

    expect(storage.updateCompetition).not.toHaveBeenCalled();
  });
});
