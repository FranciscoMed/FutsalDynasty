import { db } from "./db";
import {
  type Player,
  type Team,
  type Match,
  type Competition,
  type TransferOffer,
  type InboxMessage,
  type FinancialTransaction,
  type Club,
  type GameState,
  type PlayerAttributes,
  calculateOverallRating,
  players,
  teams,
  matches,
  competitions,
  transferOffers,
  inboxMessages,
  financialTransactions,
  clubs,
  gameStates,
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import type { IStorage } from "./storage";

export class DbStorage implements IStorage {
  async getPlayer(id: number): Promise<Player | undefined> {
    const result = await db.select().from(players).where(eq(players.id, id)).limit(1);
    return result[0] as Player | undefined;
  }

  async getAllPlayers(): Promise<Player[]> {
    const result = await db.select().from(players);
    return result as Player[];
  }

  async getPlayersByTeam(teamId: number): Promise<Player[]> {
    const result = await db.select().from(players).where(eq(players.teamId, teamId));
    return result as Player[];
  }

  async createPlayer(player: Omit<Player, "id">): Promise<Player> {
    const result = await db.insert(players).values(player).returning();
    return result[0] as Player;
  }

  async updatePlayer(id: number, player: Partial<Player>): Promise<Player | undefined> {
    const result = await db.update(players).set(player).where(eq(players.id, id)).returning();
    return result[0] as Player | undefined;
  }

  async getTeam(id: number): Promise<Team | undefined> {
    const result = await db.select().from(teams).where(eq(teams.id, id)).limit(1);
    return result[0] as Team | undefined;
  }

  async getAllTeams(): Promise<Team[]> {
    const result = await db.select().from(teams);
    return result as Team[];
  }

  async createTeam(team: Omit<Team, "id">): Promise<Team> {
    const result = await db.insert(teams).values(team).returning();
    return result[0] as Team;
  }

  async updateTeam(id: number, team: Partial<Team>): Promise<Team | undefined> {
    const result = await db.update(teams).set(team).where(eq(teams.id, id)).returning();
    return result[0] as Team | undefined;
  }

  async getMatch(id: number): Promise<Match | undefined> {
    const result = await db.select().from(matches).where(eq(matches.id, id)).limit(1);
    return result[0] as Match | undefined;
  }

  async getAllMatches(): Promise<Match[]> {
    const result = await db.select().from(matches);
    return result as Match[];
  }

  async getMatchesByCompetition(competitionId: number): Promise<Match[]> {
    const result = await db.select().from(matches).where(eq(matches.competitionId, competitionId));
    return result as Match[];
  }

  async createMatch(match: Omit<Match, "id">): Promise<Match> {
    const result = await db.insert(matches).values(match).returning();
    return result[0] as Match;
  }

  async updateMatch(id: number, match: Partial<Match>): Promise<Match | undefined> {
    const result = await db.update(matches).set(match).where(eq(matches.id, id)).returning();
    return result[0] as Match | undefined;
  }

  async getCompetition(id: number): Promise<Competition | undefined> {
    const result = await db.select().from(competitions).where(eq(competitions.id, id)).limit(1);
    if (!result[0]) return undefined;
    
    const comp = result[0];
    const compMatches = await this.getMatchesByCompetition(id);
    
    return {
      id: comp.id,
      name: comp.name,
      type: comp.type,
      season: comp.season,
      teams: comp.teams,
      fixtures: compMatches,
      standings: comp.standings,
      currentMatchday: comp.currentMatchday,
      totalMatchdays: comp.totalMatchdays,
    } as Competition;
  }

  async getAllCompetitions(): Promise<Competition[]> {
    const result = await db.select().from(competitions);
    const comps: Competition[] = [];
    
    for (const comp of result) {
      const compMatches = await this.getMatchesByCompetition(comp.id);
      comps.push({
        id: comp.id,
        name: comp.name,
        type: comp.type,
        season: comp.season,
        teams: comp.teams,
        fixtures: compMatches,
        standings: comp.standings,
        currentMatchday: comp.currentMatchday,
        totalMatchdays: comp.totalMatchdays,
      } as Competition);
    }
    
    return comps;
  }

  async createCompetition(competition: Omit<Competition, "id">): Promise<Competition> {
    const { fixtures, ...compData } = competition;
    const result = await db.insert(competitions).values(compData).returning();
    const created = result[0];
    
    for (const match of fixtures) {
      await this.createMatch({ ...match, competitionId: created.id });
    }
    
    return await this.getCompetition(created.id) as Competition;
  }

  async updateCompetition(id: number, competition: Partial<Competition>): Promise<Competition | undefined> {
    const { fixtures, ...compData } = competition;
    await db.update(competitions).set(compData).where(eq(competitions.id, id));
    return await this.getCompetition(id);
  }

  async getTransferOffer(id: number): Promise<TransferOffer | undefined> {
    const result = await db.select().from(transferOffers).where(eq(transferOffers.id, id)).limit(1);
    return result[0] as TransferOffer | undefined;
  }

  async getAllTransferOffers(): Promise<TransferOffer[]> {
    const result = await db.select().from(transferOffers);
    return result as TransferOffer[];
  }

  async getTransferOffersByTeam(teamId: number): Promise<TransferOffer[]> {
    const result = await db.select().from(transferOffers);
    return (result as TransferOffer[]).filter(
      o => o.toTeamId === teamId || o.fromTeamId === teamId
    );
  }

  async createTransferOffer(offer: Omit<TransferOffer, "id">): Promise<TransferOffer> {
    const result = await db.insert(transferOffers).values(offer).returning();
    return result[0] as TransferOffer;
  }

  async updateTransferOffer(id: number, offer: Partial<TransferOffer>): Promise<TransferOffer | undefined> {
    const result = await db.update(transferOffers).set(offer).where(eq(transferOffers.id, id)).returning();
    return result[0] as TransferOffer | undefined;
  }

  async getInboxMessage(id: number): Promise<InboxMessage | undefined> {
    const result = await db.select().from(inboxMessages).where(eq(inboxMessages.id, id)).limit(1);
    return result[0] as InboxMessage | undefined;
  }

  async getAllInboxMessages(): Promise<InboxMessage[]> {
    const result = await db.select().from(inboxMessages).orderBy(desc(inboxMessages.date));
    return result as InboxMessage[];
  }

  async createInboxMessage(message: Omit<InboxMessage, "id">): Promise<InboxMessage> {
    const result = await db.insert(inboxMessages).values(message).returning();
    return result[0] as InboxMessage;
  }

  async updateInboxMessage(id: number, message: Partial<InboxMessage>): Promise<InboxMessage | undefined> {
    const result = await db.update(inboxMessages).set(message).where(eq(inboxMessages.id, id)).returning();
    return result[0] as InboxMessage | undefined;
  }

  async deleteInboxMessage(id: number): Promise<boolean> {
    await db.delete(inboxMessages).where(eq(inboxMessages.id, id));
    return true;
  }

  async getFinancialTransaction(id: number): Promise<FinancialTransaction | undefined> {
    const result = await db.select().from(financialTransactions).where(eq(financialTransactions.id, id)).limit(1);
    return result[0] as FinancialTransaction | undefined;
  }

  async getAllFinancialTransactions(): Promise<FinancialTransaction[]> {
    const result = await db.select().from(financialTransactions).orderBy(desc(financialTransactions.date));
    return result as FinancialTransaction[];
  }

  async createFinancialTransaction(transaction: Omit<FinancialTransaction, "id">): Promise<FinancialTransaction> {
    const result = await db.insert(financialTransactions).values(transaction).returning();
    return result[0] as FinancialTransaction;
  }

  async getClub(): Promise<Club | undefined> {
    const result = await db.select().from(clubs).limit(1);
    return result[0] as Club | undefined;
  }

  async updateClub(club: Partial<Club>): Promise<Club | undefined> {
    const existing = await this.getClub();
    if (!existing) return undefined;
    const result = await db.update(clubs).set(club).where(eq(clubs.id, existing.id)).returning();
    return result[0] as Club | undefined;
  }

  async getGameState(): Promise<GameState> {
    const result = await db.select().from(gameStates).limit(1);
    if (!result[0]) {
      throw new Error("Game state not found");
    }
    
    const state = result[0];
    const comps = await this.getAllCompetitions();
    
    return {
      currentDate: state.currentDate,
      season: state.season,
      currentMonth: state.currentMonth,
      playerTeamId: state.playerTeamId,
      competitions: comps,
      nextMatchId: state.nextMatchId,
      monthlyTrainingInProgress: state.monthlyTrainingInProgress,
      lastTrainingReportMonth: state.lastTrainingReportMonth,
    };
  }

  async updateGameState(state: Partial<GameState>): Promise<GameState> {
    const existing = await db.select().from(gameStates).limit(1);
    if (!existing[0]) {
      throw new Error("Game state not found");
    }
    
    const { competitions, ...stateData } = state;
    await db.update(gameStates).set(stateData).where(eq(gameStates.id, existing[0].id));
    return await this.getGameState();
  }

  async initializeGame(): Promise<void> {
    const existingState = await db.select().from(gameStates).limit(1);
    if (existingState.length > 0) {
      console.log("Game already initialized");
      return;
    }

    const playerTeam = await this.createTeam({
      name: "FC United",
      abbreviation: "FCU",
      reputation: 50,
      budget: 500000,
      wageBudget: 50000,
      stadium: "Unity Stadium",
      formation: "2-2",
      tacticalPreset: "Balanced",
      startingLineup: [],
      substitutes: [],
      isPlayerTeam: true,
    });

    await db.insert(clubs).values({
      name: playerTeam.name,
      stadium: playerTeam.stadium,
      reputation: playerTeam.reputation,
      budget: playerTeam.budget,
      wageBudget: playerTeam.wageBudget,
      trainingFacilityLevel: 3,
      stadiumCapacity: 5000,
      youthAcademyLevel: 2,
      staff: {
        assistantCoach: true,
        fitnessCoach: false,
        scout: false,
      },
      boardObjectives: [
        {
          description: "Finish in top half of league",
          target: "Top 6",
          importance: "high" as const,
          completed: false,
        },
        {
          description: "Reach cup quarter-finals",
          target: "Quarter-Finals",
          importance: "medium" as const,
          completed: false,
        },
      ],
    });

    const playerNames = [
      "Martinez", "Silva", "Rodriguez", "Costa", "Fernandez",
      "Santos", "Oliveira", "Pereira", "Sousa", "Alves",
      "Ribeiro", "Carvalho", "Ferreira", "Gomes", "Lopes"
    ];

    for (let i = 0; i < 15; i++) {
      const position: "Goalkeeper" | "Defender" | "Winger" | "Pivot" = 
        i === 0 ? "Goalkeeper" :
        i === 1 ? "Goalkeeper" :
        i < 6 ? "Defender" :
        i < 10 ? "Winger" : "Pivot";

      const baseRating = 100 + Math.floor(Math.random() * 60);
      const potential = baseRating + Math.floor(Math.random() * 40) + 20;
      const age = 18 + Math.floor(Math.random() * 14);

      const attributes: PlayerAttributes = {
        shooting: baseRating + Math.floor(Math.random() * 30) - 15,
        passing: baseRating + Math.floor(Math.random() * 30) - 15,
        dribbling: baseRating + Math.floor(Math.random() * 30) - 15,
        ballControl: baseRating + Math.floor(Math.random() * 30) - 15,
        firstTouch: baseRating + Math.floor(Math.random() * 30) - 15,
        pace: baseRating + Math.floor(Math.random() * 30) - 15,
        stamina: baseRating + Math.floor(Math.random() * 30) - 15,
        strength: baseRating + Math.floor(Math.random() * 30) - 15,
        agility: baseRating + Math.floor(Math.random() * 30) - 15,
        tackling: baseRating + Math.floor(Math.random() * 30) - 15,
        positioning: baseRating + Math.floor(Math.random() * 30) - 15,
        marking: baseRating + Math.floor(Math.random() * 30) - 15,
        interceptions: baseRating + Math.floor(Math.random() * 30) - 15,
        vision: baseRating + Math.floor(Math.random() * 30) - 15,
        decisionMaking: baseRating + Math.floor(Math.random() * 30) - 15,
        composure: baseRating + Math.floor(Math.random() * 30) - 15,
        workRate: baseRating + Math.floor(Math.random() * 30) - 15,
      };

      if (position === "Goalkeeper") {
        attributes.reflexes = baseRating + Math.floor(Math.random() * 30) - 15;
        attributes.handling = baseRating + Math.floor(Math.random() * 30) - 15;
        attributes.gkPositioning = baseRating + Math.floor(Math.random() * 30) - 15;
        attributes.distribution = baseRating + Math.floor(Math.random() * 30) - 15;
      }

      const currentAbility = calculateOverallRating(attributes, position);

      await this.createPlayer({
        name: playerNames[i],
        age,
        position,
        nationality: "Brazil",
        attributes,
        potential,
        currentAbility,
        form: 5 + Math.floor(Math.random() * 3),
        morale: 7 + Math.floor(Math.random() * 2),
        fitness: 90 + Math.floor(Math.random() * 10),
        condition: 85 + Math.floor(Math.random() * 15),
        injured: false,
        injuryDaysRemaining: 0,
        suspended: false,
        suspensionMatchesRemaining: 0,
        yellowCards: 0,
        redCards: 0,
        contract: {
          salary: 2000 + Math.floor(Math.random() * 3000),
          length: 2 + Math.floor(Math.random() * 3),
          releaseClause: 50000 + Math.floor(Math.random() * 150000),
        },
        value: 25000 + Math.floor(Math.random() * 100000),
        teamId: playerTeam.id,
        trainingFocus: {
          primary: "technical",
          secondary: "physical",
          intensity: "medium",
        },
      });
    }

    await this.createInboxMessage({
      category: "news",
      subject: "Welcome to FC United!",
      body: `Welcome to your new role as manager of FC United!\n\nThe board is excited to have you lead the team to success. Your objectives for this season are:\n\n- Finish in the top half of the league\n- Make a strong run in the cup competition\n\nYou have a talented young squad and a modest budget. Make the most of it!\n\nGood luck!`,
      from: "Board of Directors",
      date: new Date(2024, 7, 1),
      read: false,
      starred: false,
      priority: "high",
    });

    await db.insert(gameStates).values({
      currentDate: new Date(2024, 7, 1),
      season: 2024,
      currentMonth: 8,
      playerTeamId: playerTeam.id,
      nextMatchId: null,
      monthlyTrainingInProgress: true,
      lastTrainingReportMonth: 7,
    });
  }
}

export const storage = new DbStorage();
