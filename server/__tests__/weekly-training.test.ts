import { afterEach, describe, expect, it, vi } from "vitest";
import type { IStorage } from "../storage";
import { GameEngine } from "../gameEngine";
import type { GameState, InboxMessage, Match, Player } from "@shared/schema";

const SAVE_GAME_ID = 7;
const USER_ID = 11;
const TEAM_ID = 3;

function createPlayer(): Player {
  return {
    id: 41,
    name: "Alex Silva",
    age: 20,
    position: "Winger",
    nationality: "Brazilian",
    attributes: {
      pace: 100,
      shooting: 100,
      passing: 100,
      dribbling: 100,
      tackling: 100,
      stamina: 100,
      ballControl: 100,
      strength: 100,
      agility: 100,
      positioning: 100,
      marking: 100,
      interceptions: 100,
      vision: 100,
      decisionMaking: 100,
      composure: 100,
      workRate: 100,
    },
    potential: 180,
    currentAbility: 100,
    form: 50,
    morale: 50,
    fitness: 100,
    condition: 100,
    injured: false,
    injuryDaysRemaining: 0,
    suspended: false,
    suspensionMatchesRemaining: 0,
    yellowCards: 0,
    redCards: 0,
    contract: { salary: 0, length: 1, releaseClause: 0 },
    value: 0,
    teamId: TEAM_ID,
    trainingFocus: { primary: "technical", secondary: "mental", intensity: "medium" },
    traits: [],
    seasonStats: {
      season: 2024,
      appearances: 0,
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
      cleanSheets: 0,
      totalMinutesPlayed: 0,
      averageRating: 0,
      shotsTotal: 0,
      shotsOnTarget: 0,
      passesTotal: 0,
      tacklesTotal: 0,
      interceptionsTotal: 0,
    },
    competitionStats: [],
    careerStats: {
      totalAppearances: 0,
      totalGoals: 0,
      totalAssists: 0,
      totalYellowCards: 0,
      totalRedCards: 0,
      totalCleanSheets: 0,
    },
  };
}

function createMatch(): Match {
  return {
    id: 9,
    competitionId: 2,
    competitionType: "league",
    homeTeamId: TEAM_ID,
    awayTeamId: 4,
    homeScore: 0,
    awayScore: 0,
    date: new Date(2024, 7, 5),
    played: false,
    preparationStatus: "pending",
    events: [],
    homeStats: {} as Match["homeStats"],
    awayStats: {} as Match["awayStats"],
    playerRatings: {},
  };
}

function createTrainingStorage(currentDate = new Date(2024, 7, 4)) {
  let gameState: GameState = {
    currentDate,
    season: 2024,
    currentMonth: currentDate.getMonth() + 1,
    playerTeamId: TEAM_ID,
    competitions: [],
    nextMatchId: null,
    monthlyTrainingInProgress: true,
    lastTrainingReportMonth: 7,
    lastTrainingWeek: null,
  };
  const players = new Map([[41, createPlayer()]]);
  const matches = [createMatch()];
  const inbox: InboxMessage[] = [];

  const storage = {
    getGameState: async () => gameState,
    updateGameState: async (_saveGameId: number, _userId: number, update: Partial<GameState>) => {
      gameState = { ...gameState, ...update };
      return gameState;
    },
    applyWeeklyTraining: async (
      _saveGameId: number,
      _userId: number,
      _teamId: number,
      week: string,
      updates: Array<{ playerId: number; changes: Partial<Player> }>
    ) => {
      if (gameState.lastTrainingWeek === week) return false;
      gameState = { ...gameState, lastTrainingWeek: week };
      for (const { playerId, changes } of updates) {
        const player = players.get(playerId);
        if (player) players.set(playerId, { ...player, ...changes });
      }
      return true;
    },
    getPlayersByTeam: async () => [...players.values()],
    updatePlayer: async (_saveGameId: number, _userId: number, id: number, update: Partial<Player>) => {
      const player = players.get(id);
      if (!player) return undefined;
      const updated = { ...player, ...update };
      players.set(id, updated);
      return updated;
    },
    getAllMatches: async () => matches,
    getMatchesByDate: async (_saveGameId: number, _userId: number, date: Date) =>
      matches.filter(match => match.date.toDateString() === date.toDateString()),
    getMatch: async (_saveGameId: number, _userId: number, id: number) =>
      matches.find(match => match.id === id),
    createInboxMessage: async (_saveGameId: number, _userId: number, message: Omit<InboxMessage, "id" | "userId" | "saveGameId">) => {
      const saved = { ...message, id: inbox.length + 1, userId: USER_ID, saveGameId: SAVE_GAME_ID };
      inbox.push(saved);
      return saved;
    },
  } as unknown as IStorage;

  return {
    storage,
    getPlayer: () => players.get(41)!,
    getInbox: () => inbox,
  };
}

