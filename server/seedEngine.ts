import type { IStorage } from "./storage";
import { CompetitionEngine } from "./competitionEngine";

export interface SeedGameOptions {
  saveGameId: number;
  playerTeamName: string;
  playerTeamAbbr: string;
  season: number;
}

export class SeedEngine {
  private competitionEngine: CompetitionEngine;

  constructor(private storage: IStorage) {
    this.competitionEngine = new CompetitionEngine(storage);
  }

  async seedNewGame(options: SeedGameOptions): Promise<{ playerTeamId: number; competitionIds: number[] }> {
    const { saveGameId, playerTeamName, playerTeamAbbr, season } = options;

    console.log(`Seeding new game for saveGameId: ${saveGameId}`);

    const playerTeam = await this.storage.createTeam(saveGameId, {
      name: playerTeamName,
      abbreviation: playerTeamAbbr,
      reputation: 55,
      budget: 500000,
      wageBudget: 50000,
      stadium: `${playerTeamName} Stadium`,
      formation: "2-2",
      tacticalPreset: "Balanced",
      startingLineup: [],
      substitutes: [],
      isPlayerTeam: true,
    });

    await this.competitionEngine.generateAISquad(playerTeam.id, 55, saveGameId);

    console.log(`Creating competitions for saveGameId: ${saveGameId}`);

    const comp1 = await this.competitionEngine.createLeagueCompetition(season, playerTeam.id, saveGameId);
    const comp2 = await this.competitionEngine.createSecondDivisionLeague(season, saveGameId);
    const comp3 = await this.competitionEngine.createCupCompetition(season, saveGameId);

    const gameState = await this.storage.createGameState(saveGameId, {
      currentDate: new Date(season, 7, 1),
      season,
      currentMonth: 8,
      playerTeamId: playerTeam.id,
      nextMatchId: null,
      monthlyTrainingInProgress: true,
      lastTrainingReportMonth: 7,
    });

    const club = await this.storage.createClub(saveGameId, {
      name: playerTeamName,
      stadium: `${playerTeamName} Stadium`,
      reputation: 55,
      budget: 500000,
      wageBudget: 50000,
      trainingFacilityLevel: 1,
      stadiumCapacity: 5000,
      youthAcademyLevel: 1,
      staff: {
        assistantCoach: false,
        fitnessCoach: false,
        scout: false,
      },
      boardObjectives: [
        {
          description: "Finish in top 6 of the league",
          target: "Position 6 or higher",
          importance: "high" as const,
          completed: false,
        },
        {
          description: "Avoid relegation",
          target: "Stay in division",
          importance: "high" as const,
          completed: false,
        },
        {
          description: "Develop youth players",
          target: "Promote 2 youth players",
          importance: "medium" as const,
          completed: false,
        },
      ],
    });

    console.log(`Game seeded successfully for saveGameId: ${saveGameId}`);

    return {
      playerTeamId: playerTeam.id,
      competitionIds: [comp1.id, comp2.id, comp3.id],
    };
  }
}
