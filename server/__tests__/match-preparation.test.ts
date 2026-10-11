import { describe, expect, it, vi } from "vitest";
import type { Match, MatchPreparation } from "@shared/schema";
import { getPreparedStartingPlayerIds, orderPlayersForMatchPreparation, validateMatchPreparation } from "@shared/matchPreparation";
import { getPlayerFixturePreparationError, saveMatchPreparationOnce } from "../matchPreparationService";
import { MatchEngine } from "../matchEngine";
import type { IStorage } from "../storage";

const squad = [
  { id: 1, position: "Goalkeeper", injured: false, injuryDaysRemaining: 0, suspended: false, suspensionMatchesRemaining: 0 },
  { id: 2, position: "Defender", injured: false, injuryDaysRemaining: 0, suspended: false, suspensionMatchesRemaining: 0 },
  { id: 3, position: "Winger", injured: false, injuryDaysRemaining: 0, suspended: false, suspensionMatchesRemaining: 0 },
  { id: 4, position: "Winger", injured: false, injuryDaysRemaining: 0, suspended: false, suspensionMatchesRemaining: 0 },
  { id: 5, position: "Pivot", injured: false, injuryDaysRemaining: 0, suspended: false, suspensionMatchesRemaining: 0 },
  { id: 6, position: "Defender", injured: false, injuryDaysRemaining: 0, suspended: false, suspensionMatchesRemaining: 0 },
] as const;

const validPreparation = {
  formation: "3-1",
  assignments: {
    gk: 1,
    fixo: 2,
    "ala-left": 3,
    "ala-right": 4,
    pivot: 5,
  },
  substitutes: [6, null, null, null, null],
  instructions: {
    mentality: "Balanced",
    pressingIntensity: "Medium",
    flyGoalkeeper: "Never",
  },
};

const pendingMatch = (): Match => ({
  id: 21,
  competitionId: 3,
  competitionType: "league",
  homeTeamId: 11,
  awayTeamId: 12,
  homeScore: 0,
  awayScore: 0,
  date: new Date("2024-08-03T12:00:00.000Z"),
  played: false,
  preparationStatus: "pending",
  events: [],
  homeStats: {} as Match["homeStats"],
  awayStats: {} as Match["awayStats"],
  playerRatings: {},
});

describe("match preparation", () => {
  it("validates a complete eligible lineup, substitutes, formation, and instructions", () => {
    const result = validateMatchPreparation(validPreparation, squad);

    expect(result.preparation).toEqual(validPreparation);
    expect(getPreparedStartingPlayerIds(result.preparation!)).toEqual([1, 2, 3, 4, 5]);
  });

  it("orders the saved starters and substitutes before the remaining eligible squad", () => {
    const preparation = validateMatchPreparation(validPreparation, squad).preparation!;
    const unavailablePlayer = { ...squad[5], id: 7, suspended: true, suspensionMatchesRemaining: 1 };

    expect(orderPlayersForMatchPreparation([...squad, unavailablePlayer], preparation)
      .map(player => player.id)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("rejects unavailable, repeated, and wrongly positioned players", () => {
    const injuredSquad = squad.map(player => player.id === 2 ? { ...player, injured: true } : player);
    const injuredResult = validateMatchPreparation(validPreparation, injuredSquad);
    const repeatedResult = validateMatchPreparation({
      ...validPreparation,
      assignments: { ...validPreparation.assignments, pivot: 4 },
    }, squad);
    const wrongKeeperResult = validateMatchPreparation({
      ...validPreparation,
      assignments: { ...validPreparation.assignments, gk: 6 },
      substitutes: [null, null, null, null, null],
    }, squad);

    expect(injuredResult.error).toMatch(/eligible players/i);
    expect(repeatedResult.error).toMatch(/more than one position/i);
    expect(wrongKeeperResult.error).toMatch(/goalkeeper/i);
  });

  it("prevents starting a player fixture until its saved preparation is confirmed", () => {
    expect(getPlayerFixturePreparationError(pendingMatch(), 11)).toMatch(/preparation is required/i);
    const prepared = {
      ...pendingMatch(),
      preparationStatus: "confirmed" as const,
      preparation: validPreparation as MatchPreparation,
    };
    expect(getPlayerFixturePreparationError(prepared, 11)).toBeNull();
    expect(getPlayerFixturePreparationError(pendingMatch(), 99)).toBeNull();
  });

  it("rejects real-time initialization of a player fixture without preparation", async () => {
    const storage = {
      getMatch: vi.fn(async () => pendingMatch()),
      getGameState: vi.fn(async () => ({ playerTeamId: 11 })),
    } as unknown as IStorage;
    const engine = new MatchEngine(storage);

    await expect(engine.initializeRealTimeMatch(1, 2, 21))
      .rejects.toThrow(/preparation is required/i);
  });

  it("persists one preparation per fixture and returns the saved snapshot on retries", async () => {
    let match = pendingMatch();
    const storage = {
      getMatch: vi.fn(async () => match),
      getPlayersByTeam: vi.fn(async () => [...squad]),
      saveMatchPreparation: vi.fn(async (_saveGameId, _userId, _matchId, preparation: MatchPreparation) => {
        if (match.preparation) return undefined;
        match = { ...match, preparation, preparationStatus: "confirmed" };
        return match;
      }),
    };

    const first = await saveMatchPreparationOnce(storage, 1, 2, match.id, match.homeTeamId, validPreparation);
    const retry = await saveMatchPreparationOnce(storage, 1, 2, match.id, match.homeTeamId, {
      ...validPreparation,
      formation: "2-2",
    });

    expect(first.status).toBe("saved");
    expect(retry.status).toBe("already-prepared");
    if (retry.status === "already-prepared") {
      expect(retry.preparation).toEqual(validPreparation);
    }
    expect(storage.saveMatchPreparation).toHaveBeenCalledTimes(1);
  });

  it("does not persist invalid lineups or preparations for another team's fixture", async () => {
    const storage = {
      getMatch: vi.fn(async () => pendingMatch()),
      getPlayersByTeam: vi.fn(async () => [...squad]),
      saveMatchPreparation: vi.fn(),
    };

    const invalid = await saveMatchPreparationOnce(
      storage, 1, 2, 21, 11, { ...validPreparation, substitutes: [] }
    );
    const forbidden = await saveMatchPreparationOnce(storage, 1, 2, 21, 99, validPreparation);

    expect(invalid.status).toBe("invalid");
    expect(forbidden.status).toBe("forbidden");
    expect(storage.saveMatchPreparation).not.toHaveBeenCalled();
  });
});