describe("standing weekly training", () => {
  afterEach(() => vi.restoreAllMocks());

  it("applies the saved training plan before that week's match preparation", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const fixture = createTrainingStorage();
    const engine = new GameEngine(fixture.storage);

    await fixture.storage.updatePlayer(SAVE_GAME_ID, USER_ID, 41, {
      trainingFocus: { primary: "physical", secondary: "technical", intensity: "high" },
    });
    const result = await engine.advanceOneDay(SAVE_GAME_ID, USER_ID);
    const player = fixture.getPlayer();

    expect(player.attributes.pace).toBeGreaterThan(100);
    expect(player.attributes.stamina).toBeGreaterThan(100);
    expect(player.attributes.workRate).toBe(100);
    expect(player.currentAbility).toBeGreaterThan(100);
    expect(player.trainingFocus).toEqual({ primary: "physical", secondary: "technical", intensity: "high" });
    expect(result.matchesToday).toHaveLength(1);
    expect(await engine.shouldShowMatchPopup(SAVE_GAME_ID, USER_ID, 9)).toBe(true);
  });

  it("does not reapply a claimed week after reloading or repeated progression", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const fixture = createTrainingStorage(new Date(2024, 7, 11));
    const firstEngine = new GameEngine(fixture.storage);
    await fixture.storage.updatePlayer(SAVE_GAME_ID, USER_ID, 41, {
      trainingFocus: { primary: "physical", secondary: "technical", intensity: "high" },
    });

    await firstEngine.advanceOneDay(SAVE_GAME_ID, USER_ID);
    const firstWeekPace = fixture.getPlayer().attributes.pace;
    expect(fixture.getInbox()).toHaveLength(0);

    const reloadedEngine = new GameEngine(fixture.storage);
    await reloadedEngine.advanceDays(SAVE_GAME_ID, USER_ID, 6);
    expect(fixture.getPlayer().attributes.pace).toBe(firstWeekPace);

    await new GameEngine(fixture.storage).advanceOneDay(SAVE_GAME_ID, USER_ID);
    expect(fixture.getPlayer().attributes.pace).toBeGreaterThan(firstWeekPace);
    expect(fixture.getInbox()).toHaveLength(0);
  });

  it("applies a week only once when progression requests overlap", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const fixture = createTrainingStorage();
    await fixture.storage.updatePlayer(SAVE_GAME_ID, USER_ID, 41, {
      trainingFocus: { primary: "physical", secondary: "technical", intensity: "high" },
    });
    const engines = [new GameEngine(fixture.storage), new GameEngine(fixture.storage)];

    await Promise.all(engines.map(engine => engine.advanceOneDay(SAVE_GAME_ID, USER_ID)));

    expect(fixture.getPlayer().attributes.pace).toBe(102);
  });

  it("retains visible development with a low-intensity plan", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const fixture = createTrainingStorage();
    await fixture.storage.updatePlayer(SAVE_GAME_ID, USER_ID, 41, {
      trainingFocus: { primary: "physical", secondary: "technical", intensity: "low" },
    });

    await new GameEngine(fixture.storage).advanceOneDay(SAVE_GAME_ID, USER_ID);

    expect(fixture.getPlayer().attributes.pace).toBeGreaterThan(100);
  });

  it("sends occasional reports with notable player development", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const fixture = createTrainingStorage(new Date(2024, 8, 29));
    await fixture.storage.updatePlayer(SAVE_GAME_ID, USER_ID, 41, {
      trainingFocus: { primary: "physical", secondary: "technical", intensity: "high" },
    });

    await new GameEngine(fixture.storage).advanceOneDay(SAVE_GAME_ID, USER_ID);

    expect(fixture.getInbox()).toHaveLength(1);
    expect(fixture.getInbox()[0].subject).toContain("Training Report");
    expect(fixture.getInbox()[0].body).toContain("Alex Silva");
    expect(fixture.getInbox()[0].body).toContain("Pace");
  });
});
